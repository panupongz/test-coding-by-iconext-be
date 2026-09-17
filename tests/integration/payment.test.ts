import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CreateSaleService } from '../../src/application/services/create-sale-service.js';
import { PaymentService } from '../../src/application/services/payment-service.js';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/environment.js';
import { createDatabase, type Database } from '../../src/database/connection.js';
import { createLogger } from '../../src/infrastructure/logger.js';
import {
  waitForAdvisoryLockWait,
  waitForSaleRowLockWait,
} from '../support/database-lock-wait.js';
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
const TEST_KEY_PREFIX = 't005-';
const TEST_PRODUCT = {
  product_code: 'P911',
  name: 'T-005 Latte',
  description: 'Payment integration fixture',
  image: '/products/P911.jpg',
  price: 80,
};
const PAYMENT_RESPONSE_FIELDS = [
  'amount_received',
  'change',
  'paid_at',
  'payment_id',
  'payment_method',
];
const QR_PAYMENT_RESPONSE_FIELDS = [
  'amount_received',
  'paid_at',
  'payment_id',
  'payment_method',
];

interface SaleRow {
  readonly status: string;
}

interface CountRow {
  readonly count: number;
}

interface PaymentRow {
  readonly payment_method: string;
  readonly amount_received: number;
  readonly change: number | null;
}

interface IdempotencyRow {
  readonly status: string;
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
    throw new Error('Payment test database has not been initialized');
  }

  return database;
};

const cleanupTestRecords = async (): Promise<void> => {
  const connection = getDatabase();
  const product = await connection('products')
    .select<{ id: number }>('id')
    .where('product_code', TEST_PRODUCT.product_code)
    .first();
  const ids =
    product === undefined
      ? []
      : (
          await connection('sales')
            .select<{ sale_id: string }[]>('sale_id')
            .where('product_id', product.id)
        ).map(({ sale_id }) => sale_id);

  if (ids.length > 0) {
    await connection('idempotency_keys')
      .whereRaw('`key` LIKE ?', [`${TEST_KEY_PREFIX}%`])
      .orWhereIn('sale_id', ids)
      .delete();
    await connection('payments').whereIn('sale_id', ids).delete();
    await connection('sales').whereIn('sale_id', ids).delete();
  }

  await connection('idempotency_keys')
    .whereRaw('`key` LIKE ?', [`${TEST_KEY_PREFIX}%`])
    .delete();
};

const createSale = async (
  status = 'PENDING',
  expiresAt = new Date(Date.now() + 5 * 60 * 1000),
  saleId = randomUUID(),
): Promise<string> => {
  const product = await getDatabase()('products')
    .select<{ id: number }>('id')
    .where('product_code', TEST_PRODUCT.product_code)
    .first();

  if (product === undefined) {
    throw new Error('Fixture product is missing');
  }

  await getDatabase()('sales').insert({
    sale_id: saleId,
    product_id: product.id,
    unit_price: TEST_PRODUCT.price,
    quantity: 1,
    status,
    created_at: new Date(expiresAt.getTime() - 5 * 60 * 1000),
    expires_at: expiresAt,
  });

  return saleId;
};

describe.skipIf(!disposableDatabaseTestContextIsConfigured)('T-005 Payment', () => {
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

  const createLiveApp = (paymentService = new PaymentService(getDatabase())) =>
    createApp(
      createLogger('silent'),
      new CreateSaleService(getDatabase()),
      paymentService,
    );

  it('accepts CASH exact amount and overpayment with correct change', async () => {
    const exactSaleId = await createSale();
    const exact = await request(createLiveApp())
      .post(`/api/v1/sales/${exactSaleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}cash-exact`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(201);

    expect(Object.keys(exact.body as object).sort()).toEqual(
      PAYMENT_RESPONSE_FIELDS,
    );
    expect(exact.body).toMatchObject({
      payment_method: 'CASH',
      amount_received: 80,
      change: 0,
    });

    const overpaySaleId = await createSale();
    const overpay = await request(createLiveApp())
      .post(`/api/v1/sales/${overpaySaleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}cash-overpay`)
      .send({ payment_method: 'CASH', amount_received: 100 })
      .expect(201);

    expect(overpay.body).toMatchObject({
      payment_method: 'CASH',
      amount_received: 100,
      change: 20,
    });

    expect(Object.keys(overpay.body as object).sort()).toEqual(
      PAYMENT_RESPONSE_FIELDS,
    );

    const paidRows = await getDatabase()('sales')
      .whereIn('sale_id', [exactSaleId, overpaySaleId])
      .where({ status: 'PAID' })
      .count<CountRow>({ count: '*' })
      .first();
    expect(Number(paidRows?.count)).toBe(2);
    const payments = await getDatabase()<PaymentRow>('payments')
      .select('payment_method', 'amount_received', 'change')
      .whereIn('sale_id', [exactSaleId, overpaySaleId])
      .orderBy('amount_received');
    expect(payments).toEqual([
      { payment_method: 'CASH', amount_received: 80, change: 0 },
      { payment_method: 'CASH', amount_received: 100, change: 20 },
    ]);
  });

  it('accepts QR exact amount without a change field', async () => {
    const saleId = await createSale();
    const response = await request(createLiveApp())
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}qr-exact`)
      .send({ payment_method: 'QR_PAYMENT', amount_received: 80 })
      .expect(201);

    expect(Object.keys(response.body as object).sort()).toEqual(
      QR_PAYMENT_RESPONSE_FIELDS,
    );
    expect(response.body).toMatchObject({
      payment_method: 'QR_PAYMENT',
      amount_received: 80,
    });
    await expect(
      getDatabase()('sales')
        .select('status')
        .where('sale_id', saleId)
        .first<SaleRow>(),
    ).resolves.toMatchObject({ status: 'PAID' });
    await expect(
      getDatabase()<PaymentRow>('payments')
        .select('payment_method', 'amount_received', 'change')
        .where('sale_id', saleId)
        .first(),
    ).resolves.toEqual({
      payment_method: 'QR_PAYMENT',
      amount_received: 80,
      change: null,
    });
  });

  it.each([
    ['cash insufficient', { payment_method: 'CASH', amount_received: 79 }, 'INSUFFICIENT_CASH_AMOUNT'],
    ['cash non-positive', { payment_method: 'CASH', amount_received: 0 }, 'VALIDATION_ERROR'],
    ['cash wrong type', { payment_method: 'CASH', amount_received: '80' }, 'VALIDATION_ERROR'],
    ['qr mismatch', { payment_method: 'QR_PAYMENT', amount_received: 81 }, 'QR_AMOUNT_MISMATCH'],
    ['unsupported method', { payment_method: 'CARD', amount_received: 80 }, 'UNSUPPORTED_PAYMENT_METHOD'],
    ['missing field', { payment_method: 'CASH' }, 'VALIDATION_ERROR'],
    ['extra field', { payment_method: 'CASH', amount_received: 80, note: 'x' }, 'VALIDATION_ERROR'],
  ])('rejects %s without changing the sale', async (_name, body, errorCode) => {
    const saleId = await createSale();
    const response = await request(createLiveApp())
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}${_name}`)
      .send(body)
      .expect(400);

    expect((response.body as unknown as ErrorResponse).error.code).toBe(errorCode);
    await expect(
      getDatabase()('sales')
        .select('status')
        .where('sale_id', saleId)
        .first<SaleRow>(),
    ).resolves.toMatchObject({ status: 'PENDING' });
    const paymentCount = await getDatabase()('payments')
      .where('sale_id', saleId)
      .count<CountRow>({ count: '*' })
      .first();
    expect(Number(paymentCount?.count)).toBe(0);
  });

  it('returns 404 for invalid and missing sales, and 409 for unrelated paid or cancelled sales', async () => {
    await request(createLiveApp())
      .post('/api/v1/sales/not-a-uuid/payment')
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}invalid-sale`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(404)
      .expect(({ body }) => {
        expect((body as ErrorResponse).error.code).toBe('SALE_NOT_FOUND');
      });

    await request(createLiveApp())
      .post(`/api/v1/sales/${randomUUID()}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}missing-sale`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(404)
      .expect(({ body }) => {
        expect((body as ErrorResponse).error.code).toBe('SALE_NOT_FOUND');
      });

    const paidSaleId = await createSale('PAID');
    const paid = await request(createLiveApp())
      .post(`/api/v1/sales/${paidSaleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}already-paid`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(409);
    expect((paid.body as unknown as ErrorResponse).error.code).toBe(
      'SALE_ALREADY_PAID',
    );

    const cancelledSaleId = await createSale('CANCELLED');
    const cancelled = await request(createLiveApp())
      .post(`/api/v1/sales/${cancelledSaleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}already-cancelled`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(409);
    expect((cancelled.body as unknown as ErrorResponse).error.code).toBe(
      'SALE_CANCELLED',
    );
  });

  it('persists expired pending sales as cancelled without creating a payment', async () => {
    const saleId = await createSale(
      'PENDING',
      new Date(Date.now() - 1_000),
    );
    const response = await request(createLiveApp())
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}expired`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(200);

    expect(response.body).toEqual({ sale_id: saleId, status: 'CANCELLED' });
    await expect(
      getDatabase()('sales')
        .select('status')
        .where('sale_id', saleId)
        .first<SaleRow>(),
    ).resolves.toMatchObject({ status: 'CANCELLED' });
    const paymentCount = await getDatabase()('payments')
      .where('sale_id', saleId)
      .count<CountRow>({ count: '*' })
      .first();
    expect(Number(paymentCount?.count)).toBe(0);

    const replay = await request(createLiveApp())
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}expired`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(200);
    expect(replay.body).toEqual(response.body);
  });

  it('rechecks expiry inside the transaction before committing payment', async () => {
    const requestTime = new Date('2026-09-17T00:00:00.000Z');
    const expiryTime = new Date('2026-09-17T00:00:00.500Z');
    const commitCheckTime = new Date('2026-09-17T00:00:01.000Z');
    const saleId = await createSale('PENDING', expiryTime);
    const times = [requestTime, commitCheckTime];
    const service = new PaymentService(getDatabase(), {
      now: () => times.shift() ?? commitCheckTime,
    });

    const response = await request(createLiveApp(service))
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}expires-during-transaction`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(200);

    expect(response.body).toEqual({ sale_id: saleId, status: 'CANCELLED' });
    await expect(
      getDatabase()('sales')
        .select('status')
        .where('sale_id', saleId)
        .first<SaleRow>(),
    ).resolves.toMatchObject({ status: 'CANCELLED' });
    const paymentCount = await getDatabase()('payments')
      .where('sale_id', saleId)
      .count<CountRow>({ count: '*' })
      .first();
    expect(Number(paymentCount?.count)).toBe(0);
  });

  it('allows only one overlapping payment with different keys for the same sale', async () => {
    const saleId = await createSale();
    const firstLocked = createDeferred();
    const releaseFirst = createDeferred();
    const firstApp = createLiveApp(
      new PaymentService(getDatabase(), {
        afterSaleLocked: async () => {
          firstLocked.resolve();
          await releaseFirst.promise;
        },
      }),
    );
    const secondApp = createLiveApp();
    const firstResponse = request(firstApp)
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}race-a`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .then((response) => response);
    await firstLocked.promise;
    const secondResponse = request(secondApp)
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}race-b`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .then((response) => response);
    await waitForSaleRowLockWait(getDatabase(), saleId);
    releaseFirst.resolve();
    const responses = await Promise.all([firstResponse, secondResponse]);

    expect(responses.filter(({ status }) => status === 201)).toHaveLength(1);
    expect(responses.filter(({ status }) => status === 409)).toHaveLength(1);
    const paymentCount = await getDatabase()('payments')
      .where('sale_id', saleId)
      .count<CountRow>({ count: '*' })
      .first();
    expect(Number(paymentCount?.count)).toBe(1);
  });

  it('serializes overlapping requests with the same idempotency key', async () => {
    const saleId = await createSale();
    const key = `${TEST_KEY_PREFIX}same-key-race`;
    const firstLocked = createDeferred();
    const releaseFirst = createDeferred();
    const firstApp = createLiveApp(
      new PaymentService(getDatabase(), {
        afterSaleLocked: async () => {
          firstLocked.resolve();
          await releaseFirst.promise;
        },
      }),
    );
    const secondApp = createLiveApp();
    const firstResponse = request(firstApp)
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', key)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .then((response) => response);
    await firstLocked.promise;

    const secondResponse = request(secondApp)
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', key)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .then((response) => response);
    await waitForAdvisoryLockWait(getDatabase(), key);
    releaseFirst.resolve();

    const [first, second] = await Promise.all([firstResponse, secondResponse]);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    const paymentCount = await getDatabase()('payments')
      .where('sale_id', saleId)
      .count<CountRow>({ count: '*' })
      .first();
    expect(Number(paymentCount?.count)).toBe(1);
  });

  it('returns existing payment on replay and rejects same key for a different request or failed retry', async () => {
    const saleId = await createSale();
    const key = `${TEST_KEY_PREFIX}replay`;
    const first = await request(createLiveApp())
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', key)
      .send({ payment_method: 'CASH', amount_received: 100 })
      .expect(201);

    const replay = await request(createLiveApp())
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', key)
      .send({ payment_method: 'CASH', amount_received: 100 })
      .expect(200);
    expect(replay.body).toEqual(first.body);

    const conflict = await request(createLiveApp())
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', key)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(409);
    expect((conflict.body as unknown as ErrorResponse).error.code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );

    const failedSaleId = await createSale();
    const failedKey = `${TEST_KEY_PREFIX}failed-retry`;
    await request(createLiveApp())
      .post(`/api/v1/sales/${failedSaleId}/payment`)
      .set('Idempotency-Key', failedKey)
      .send({ payment_method: 'CASH', amount_received: 79 })
      .expect(400);
    const failedRetry = await request(createLiveApp())
      .post(`/api/v1/sales/${failedSaleId}/payment`)
      .set('Idempotency-Key', failedKey)
      .send({ payment_method: 'CASH', amount_received: 79 })
      .expect(409);
    expect((failedRetry.body as unknown as ErrorResponse).error.code).toBe(
      'IDEMPOTENCY_FAILED',
    );

    const crossOperationKey = `${TEST_KEY_PREFIX}cross-operation`;
    await request(createLiveApp())
      .post('/api/v1/sales')
      .set('Idempotency-Key', crossOperationKey)
      .send({ product_code: TEST_PRODUCT.product_code })
      .expect(201);
    const crossOperationSaleId = await createSale();
    const crossOperation = await request(createLiveApp())
      .post(`/api/v1/sales/${crossOperationSaleId}/payment`)
      .set('Idempotency-Key', crossOperationKey)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(409);
    expect(
      (crossOperation.body as unknown as ErrorResponse).error.code,
    ).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('treats UUID letter casing as the same logical Payment request', async () => {
    const saleId = await createSale(
      'PENDING',
      new Date(Date.now() + 5 * 60 * 1000),
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
    const key = `${TEST_KEY_PREFIX}uuid-case-replay`;
    const first = await request(createLiveApp())
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', key)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(201);
    const replay = await request(createLiveApp())
      .post(`/api/v1/sales/${saleId.toUpperCase()}/payment`)
      .set('Idempotency-Key', key)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(200);

    expect(replay.body).toEqual(first.body);
  });

  it('rolls back payment and sale update failures before persisting FAILED separately', async () => {
    const saleId = await createSale();
    const key = `${TEST_KEY_PREFIX}rollback-after-insert`;
    await request(
      createLiveApp(
        new PaymentService(getDatabase(), { failAfterPaymentInsert: true }),
      ),
    )
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', key)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(500);

    await expect(
      getDatabase()('sales')
        .select('status')
        .where('sale_id', saleId)
        .first<SaleRow>(),
    ).resolves.toMatchObject({ status: 'PENDING' });
    const paymentCount = await getDatabase()('payments')
      .where('sale_id', saleId)
      .count<CountRow>({ count: '*' })
      .first();
    expect(Number(paymentCount?.count)).toBe(0);

    const retry = await request(createLiveApp())
      .post(`/api/v1/sales/${saleId}/payment`)
      .set('Idempotency-Key', key)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(409);
    expect((retry.body as unknown as ErrorResponse).error.code).toBe(
      'IDEMPOTENCY_FAILED',
    );

    const secondSaleId = await createSale();
    await request(
      createLiveApp(
        new PaymentService(getDatabase(), { failAfterSaleUpdate: true }),
      ),
    )
      .post(`/api/v1/sales/${secondSaleId}/payment`)
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}rollback-after-update`)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(500);

    await expect(
      getDatabase()('sales')
        .select('status')
        .where('sale_id', secondSaleId)
        .first<SaleRow>(),
    ).resolves.toMatchObject({ status: 'PENDING' });
    const secondPaymentCount = await getDatabase()('payments')
      .where('sale_id', secondSaleId)
      .count<CountRow>({ count: '*' })
      .first();
    expect(Number(secondPaymentCount?.count)).toBe(0);
    const secondKey = `${TEST_KEY_PREFIX}rollback-after-update`;
    await expect(
      getDatabase()<IdempotencyRow>('idempotency_keys')
        .select('status')
        .where('key', secondKey)
        .first(),
    ).resolves.toEqual({ status: 'FAILED' });
    const secondRetry = await request(createLiveApp())
      .post(`/api/v1/sales/${secondSaleId}/payment`)
      .set('Idempotency-Key', secondKey)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(409);
    expect((secondRetry.body as unknown as ErrorResponse).error.code).toBe(
      'IDEMPOTENCY_FAILED',
    );

    const thirdSaleId = await createSale();
    const thirdKey = `${TEST_KEY_PREFIX}rollback-after-idempotency`;
    await request(
      createLiveApp(
        new PaymentService(getDatabase(), {
          failAfterIdempotencySuccess: true,
        }),
      ),
    )
      .post(`/api/v1/sales/${thirdSaleId}/payment`)
      .set('Idempotency-Key', thirdKey)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(500);

    await expect(
      getDatabase()('sales')
        .select('status')
        .where('sale_id', thirdSaleId)
        .first<SaleRow>(),
    ).resolves.toMatchObject({ status: 'PENDING' });
    const thirdPaymentCount = await getDatabase()('payments')
      .where('sale_id', thirdSaleId)
      .count<CountRow>({ count: '*' })
      .first();
    expect(Number(thirdPaymentCount?.count)).toBe(0);
    await expect(
      getDatabase()<IdempotencyRow>('idempotency_keys')
        .select('status')
        .where('key', thirdKey)
        .first(),
    ).resolves.toEqual({ status: 'FAILED' });
    const thirdRetry = await request(createLiveApp())
      .post(`/api/v1/sales/${thirdSaleId}/payment`)
      .set('Idempotency-Key', thirdKey)
      .send({ payment_method: 'CASH', amount_received: 80 })
      .expect(409);
    expect((thirdRetry.body as unknown as ErrorResponse).error.code).toBe(
      'IDEMPOTENCY_FAILED',
    );
  });

  it('persists FAILED when a non-idempotency unique constraint rejects the Payment', async () => {
    const duplicatePaymentId = '99999999-9999-4999-8999-999999999999';
    const firstSaleId = await createSale();
    await new PaymentService(getDatabase(), {
      generatePaymentId: () => duplicatePaymentId,
    }).execute({
      saleId: firstSaleId,
      paymentMethod: 'CASH',
      amountReceived: 80,
      idempotencyKey: `${TEST_KEY_PREFIX}duplicate-payment-source`,
    });
    const secondSaleId = await createSale();
    const failedKey = `${TEST_KEY_PREFIX}duplicate-payment-target`;

    await expect(
      new PaymentService(getDatabase(), {
        generatePaymentId: () => duplicatePaymentId,
      }).execute({
        saleId: secondSaleId,
        paymentMethod: 'CASH',
        amountReceived: 80,
        idempotencyKey: failedKey,
      }),
    ).rejects.toBeDefined();

    await expect(
      getDatabase()<IdempotencyRow>('idempotency_keys')
        .select('status')
        .where('key', failedKey)
        .first(),
    ).resolves.toEqual({ status: 'FAILED' });

    await expect(
      new PaymentService(getDatabase()).execute({
        saleId: secondSaleId,
        paymentMethod: 'CASH',
        amountReceived: 80,
        idempotencyKey: failedKey,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'IDEMPOTENCY_FAILED',
    });
  });
});
