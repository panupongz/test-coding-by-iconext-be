import type { Knex } from 'knex';

export const IDEMPOTENCY_OPERATION = {
  createSale: 'CREATE_SALE',
  payment: 'PAYMENT',
  cancel: 'CANCEL',
} as const;

export const IDEMPOTENCY_STATUS = {
  processing: 'PROCESSING',
  succeeded: 'SUCCEEDED',
  failed: 'FAILED',
} as const;

export type IdempotencyStatus =
  (typeof IDEMPOTENCY_STATUS)[keyof typeof IDEMPOTENCY_STATUS];

interface IdempotencyRow {
  readonly key: string;
  readonly request_fingerprint: string;
  readonly operation_type: string;
  readonly status: IdempotencyStatus;
  readonly sale_id: string | null;
  readonly payment_id: string | null;
}

export interface IdempotencyRecord {
  readonly key: string;
  readonly requestFingerprint: string;
  readonly operationType: string;
  readonly status: IdempotencyStatus;
  readonly saleId: string | null;
  readonly paymentId: string | null;
}

export class IdempotencyRepository {
  public async insertProcessing(
    transaction: Knex.Transaction,
    key: string,
    requestFingerprint: string,
    operationType: string = IDEMPOTENCY_OPERATION.createSale,
  ): Promise<void> {
    await transaction('idempotency_keys').insert({
      key,
      request_fingerprint: requestFingerprint,
      operation_type: operationType,
      status: IDEMPOTENCY_STATUS.processing,
    });
  }

  public async markSucceeded(
    transaction: Knex.Transaction,
    key: string,
    saleId: string,
  ): Promise<void> {
    const updatedRows = await transaction('idempotency_keys')
      .where({ key, status: IDEMPOTENCY_STATUS.processing })
      .update({
        status: IDEMPOTENCY_STATUS.succeeded,
        sale_id: saleId,
        updated_at: transaction.fn.now(3),
      });

    if (updatedRows !== 1) {
      throw new Error('Expected one processing idempotency record');
    }
  }

  public async markPaymentSucceeded(
    transaction: Knex.Transaction,
    key: string,
    paymentId: string,
  ): Promise<void> {
    const updatedRows = await transaction('idempotency_keys')
      .where({ key, status: IDEMPOTENCY_STATUS.processing })
      .update({
        status: IDEMPOTENCY_STATUS.succeeded,
        payment_id: paymentId,
        updated_at: transaction.fn.now(3),
      });

    if (updatedRows !== 1) {
      throw new Error('Expected one processing idempotency record');
    }
  }

  public async find(
    connection: Knex | Knex.Transaction,
    key: string,
  ): Promise<IdempotencyRecord | undefined> {
    const record = await connection<IdempotencyRow>('idempotency_keys')
      .select(
        'key',
        'request_fingerprint',
        'operation_type',
        'status',
        'sale_id',
        'payment_id',
      )
      .where({ key })
      .first();

    if (record === undefined) {
      return undefined;
    }

    return {
      key: record.key,
      requestFingerprint: record.request_fingerprint,
      operationType: record.operation_type,
      status: record.status,
      saleId: record.sale_id,
      paymentId: record.payment_id,
    };
  }

  public async insertFailed(
    transaction: Knex.Transaction,
    key: string,
    requestFingerprint: string,
    operationType: string = IDEMPOTENCY_OPERATION.createSale,
  ): Promise<void> {
    await transaction('idempotency_keys').insert({
      key,
      request_fingerprint: requestFingerprint,
      operation_type: operationType,
      status: IDEMPOTENCY_STATUS.failed,
    });
  }
}
