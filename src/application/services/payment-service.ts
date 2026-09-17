import { randomUUID } from 'node:crypto';

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
  PAYMENT_METHOD,
  type PaymentMethod,
  type PaymentView,
} from '../../domain/payment.js';
import { isSaleExpiredAt, SALE_STATUS } from '../../domain/sale.js';
import { createRequestFingerprint } from '../request-fingerprint.js';
import { withIdempotencyKeyLock } from '../idempotency-key-lock.js';

const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;

interface MysqlError {
  readonly code?: unknown;
}

export interface PaymentCommand {
  readonly saleId: string;
  readonly paymentMethod: PaymentMethod;
  readonly amountReceived: number;
  readonly idempotencyKey: string;
}

export type PaymentResult =
  | {
      readonly kind: 'payment';
      readonly created: boolean;
      readonly payment: PaymentView;
    }
  | {
      readonly kind: 'expired';
      readonly saleId: string;
      readonly status: typeof SALE_STATUS.cancelled;
    };

export interface PaymentServiceOptions {
  readonly now?: () => Date;
  readonly generatePaymentId?: () => string;
  readonly saleRepository?: SaleRepository;
  readonly idempotencyRepository?: IdempotencyRepository;
  readonly afterSaleLocked?: () => Promise<void>;
  readonly failAfterPaymentInsert?: boolean;
  readonly failAfterSaleUpdate?: boolean;
  readonly failAfterIdempotencySuccess?: boolean;
}

const createFingerprint = (command: PaymentCommand): string =>
  createRequestFingerprint(IDEMPOTENCY_OPERATION.payment, {
    sale_id: command.saleId.toLowerCase(),
    payment_method: command.paymentMethod,
    amount_received: command.amountReceived,
  });

const isDuplicateEntryError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as MysqlError).code === 'ER_DUP_ENTRY';

export const calculatePaymentChange = (
  paymentMethod: PaymentMethod,
  amountReceived: number,
  total: number,
): number | null => {
  if (paymentMethod === PAYMENT_METHOD.cash) {
    if (amountReceived < total) {
      throw new ApplicationError(
        400,
        ERROR_CODES.insufficientCashAmount,
      );
    }

    return amountReceived - total;
  }

  if (amountReceived !== total) {
    throw new ApplicationError(
      400,
      ERROR_CODES.qrAmountMismatch,
    );
  }

  return null;
};

export class PaymentService {
  private readonly now: () => Date;
  private readonly generatePaymentId: () => string;
  private readonly saleRepository: SaleRepository;
  private readonly idempotencyRepository: IdempotencyRepository;
  private readonly afterSaleLocked: () => Promise<void>;
  private readonly failAfterPaymentInsert: boolean;
  private readonly failAfterSaleUpdate: boolean;
  private readonly failAfterIdempotencySuccess: boolean;

  public constructor(
    private readonly database: Knex,
    options: PaymentServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.generatePaymentId = options.generatePaymentId ?? randomUUID;
    this.saleRepository = options.saleRepository ?? new SaleRepository();
    this.idempotencyRepository =
      options.idempotencyRepository ?? new IdempotencyRepository();
    this.afterSaleLocked = options.afterSaleLocked ?? (() => Promise.resolve());
    this.failAfterPaymentInsert = options.failAfterPaymentInsert ?? false;
    this.failAfterSaleUpdate = options.failAfterSaleUpdate ?? false;
    this.failAfterIdempotencySuccess =
      options.failAfterIdempotencySuccess ?? false;
  }

  public async execute(command: PaymentCommand): Promise<PaymentResult> {
    const requestReceivedAt = this.now();
    const requestFingerprint = createFingerprint(command);

    return withIdempotencyKeyLock(
      this.database,
      command.idempotencyKey,
      (connection) =>
        this.executeWhileLocked(
          command,
          requestFingerprint,
          requestReceivedAt,
          connection,
        ),
    );
  }

  private async executeWhileLocked(
    command: PaymentCommand,
    requestFingerprint: string,
    requestReceivedAt: Date,
    connection: unknown,
  ): Promise<PaymentResult> {
    try {
      const payment = await this.database.transaction(async (transaction) => {
        await this.idempotencyRepository.insertProcessing(
          transaction,
          command.idempotencyKey,
          requestFingerprint,
          IDEMPOTENCY_OPERATION.payment,
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

        if (sale.status === SALE_STATUS.cancelled) {
          throw new ApplicationError(
            HTTP_CONFLICT,
            ERROR_CODES.saleCancelled,
          );
        }

        const paidAt = this.now();

        if (
          isSaleExpiredAt(sale.expiresAt, requestReceivedAt) ||
          isSaleExpiredAt(sale.expiresAt, paidAt)
        ) {
          await this.saleRepository.markCancelled(transaction, sale.saleId);
          await this.idempotencyRepository.markSucceeded(
            transaction,
            command.idempotencyKey,
            sale.saleId,
          );

          return undefined;
        }

        const total = sale.unitPrice * sale.quantity;
        const change = calculatePaymentChange(
          command.paymentMethod,
          command.amountReceived,
          total,
        );
        const paymentId = this.generatePaymentId();

        await this.saleRepository.insertPayment(transaction, {
          paymentId,
          saleId: sale.saleId,
          paymentMethod: command.paymentMethod,
          amountReceived: command.amountReceived,
          change,
          paidAt,
        });

        if (this.failAfterPaymentInsert) {
          throw new Error('Injected failure after payment insert');
        }

        await this.saleRepository.markPaid(transaction, sale.saleId);

        if (this.failAfterSaleUpdate) {
          throw new Error('Injected failure after sale update');
        }

        await this.idempotencyRepository.markPaymentSucceeded(
          transaction,
          command.idempotencyKey,
          paymentId,
        );

        if (this.failAfterIdempotencySuccess) {
          throw new Error('Injected failure after idempotency success');
        }

        return {
          paymentId,
          paymentMethod: command.paymentMethod,
          amountReceived: command.amountReceived,
          change,
          paidAt,
        } satisfies PaymentView;
      }, { connection });

      if (payment === undefined) {
        return {
          kind: 'expired',
          saleId: command.saleId,
          status: SALE_STATUS.cancelled,
        };
      }

      return {
        kind: 'payment',
        created: true,
        payment,
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

  private async resolveExisting(
    record: IdempotencyRecord,
    requestFingerprint: string,
  ): Promise<PaymentResult> {
    this.assertSameRequest(record, requestFingerprint);

    if (record.status === IDEMPOTENCY_STATUS.failed) {
      throw new ApplicationError(
        HTTP_CONFLICT,
        ERROR_CODES.idempotencyFailed,
      );
    }

    if (record.status !== IDEMPOTENCY_STATUS.succeeded) {
      throw new ApplicationError(
        HTTP_CONFLICT,
        ERROR_CODES.idempotencyConflict,
      );
    }

    if (record.paymentId !== null) {
      const payment = await this.saleRepository.findPaymentView(
        this.database,
        record.paymentId,
      );

      if (payment === undefined) {
        throw new Error('Succeeded idempotency record references a missing payment');
      }

      return {
        kind: 'payment',
        created: false,
        payment,
      };
    }

    if (record.saleId !== null) {
      return {
        kind: 'expired',
        saleId: record.saleId,
        status: SALE_STATUS.cancelled,
      };
    }

    throw new Error('Succeeded payment idempotency record has no resource');
  }

  private assertSameRequest(
    record: IdempotencyRecord,
    requestFingerprint: string,
  ): void {
    if (
      record.operationType !== IDEMPOTENCY_OPERATION.payment ||
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
          IDEMPOTENCY_OPERATION.payment,
        );
      }, { connection });
    } catch (error: unknown) {
      if (!isDuplicateEntryError(error)) {
        throw error;
      }
    }
  }
}
