import { resolve } from 'node:path';

import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CreateSaleService } from '../../src/application/services/create-sale-service.js';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config/environment.js';
import { createDatabase, type Database } from '../../src/database/connection.js';
import { createLogger } from '../../src/infrastructure/logger.js';
import type { SaleResponse } from '../../src/domain/sale.js';
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
const TEST_KEY_PREFIX = 't004-';
const TEST_PRODUCTS = [
  {
    product_code: 'P901',
    name: 'T-004 Americano',
    description: 'Create Sale integration fixture',
    image: '/products/P901.jpg',
    price: 60,
  },
  {
    product_code: 'P902',
    name: 'T-004 Tea',
    description: 'Create Sale integration fixture',
    image: '/products/P902.jpg',
    price: 55,
  },
  {
    product_code: 'P903',
    name: 'T-004 Croissant',
    description: 'Create Sale integration fixture',
    image: '/products/P903.jpg',
    price: 65,
  },
  {
    product_code: 'P904',
    name: 'T-004 Sandwich',
    description: 'Create Sale integration fixture',
    image: '/products/P904.jpg',
    price: 75,
  },
  {
    product_code: 'P905',
    name: 'T-004 Water',
    description: 'Create Sale integration fixture',
    image: '/products/P905.jpg',
    price: 15,
  },
] as const;
const EXPECTED_RESPONSE_FIELDS = [
  'created_at',
  'expires_at',
  'name',
  'product_code',
  'quantity',
  'sale_id',
  'status',
  'total',
  'unit_price',
];

interface IdempotencyResourceRow {
  readonly sale_id: string | null;
}

interface StoredSaleRow {
  readonly unit_price: number;
  readonly quantity: number;
  readonly status: string;
  readonly created_at: Date;
  readonly expires_at: Date;
}

interface IdempotencyStatusRow {
  readonly status: string;
  readonly sale_id: string | null;
}

interface ErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

let database: Database | undefined;

const getDatabase = (): Database => {
  if (database === undefined) {
    throw new Error('Create Sale test database has not been initialized');
  }

  return database;
};

const cleanupTestRecords = async (): Promise<void> => {
  const connection = getDatabase();
  const resources = await connection<IdempotencyResourceRow>('idempotency_keys')
    .select('sale_id')
    .whereRaw('`key` LIKE ?', [`${TEST_KEY_PREFIX}%`]);
  const saleIds = resources
    .map(({ sale_id }) => sale_id)
    .filter((saleId): saleId is string => saleId !== null);

  await connection('idempotency_keys')
    .whereRaw('`key` LIKE ?', [`${TEST_KEY_PREFIX}%`])
    .delete();

  if (saleIds.length > 0) {
    await connection('sales').whereIn('sale_id', saleIds).delete();
  }
};

describe.skipIf(!disposableDatabaseTestContextIsConfigured)('T-004 Create Sale', () => {
  beforeAll(async () => {
    const config = loadConfig();
    database = createDatabase(config.database);

    await database.migrate.latest({
      directory: resolve(import.meta.dirname, '../../src/database/migrations'),
      loadExtensions: ['.ts'],
    });
    await cleanupTestRecords();
    await database('products').insert(TEST_PRODUCTS);
  });

  afterEach(async () => {
    await cleanupTestRecords();
  });

  afterAll(async () => {
    if (database !== undefined) {
      await cleanupTestRecords();
      await database('products')
        .whereIn(
          'product_code',
          TEST_PRODUCTS.map(({ product_code }) => product_code),
        )
        .delete();
      await database.destroy();
    }
  });

  const createLiveApp = (service = new CreateSaleService(getDatabase())) =>
    createApp(createLogger('silent'), service);

  it('creates a PENDING sale with a price snapshot and a five-minute expiry', async () => {
    const beforeRequest = Date.now();
    const response = await request(createLiveApp())
      .post('/api/v1/sales')
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}valid`)
      .send({ product_code: 'P901' })
      .expect(201);
    const afterRequest = Date.now();
    const responseBody = response.body as unknown as SaleResponse;

    expect(Object.keys(responseBody).sort()).toEqual(EXPECTED_RESPONSE_FIELDS);
    expect(responseBody).toMatchObject({
      product_code: 'P901',
      name: 'T-004 Americano',
      unit_price: 60,
      quantity: 1,
      total: 60,
      status: 'PENDING',
    });
    const createdAt = Date.parse(responseBody.created_at);
    const expiresAt = Date.parse(responseBody.expires_at);
    expect(createdAt).toBeGreaterThanOrEqual(beforeRequest);
    expect(createdAt).toBeLessThanOrEqual(afterRequest);
    expect(expiresAt - createdAt).toBe(5 * 60 * 1000);

    const storedSale = await getDatabase()('sales')
      .select('unit_price', 'quantity', 'status', 'created_at', 'expires_at')
      .where('sale_id', responseBody.sale_id)
      .first<StoredSaleRow>();
    expect(storedSale).toMatchObject({
      unit_price: 60,
      quantity: 1,
      status: 'PENDING',
    });

    const idempotency = await getDatabase()('idempotency_keys')
      .select('status', 'sale_id')
      .where('key', `${TEST_KEY_PREFIX}valid`)
      .first<IdempotencyStatusRow>();
    expect(idempotency).toMatchObject({
      status: 'SUCCEEDED',
      sale_id: responseBody.sale_id,
    });
  });

  it('returns the original sale on replay and keeps the snapshotted price', async () => {
    const key = `${TEST_KEY_PREFIX}snapshot`;
    const firstResponse = await request(createLiveApp())
      .post('/api/v1/sales')
      .set('Idempotency-Key', key)
      .send({ product_code: 'P902' })
      .expect(201);
    const firstBody = firstResponse.body as unknown as SaleResponse;

    await getDatabase()('products')
      .where('product_code', 'P902')
      .update({ price: 99 });

    try {
      const replayResponse = await request(createLiveApp())
        .post('/api/v1/sales')
        .set('Idempotency-Key', key)
        .send({ product_code: 'P902' })
        .expect(200);
      const replayBody = replayResponse.body as unknown as SaleResponse;

      expect(replayBody.sale_id).toBe(firstBody.sale_id);
      expect(replayBody.unit_price).toBe(55);
      expect(replayBody.total).toBe(55);
    } finally {
      await getDatabase()('products')
        .where('product_code', 'P902')
        .update({ price: 55 });
    }
  });

  it('allows the same product with a new key and rejects one key for a different request', async () => {
    const first = await request(createLiveApp())
      .post('/api/v1/sales')
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}same-product-a`)
      .send({ product_code: 'P903' })
      .expect(201);
    const second = await request(createLiveApp())
      .post('/api/v1/sales')
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}same-product-b`)
      .send({ product_code: 'P903' })
      .expect(201);
    const firstBody = first.body as unknown as SaleResponse;
    const secondBody = second.body as unknown as SaleResponse;

    expect(secondBody.sale_id).not.toBe(firstBody.sale_id);

    const conflict = await request(createLiveApp())
      .post('/api/v1/sales')
      .set('Idempotency-Key', `${TEST_KEY_PREFIX}same-product-a`)
      .send({ product_code: 'P904' })
      .expect(409);
    expect((conflict.body as unknown as ErrorResponse).error.code).toBe(
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('serializes concurrent same-key requests to one sale', async () => {
    const app = createLiveApp();
    const key = `${TEST_KEY_PREFIX}concurrent`;
    const responses = await Promise.all(
      Array.from({ length: 8 }, async () =>
        request(app)
          .post('/api/v1/sales')
          .set('Idempotency-Key', key)
          .send({ product_code: 'P904' }),
      ),
    );

    expect(responses.filter(({ status }) => status === 201)).toHaveLength(1);
    expect(responses.filter(({ status }) => status === 200)).toHaveLength(7);
    expect(
      new Set(
        responses.map(
          ({ body }) => (body as unknown as SaleResponse).sale_id,
        ),
      ),
    ).toHaveLength(1);

    const record = await getDatabase()('idempotency_keys')
      .select('sale_id')
      .where({ key })
      .first<IdempotencyResourceRow>();

    if (record.sale_id === null) {
      throw new Error('Expected concurrent idempotency record to reference a sale');
    }

    const saleCount = await getDatabase()('sales')
      .where('sale_id', record.sale_id)
      .count<{ count: number }>({ count: '*' })
      .first();
    expect(Number(saleCount?.count)).toBe(1);
  });

  it.each(['PAID', 'CANCELLED'] as const)(
    'returns current %s state for a successful replay',
    async (status) => {
      const key = `${TEST_KEY_PREFIX}current-${status.toLowerCase()}`;
      const first = await request(createLiveApp())
        .post('/api/v1/sales')
        .set('Idempotency-Key', key)
        .send({ product_code: 'P905' })
        .expect(201);
      const firstBody = first.body as unknown as SaleResponse;

      await getDatabase()('sales')
        .where('sale_id', firstBody.sale_id)
        .update({ status });

      const replay = await request(createLiveApp())
        .post('/api/v1/sales')
        .set('Idempotency-Key', key)
        .send({ product_code: 'P905' })
        .expect(200);
      expect((replay.body as unknown as SaleResponse).status).toBe(status);
    },
  );

  it('persists expiration when a successful Create Sale replay finds an expired pending sale', async () => {
    const key = `${TEST_KEY_PREFIX}expired-replay`;
    const now = new Date('2026-09-17T00:00:00.000Z');
    const first = await request(
      createLiveApp(new CreateSaleService(getDatabase(), { now: () => now })),
    )
      .post('/api/v1/sales')
      .set('Idempotency-Key', key)
      .send({ product_code: 'P905' })
      .expect(201);
    const firstBody = first.body as unknown as SaleResponse;

    const replay = await request(
      createLiveApp(
        new CreateSaleService(getDatabase(), {
          now: () => new Date(now.getTime() + 5 * 60 * 1000),
        }),
      ),
    )
      .post('/api/v1/sales')
      .set('Idempotency-Key', key)
      .send({ product_code: 'P905' })
      .expect(200);

    expect(replay.body).toMatchObject({
      sale_id: firstBody.sale_id,
      status: 'CANCELLED',
    });
    await expect(
      getDatabase()('sales')
        .select('status')
        .where('sale_id', firstBody.sale_id)
        .first<{ status: string }>(),
    ).resolves.toEqual({ status: 'CANCELLED' });
  });

  it('returns 404 for a missing product, remembers FAILED separately, and rejects retry', async () => {
    const key = `${TEST_KEY_PREFIX}missing-product`;
    const first = await request(createLiveApp())
      .post('/api/v1/sales')
      .set('Idempotency-Key', key)
      .send({ product_code: 'P999' })
      .expect(404);
    expect((first.body as unknown as ErrorResponse).error.code).toBe(
      'PRODUCT_NOT_FOUND',
    );

    const failedRecord = await getDatabase()('idempotency_keys')
      .select('status', 'sale_id')
      .where({ key })
      .first<IdempotencyStatusRow>();
    expect(failedRecord).toMatchObject({ status: 'FAILED', sale_id: null });

    const retry = await request(createLiveApp())
      .post('/api/v1/sales')
      .set('Idempotency-Key', key)
      .send({ product_code: 'P999' })
      .expect(409);
    expect((retry.body as unknown as ErrorResponse).error.code).toBe(
      'IDEMPOTENCY_FAILED',
    );
  });

  it('rolls back a failed sale insert before persisting FAILED in a separate transaction', async () => {
    const key = `${TEST_KEY_PREFIX}forced-db-failure`;
    const service = new CreateSaleService(getDatabase(), {
      generateSaleId: () => 'not-a-valid-uuid',
    });

    await expect(
      service.execute({ productCode: 'P901', idempotencyKey: key }),
    ).rejects.toBeDefined();

    const sales = await getDatabase()('sales')
      .where('sale_id', 'not-a-valid-uuid')
      .count<{ count: number }>({ count: '*' })
      .first();
    expect(Number(sales?.count)).toBe(0);
    await expect(
      getDatabase()('idempotency_keys')
        .select('status', 'sale_id')
        .where({ key })
        .first(),
    ).resolves.toMatchObject({ status: 'FAILED', sale_id: null });

    await expect(
      new CreateSaleService(getDatabase()).execute({
        productCode: 'P901',
        idempotencyKey: key,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'IDEMPOTENCY_FAILED',
    });
  });

  it('serializes a concurrent request through separate FAILED persistence', async () => {
    const key = `${TEST_KEY_PREFIX}concurrent-failure`;
    const service = new CreateSaleService(getDatabase(), {
      generateSaleId: () => 'not-a-valid-uuid',
    });

    const results = await Promise.allSettled([
      service.execute({ productCode: 'P901', idempotencyKey: key }),
      service.execute({ productCode: 'P901', idempotencyKey: key }),
    ]);

    expect(results.every(({ status }) => status === 'rejected')).toBe(true);
    await expect(
      getDatabase()('idempotency_keys')
        .select('status', 'sale_id')
        .where({ key })
        .first<IdempotencyStatusRow>(),
    ).resolves.toMatchObject({ status: 'FAILED', sale_id: null });
  });
});
