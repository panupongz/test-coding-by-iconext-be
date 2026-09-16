import { createHash } from 'node:crypto';

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
import { SALE_STATUS } from '../../domain/sale.js';
import { createRequestFingerprint } from '../request-fingerprint.js';

const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
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

export interface CancelSaleCommand {
  readonly saleId: string;
  readonly idempotencyKey: string;
}

export interface CancelSaleResult {
  readonly saleId: string;
  readonly status: typeof SALE_STATUS.cancelled;
}

export interface CancelSaleServiceOptions {
  readonly saleRepository?: SaleRepository;
  readonly idempotencyRepository?: IdempotencyRepository;
  readonly afterSaleLocked?: () => Promise<void>;
  readonly failAfterSaleUpdate?: boolean;
  readonly failAfterIdempotencySuccess?: boolean;
}

const createFingerprint = (saleId: string): string =>
  createRequestFingerprint(IDEMPOTENCY_OPERATION.cancel, {
    sale_id: saleId.toLowerCase(),
  });

const isDuplicateEntryError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as MysqlError).code === 'ER_DUP_ENTRY';

export class CancelSaleService {
  private readonly saleRepository: SaleRepository;
  private readonly idempotencyRepository: IdempotencyRepository;
  private readonly afterSaleLocked: () => Promise<void>;
  private readonly failAfterSaleUpdate: boolean;
  private readonly failAfterIdempotencySuccess: boolean;

  public constructor(
    private readonly database: Knex,
    options: CancelSaleServiceOptions = {},
  ) {
    this.saleRepository = options.saleRepository ?? new SaleRepository();
    this.idempotencyRepository =
      options.idempotencyRepository ?? new IdempotencyRepository();
    this.afterSaleLocked = options.afterSaleLocked ?? (() => Promise.resolve());
    this.failAfterSaleUpdate = options.failAfterSaleUpdate ?? false;
    this.failAfterIdempotencySuccess =
      options.failAfterIdempotencySuccess ?? false;
  }

  public async execute(command: CancelSaleCommand): Promise<CancelSaleResult> {
    const requestFingerprint = createFingerprint(command.saleId);
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
    command: CancelSaleCommand,
    requestFingerprint: string,
    connection: unknown,
  ): Promise<CancelSaleResult> {
    try {
      await this.database.transaction(async (transaction) => {
        await this.idempotencyRepository.insertProcessing(
          transaction,
          command.idempotencyKey,
          requestFingerprint,
          IDEMPOTENCY_OPERATION.cancel,
        );
        const sale = await this.saleRepository.findByIdForUpdate(
          transaction,
          command.saleId,
        );

        if (sale === undefined) {
          throw new ApplicationError(
            HTTP_NOT_FOUND,
            ERROR_CODES.saleNotFound,
          );
        }
        await this.afterSaleLocked();

        if (sale.status === SALE_STATUS.paid) {
          throw new ApplicationError(
            HTTP_CONFLICT,
            ERROR_CODES.saleAlreadyPaid,
          );
        }

        if (sale.status === SALE_STATUS.pending) {
          await this.saleRepository.markCancelled(transaction, sale.saleId);
        }

        if (this.failAfterSaleUpdate) {
          throw new Error('Injected failure after sale update');
        }

        await this.idempotencyRepository.markSucceeded(
          transaction,
          command.idempotencyKey,
          sale.saleId,
        );

        if (this.failAfterIdempotencySuccess) {
          throw new Error('Injected failure after idempotency success');
        }
      }, { connection });

      return {
        saleId: command.saleId,
        status: SALE_STATUS.cancelled,
      };
    } catch (error: unknown) {
      if (isDuplicateEntryError(error)) {
        const existingRecord = await this.idempotencyRepository.find(
          this.database,
          command.idempotencyKey,
        );

        if (existingRecord !== undefined) {
          return this.resolveExisting(existingRecord, requestFingerprint);
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

  private resolveExisting(
    record: IdempotencyRecord,
    requestFingerprint: string,
  ): CancelSaleResult {
    this.assertSameRequest(record, requestFingerprint);

    if (record.status === IDEMPOTENCY_STATUS.failed) {
      throw new ApplicationError(
        HTTP_CONFLICT,
        ERROR_CODES.idempotencyFailed,
      );
    }

    if (
      record.status !== IDEMPOTENCY_STATUS.succeeded ||
      record.saleId === null
    ) {
      throw new ApplicationError(
        HTTP_CONFLICT,
        ERROR_CODES.idempotencyConflict,
      );
    }

    return {
      saleId: record.saleId,
      status: SALE_STATUS.cancelled,
    };
  }

  private assertSameRequest(
    record: IdempotencyRecord,
    requestFingerprint: string,
  ): void {
    if (
      record.operationType !== IDEMPOTENCY_OPERATION.cancel ||
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
          IDEMPOTENCY_OPERATION.cancel,
        );
      }, { connection });
    } catch (error: unknown) {
      if (!isDuplicateEntryError(error)) {
        throw error;
      }
    }
  }
}
