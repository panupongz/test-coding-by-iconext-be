import { createHash, randomUUID } from 'node:crypto';

import type { Knex } from 'knex';

import {
  ApplicationError,
  ERROR_CODES,
} from '../errors/application-error.js';
import {
  IDEMPOTENCY_OPERATION,
  IDEMPOTENCY_STATUS,
  IdempotencyRepository,
  type IdempotencyRecord,
} from '../../database/repositories/idempotency-repository.js';
import { SaleRepository } from '../../database/repositories/sale-repository.js';
import {
  SALE_STATUS,
  isSaleExpiredAt,
  toSaleResponse,
  type SaleResponse,
  type SaleView,
} from '../../domain/sale.js';
import { createRequestFingerprint } from '../request-fingerprint.js';

const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const SALE_QUANTITY = 1;
const SALE_EXPIRY_MILLISECONDS = 5 * 60 * 1000;
const WAIT_FOR_IDEMPOTENCY_LOCK_WITHOUT_TIMEOUT = -1;

interface MysqlError {
  readonly code?: unknown;
}

interface NamedLockRow {
  readonly acquired: number;
}

interface ConnectionPoolClient {
  acquireConnection(): Promise<unknown>;
  releaseConnection(connection: unknown): Promise<void>;
}

export interface CreateSaleCommand {
  readonly productCode: string;
  readonly idempotencyKey: string;
}

export interface CreateSaleResult {
  readonly created: boolean;
  readonly sale: SaleResponse;
}

export interface CreateSaleServiceOptions {
  readonly now?: () => Date;
  readonly generateSaleId?: () => string;
  readonly saleRepository?: SaleRepository;
  readonly idempotencyRepository?: IdempotencyRepository;
  readonly afterSaleInserted?: () => Promise<void>;
  readonly failAfterSaleInsert?: boolean;
  readonly failAfterIdempotencySuccess?: boolean;
}

const createFingerprint = (productCode: string): string =>
  createRequestFingerprint(IDEMPOTENCY_OPERATION.createSale, {
    product_code: productCode,
  });

const isDuplicateEntryError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as MysqlError).code === 'ER_DUP_ENTRY';

export class CreateSaleService {
  private readonly now: () => Date;
  private readonly generateSaleId: () => string;
  private readonly saleRepository: SaleRepository;
  private readonly idempotencyRepository: IdempotencyRepository;
  private readonly afterSaleInserted: () => Promise<void>;
  private readonly failAfterSaleInsert: boolean;
  private readonly failAfterIdempotencySuccess: boolean;

  public constructor(
    private readonly database: Knex,
    options: CreateSaleServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.generateSaleId = options.generateSaleId ?? randomUUID;
    this.saleRepository = options.saleRepository ?? new SaleRepository();
    this.idempotencyRepository =
      options.idempotencyRepository ?? new IdempotencyRepository();
    this.afterSaleInserted =
      options.afterSaleInserted ?? (() => Promise.resolve());
    this.failAfterSaleInsert = options.failAfterSaleInsert ?? false;
    this.failAfterIdempotencySuccess =
      options.failAfterIdempotencySuccess ?? false;
  }

  public async execute(command: CreateSaleCommand): Promise<CreateSaleResult> {
    const requestFingerprint = createFingerprint(command.productCode);
    const lockName = createHash('sha256')
      .update(`idempotency:${command.idempotencyKey}`)
      .digest('hex');
    const poolClient = this.database.client as unknown as ConnectionPoolClient;
    const connection = await poolClient.acquireConnection();

    try {
      const lockResult = (await this.database
        .raw('SELECT GET_LOCK(?, ?) AS acquired', [
          lockName,
          WAIT_FOR_IDEMPOTENCY_LOCK_WITHOUT_TIMEOUT,
        ])
        .connection(connection)) as unknown as [NamedLockRow[]];

      if (lockResult[0][0]?.acquired !== 1) {
        throw new Error('Could not acquire the idempotency key lock');
      }

      return await this.executeWhileLocked(
        command,
        requestFingerprint,
        connection,
      );
    } finally {
      try {
        await this.database
          .raw('SELECT RELEASE_LOCK(?)', [lockName])
          .connection(connection);
      } finally {
        await poolClient.releaseConnection(connection);
      }
    }
  }

  private async executeWhileLocked(
    command: CreateSaleCommand,
    requestFingerprint: string,
    connection: unknown,
  ): Promise<CreateSaleResult> {
    try {
      const sale = await this.database.transaction(async (transaction) => {
        await this.idempotencyRepository.insertProcessing(
          transaction,
          command.idempotencyKey,
          requestFingerprint,
        );
        const product = await this.saleRepository.findAvailableProduct(
          transaction,
          command.productCode,
        );

        if (product === undefined) {
          throw new ApplicationError(
            HTTP_NOT_FOUND,
            ERROR_CODES.productNotFound,
          );
        }

        const createdAt = this.now();
        const expiresAt = new Date(createdAt.getTime() + SALE_EXPIRY_MILLISECONDS);
        const saleId = this.generateSaleId();

        await this.saleRepository.insert(transaction, {
          saleId,
          productId: product.id,
          unitPrice: product.price,
          quantity: SALE_QUANTITY,
          status: SALE_STATUS.pending,
          createdAt,
          expiresAt,
        });
        await this.afterSaleInserted();

        if (this.failAfterSaleInsert) {
          throw new Error('Injected failure after sale insert');
        }

        await this.idempotencyRepository.markSucceeded(
          transaction,
          command.idempotencyKey,
          saleId,
        );

        if (this.failAfterIdempotencySuccess) {
          throw new Error('Injected failure after idempotency success');
        }

        return {
          saleId,
          productCode: product.productCode,
          name: product.name,
          unitPrice: product.price,
          quantity: SALE_QUANTITY,
          status: SALE_STATUS.pending,
          createdAt,
          expiresAt,
        } satisfies SaleView;
      }, { connection });

      return { created: true, sale: toSaleResponse(sale) };
    } catch (error: unknown) {
      if (isDuplicateEntryError(error)) {
        const existingRecord = await this.idempotencyRepository.find(
          this.database,
          command.idempotencyKey,
        );

        if (existingRecord !== undefined) {
          return this.resolveExisting(
            existingRecord,
            requestFingerprint,
            connection,
          );
        }
      }

      await this.rememberFailure(
        command.idempotencyKey,
        requestFingerprint,
        connection,
      );
      throw error;
    }
  }

  private async resolveExisting(
    record: IdempotencyRecord,
    requestFingerprint: string,
    connection: unknown,
  ): Promise<CreateSaleResult> {
    this.assertSameRequest(record, requestFingerprint);

    if (record.status === IDEMPOTENCY_STATUS.failed) {
      throw new ApplicationError(
        HTTP_CONFLICT,
        ERROR_CODES.idempotencyFailed,
      );
    }

    if (record.status !== IDEMPOTENCY_STATUS.succeeded || record.saleId === null) {
      throw new ApplicationError(
        HTTP_CONFLICT,
        ERROR_CODES.idempotencyConflict,
      );
    }
    const saleId = record.saleId;

    const sale = await this.database.transaction(async (transaction) => {
      const lockedSale = await this.saleRepository.findByIdForUpdate(
        transaction,
        saleId,
      );

      if (lockedSale === undefined) {
        throw new Error('Succeeded idempotency record references a missing sale');
      }

      if (
        lockedSale.status === SALE_STATUS.pending &&
        isSaleExpiredAt(lockedSale.expiresAt, this.now())
      ) {
        await this.saleRepository.markCancelled(transaction, lockedSale.saleId);
      }

      const currentSale = await this.saleRepository.findView(
        transaction,
        lockedSale.saleId,
      );

      if (currentSale === undefined) {
        throw new Error('Locked sale was not readable');
      }

      return currentSale;
    }, { connection });

    return { created: false, sale: toSaleResponse(sale) };
  }

  private assertSameRequest(
    record: IdempotencyRecord,
    requestFingerprint: string,
  ): void {
    if (
      record.operationType !== IDEMPOTENCY_OPERATION.createSale ||
      record.requestFingerprint !== requestFingerprint
    ) {
      throw new ApplicationError(
        HTTP_CONFLICT,
        ERROR_CODES.idempotencyConflict,
      );
    }
  }

  private async rememberFailure(
    key: string,
    requestFingerprint: string,
    connection: unknown,
  ): Promise<void> {
    try {
      await this.database.transaction(async (transaction) => {
        await this.idempotencyRepository.insertFailed(
          transaction,
          key,
          requestFingerprint,
        );
      }, { connection });
    } catch (error: unknown) {
      if (!isDuplicateEntryError(error)) {
        throw error;
      }
    }
  }
}
