import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CancelSaleService } from '../../src/application/services/cancel-sale-service.js';
import { CreateSaleService } from '../../src/application/services/create-sale-service.js';
import { PaymentService } from '../../src/application/services/payment-service.js';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/environment.js';
import { createDatabase, type Database } from '../../src/database/connection.js';
import { createLogger } from '../../src/infrastructure/logger.js';
import { isDisposableDatabaseTestContext } from '../support/database-test-context.js';

const REQUIRED_DATABASE_ENVIRONMENT_VARIABLES = [
  'NODE_ENV',
  'PORT',
  'TZ',
  'LOG_LEVEL',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DB_CONNECT_MAX_ATTEMPTS',
  'DB_CONNECT_RETRY_MS',
] as const;

const databaseEnvironmentIsConfigured = REQUIRED_DATABASE_ENVIRONMENT_VARIABLES.every(
  (name) => process.env[name] !== undefined,
);
const disposableDatabaseTestContextIsConfigured =
  databaseEnvironmentIsConfigured &&
  isDisposableDatabaseTestContext(process.env);
const TEST_KEY_PREFIX = 't006-';
const TEST_PRODUCT = {
  product_code: 'P912',
  name: 'T-006 Espresso',
  description: 'Cancel integration fixture',
  image: '/products/P912.jpg',
  price: 70,
};

interface SaleRow {
  readonly status: string;
  readonly unit_price?: number;
  readonly quantity?: number;
}

interface CountRow {
  readonly count: number;
}

interface IdempotencyRow {
  readonly status: string;
  readonly operation_type?: string;
  readonly sale_id?: string | null;
}

interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

let database: Database | undefined;

const createDeferred = (): {
  readonly promise: Promise<void>;
  readonly resolve: () => void;
} => {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: () => resolvePromise?.(),
  };
};

const getDatabase = (): Database => {
  if (database === undefined) {
    throw new Error('Cancel Sale test database has not been initialized');
  }

  return database;
};

const cleanupTestRecords = async (): Promise<void> => {
  const connection = getDatabase();
  const product = await connection('products')
    .select<{ id: number }>('id')
    .where('product_code', TEST_PRODUCT.product_code)
    .first();
  const saleIds =
    product === undefined
      ? []
      : (
          await connection('sales')
            .select<{ sale_id: string }[]>('sale_id')
            .where('product_id', product.id)
        ).map(({ sale_id }) => sale_id);

  if (saleIds.length > 0) {
    await connection('idempotency_keys')
      .whereRaw('`key` LIKE ?', [`${TEST_KEY_PREFIX}%`])
      .orWhereIn('sale_id', saleIds)
      .delete();
    await connection('payments').whereIn('sale_id', saleIds).delete();
    await connection('sales').whereIn('sale_id', saleIds).delete();
  }

  await connection('idempotency_keys')
    .whereRaw('`key` LIKE ?', [`${TEST_KEY_PREFIX}%`])
    .delete();
};

const createSale = async (
  status = 'PENDING',
  expiresAt = new Date(Date.now() + 5 * 60 * 1000),
): Promise<string> => {
  const product = await getDatabase()('products')
    .select<{ id: number }>('id')
    .where('product_code', TEST_PRODUCT.product_code)
    .first();

  if (product === undefined) {
    throw new Error('Fixture product is missing');
  }

  const saleId = randomUUID();
  await getDatabase()('sales').insert({
    sale_id: saleId,
    product_id: product.id,
    unit_price: TEST_PRODUCT.price,
    quantity: 1,
    status,
    created_at: new Date(Date.now() - 60_000),
    expires_at: expiresAt,
  });

  return saleId;
};

describe.skipIf(!disposableDatabaseTestContextIsConfigured)(
  'T-006 Cancel + Expiration',
  () => {
    beforeAll(async () => {
      const config = loadConfig();
      database = createDatabase(config.database);

      await database.migrate.latest({
        directory: resolve(import.meta.dirname, '../../src/database/migrations'),
        loadExtensions: ['.ts'],
      });
      await cleanupTestRecords();
      await database('products').insert(TEST_PRODUCT);
    });

    afterEach(async () => {
      await cleanupTestRecords();
    });

    afterAll(async () => {
      if (database !== undefined) {
        await cleanupTestRecords();
        await database('products')
          .where('product_code', TEST_PRODUCT.product_code)
          .delete();
        await database.destroy();
      }
    });

    const createLiveApp = (
      cancelService = new CancelSaleService(getDatabase()),
      paymentService = new PaymentService(getDatabase()),
    ) =>
      createApp(
        createLogger('silent'),
        new CreateSaleService(getDatabase()),
        paymentService,
        cancelService,
      );

    it('cancels a pending sale once without changing immutable sale data', async () => {
      const saleId = await createSale();

      const response = await request(createLiveApp())
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}pending`)
        .expect(200);

      expect(response.body).toEqual({ sale_id: saleId, status: 'CANCELLED' });
      await expect(
        getDatabase()('sales')
          .select('status', 'unit_price', 'quantity')
          .where('sale_id', saleId)
          .first<SaleRow>(),
      ).resolves.toMatchObject({
        status: 'CANCELLED',
        unit_price: TEST_PRODUCT.price,
        quantity: 1,
      });
      const paymentCount = await getDatabase()('payments')
        .where('sale_id', saleId)
        .count<CountRow>({ count: '*' })
        .first();
      expect(Number(paymentCount?.count)).toBe(0);
    });

    it('replays a successful key and permits a new key on an already cancelled sale', async () => {
      const saleId = await createSale();
      const key = `${TEST_KEY_PREFIX}replay`;
      const first = await request(createLiveApp())
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', key)
        .expect(200);
      const replay = await request(createLiveApp())
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', key)
        .expect(200);
      const newKey = await request(createLiveApp())
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}already-cancelled`)
        .expect(200);

      expect(replay.body).toEqual(first.body);
      expect(newKey.body).toEqual(first.body);
      const successfulKeys = await getDatabase()('idempotency_keys')
        .whereIn('key', [key, `${TEST_KEY_PREFIX}already-cancelled`])
        .andWhere('status', 'SUCCEEDED')
        .count<CountRow>({ count: '*' })
        .first();
      expect(Number(successfulKeys?.count)).toBe(2);
    });

    it('rejects cancellation of a paid sale and remembers the failed key', async () => {
      const saleId = await createSale('PAID');
      const key = `${TEST_KEY_PREFIX}paid`;
      const first = await request(createLiveApp())
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', key)
        .expect(409);

      expect((first.body as unknown as ErrorResponse).error.code).toBe(
        'SALE_ALREADY_PAID',
      );
      await expect(
        getDatabase()('sales')
          .select('status')
          .where('sale_id', saleId)
          .first<SaleRow>(),
      ).resolves.toEqual({ status: 'PAID' });
      await expect(
        getDatabase()('idempotency_keys')
          .select('status', 'operation_type')
          .where('key', key)
          .first<IdempotencyRow>(),
      ).resolves.toEqual({ status: 'FAILED', operation_type: 'CANCEL' });

      const retry = await request(createLiveApp())
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', key)
        .expect(409);
      expect((retry.body as unknown as ErrorResponse).error.code).toBe(
        'IDEMPOTENCY_FAILED',
      );
    });

    it('cancels an expired pending sale and payment replay returns cancelled without a Payment', async () => {
      const saleId = await createSale(
        'PENDING',
        new Date(Date.now() - 1_000),
      );
      await request(createLiveApp())
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}expired-cancel`)
        .expect(200, { sale_id: saleId, status: 'CANCELLED' });

      const payment = await request(createLiveApp())
        .post(`/api/v1/sales/${saleId}/payment`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}expired-payment-after-cancel`)
        .send({ payment_method: 'CASH', amount_received: 70 })
        .expect(409);
      expect((payment.body as unknown as ErrorResponse).error.code).toBe(
        'SALE_CANCELLED',
      );

      const paymentCount = await getDatabase()('payments')
        .where('sale_id', saleId)
        .count<CountRow>({ count: '*' })
        .first();
      expect(Number(paymentCount?.count)).toBe(0);
    });

    it('returns cancelled when payment itself discovers expiration and creates no Payment', async () => {
      const saleId = await createSale(
        'PENDING',
        new Date(Date.now() - 1_000),
      );

      await request(createLiveApp())
        .post(`/api/v1/sales/${saleId}/payment`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}payment-expired`)
        .send({ payment_method: 'CASH', amount_received: 70 })
        .expect(200, { sale_id: saleId, status: 'CANCELLED' });

      await expect(
        getDatabase()('sales')
          .select('status')
          .where('sale_id', saleId)
          .first<SaleRow>(),
      ).resolves.toEqual({ status: 'CANCELLED' });
      const paymentCount = await getDatabase()('payments')
        .where('sale_id', saleId)
        .count<CountRow>({ count: '*' })
        .first();
      expect(Number(paymentCount?.count)).toBe(0);
    });

    it('rejects a missing sale and one key reused for a different sale', async () => {
      const missingId = randomUUID();
      const missing = await request(createLiveApp())
        .post(`/api/v1/sales/${missingId}/cancel`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}missing`)
        .expect(404);
      expect((missing.body as unknown as ErrorResponse).error.code).toBe(
        'SALE_NOT_FOUND',
      );

      const firstSaleId = await createSale();
      const secondSaleId = await createSale();
      const key = `${TEST_KEY_PREFIX}different-sale`;
      await request(createLiveApp())
        .post(`/api/v1/sales/${firstSaleId}/cancel`)
        .set('Idempotency-Key', key)
        .expect(200);
      const conflict = await request(createLiveApp())
        .post(`/api/v1/sales/${secondSaleId}/cancel`)
        .set('Idempotency-Key', key)
        .expect(409);
      expect((conflict.body as unknown as ErrorResponse).error.code).toBe(
        'IDEMPOTENCY_CONFLICT',
      );
    });

    it('serializes overlapping same-key cancellation to one successful record', async () => {
      const saleId = await createSale();
      const key = `${TEST_KEY_PREFIX}concurrent-key`;
      const firstLocked = createDeferred();
      const releaseFirst = createDeferred();
      const secondApproachingLock = createDeferred();
      const firstApp = createLiveApp(
        new CancelSaleService(getDatabase(), {
          afterSaleLocked: async () => {
            firstLocked.resolve();
            await releaseFirst.promise;
          },
        }),
      );
      const secondApp = createLiveApp(
        new CancelSaleService(getDatabase(), {
          beforeAdvisoryLock: () => {
            secondApproachingLock.resolve();
            return Promise.resolve();
          },
        }),
      );
      const firstResponse = request(firstApp)
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', key)
        .then((response) => response);
      await firstLocked.promise;
      const secondResponse = request(secondApp)
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', key)
        .then((response) => response);
      await secondApproachingLock.promise;
      releaseFirst.resolve();
      const [first, second] = await Promise.all([
        firstResponse,
        secondResponse,
      ]);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(second.body).toEqual(first.body);
      const records = await getDatabase()('idempotency_keys')
        .where('key', key)
        .count<CountRow>({ count: '*' })
        .first();
      expect(Number(records?.count)).toBe(1);
    });

    it('makes an overlapping payment observe cancellation when cancellation locks first', async () => {
      const saleId = await createSale();
      const cancelLocked = createDeferred();
      const releaseCancel = createDeferred();
      const paymentProcessing = createDeferred();
      const cancelApp = createLiveApp(
        new CancelSaleService(getDatabase(), {
          afterSaleLocked: async () => {
            cancelLocked.resolve();
            await releaseCancel.promise;
          },
        }),
      );
      const paymentApp = createLiveApp(
        new CancelSaleService(getDatabase()),
        new PaymentService(getDatabase(), {
          afterProcessingInserted: () => {
            paymentProcessing.resolve();
            return Promise.resolve();
          },
        }),
      );
      const cancelResponse = request(cancelApp)
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}race-cancel-first`)
        .then((response) => response);
      await cancelLocked.promise;
      const paymentResponse = request(paymentApp)
        .post(`/api/v1/sales/${saleId}/payment`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}race-payment-second`)
        .send({ payment_method: 'CASH', amount_received: 70 })
        .then((response) => response);
      await paymentProcessing.promise;
      releaseCancel.resolve();
      const [cancel, payment] = await Promise.all([
        cancelResponse,
        paymentResponse,
      ]);

      expect(cancel.status).toBe(200);
      expect(payment.status).toBe(409);
      expect((payment.body as unknown as ErrorResponse).error.code).toBe(
        'SALE_CANCELLED',
      );
      await expect(
        getDatabase()('sales')
          .select('status')
          .where('sale_id', saleId)
          .first<SaleRow>(),
      ).resolves.toEqual({ status: 'CANCELLED' });
      const paymentCount = await getDatabase()('payments')
        .where('sale_id', saleId)
        .count<CountRow>({ count: '*' })
        .first();
      expect(Number(paymentCount?.count)).toBe(0);
    });

    it('makes an overlapping cancellation observe payment when payment locks first', async () => {
      const saleId = await createSale();
      const paymentLocked = createDeferred();
      const releasePayment = createDeferred();
      const cancelProcessing = createDeferred();
      const paymentApp = createLiveApp(
        new CancelSaleService(getDatabase()),
        new PaymentService(getDatabase(), {
          afterSaleLocked: async () => {
            paymentLocked.resolve();
            await releasePayment.promise;
          },
        }),
      );
      const cancelApp = createLiveApp(
        new CancelSaleService(getDatabase(), {
          afterProcessingInserted: () => {
            cancelProcessing.resolve();
            return Promise.resolve();
          },
        }),
      );
      const paymentResponse = request(paymentApp)
        .post(`/api/v1/sales/${saleId}/payment`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}race-payment-first`)
        .send({ payment_method: 'CASH', amount_received: 70 })
        .then((response) => response);
      await paymentLocked.promise;
      const cancelResponse = request(cancelApp)
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}race-cancel-second`)
        .then((response) => response);
      await cancelProcessing.promise;
      releasePayment.resolve();
      const [payment, cancel] = await Promise.all([
        paymentResponse,
        cancelResponse,
      ]);

      expect(payment.status).toBe(201);
      expect(cancel.status).toBe(409);
      expect((cancel.body as unknown as ErrorResponse).error.code).toBe(
        'SALE_ALREADY_PAID',
      );
      await expect(
        getDatabase()('sales')
          .select('status')
          .where('sale_id', saleId)
          .first<SaleRow>(),
      ).resolves.toEqual({ status: 'PAID' });
      const paymentCount = await getDatabase()('payments')
        .where('sale_id', saleId)
        .count<CountRow>({ count: '*' })
        .first();
      expect(Number(paymentCount?.count)).toBe(1);
    });

    it('serializes an expired payment attempt with cancellation without creating Payment', async () => {
      const saleId = await createSale(
        'PENDING',
        new Date(Date.now() - 1_000),
      );
      const paymentLocked = createDeferred();
      const releasePayment = createDeferred();
      const cancelProcessing = createDeferred();
      const paymentApp = createLiveApp(
        new CancelSaleService(getDatabase()),
        new PaymentService(getDatabase(), {
          afterSaleLocked: async () => {
            paymentLocked.resolve();
            await releasePayment.promise;
          },
        }),
      );
      const cancelApp = createLiveApp(
        new CancelSaleService(getDatabase(), {
          afterProcessingInserted: () => {
            cancelProcessing.resolve();
            return Promise.resolve();
          },
        }),
      );
      const paymentResponse = request(paymentApp)
        .post(`/api/v1/sales/${saleId}/payment`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}expired-race-payment`)
        .send({ payment_method: 'CASH', amount_received: 70 })
        .then((response) => response);
      await paymentLocked.promise;
      const cancelResponse = request(cancelApp)
        .post(`/api/v1/sales/${saleId}/cancel`)
        .set('Idempotency-Key', `${TEST_KEY_PREFIX}expired-race-cancel`)
        .then((response) => response);
      await cancelProcessing.promise;
      releasePayment.resolve();
      const [payment, cancel] = await Promise.all([
        paymentResponse,
        cancelResponse,
      ]);

      expect(payment.status).toBe(200);
      expect(payment.body).toEqual({ sale_id: saleId, status: 'CANCELLED' });
      expect(cancel.status).toBe(200);
      expect(cancel.body).toEqual(payment.body);
      const paymentCount = await getDatabase()('payments')
        .where('sale_id', saleId)
        .count<CountRow>({ count: '*' })
        .first();
      expect(Number(paymentCount?.count)).toBe(0);
    });

    it.each([
      ['Sale update', 'sale-update'],
      ['successful idempotency write', 'idempotency-success'],
    ] as const)(
      'rolls back after the %s before persisting FAILED separately',
      async (_name, failurePoint) => {
      const saleId = await createSale();
        const key = `${TEST_KEY_PREFIX}rollback-${failurePoint}`;
        const service = new CancelSaleService(
          getDatabase(),
          failurePoint === 'sale-update'
            ? { failAfterSaleUpdate: true }
            : { failAfterIdempotencySuccess: true },
        );

        await request(createLiveApp(service))
          .post(`/api/v1/sales/${saleId}/cancel`)
          .set('Idempotency-Key', key)
          .expect(500);

        await expect(
          getDatabase()('sales')
            .select('status')
            .where('sale_id', saleId)
            .first<SaleRow>(),
        ).resolves.toEqual({ status: 'PENDING' });
        await expect(
          getDatabase()('idempotency_keys')
            .select('status', 'sale_id')
            .where('key', key)
            .first<IdempotencyRow>(),
        ).resolves.toEqual({ status: 'FAILED', sale_id: null });

        const retry = await request(createLiveApp())
          .post(`/api/v1/sales/${saleId}/cancel`)
          .set('Idempotency-Key', key)
          .expect(409);
        expect((retry.body as unknown as ErrorResponse).error.code).toBe(
          'IDEMPOTENCY_FAILED',
        );
      },
    );
  },
);
