import { resolve } from 'node:path';

import type { Knex } from 'knex';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import { loadConfig } from '../../src/config/environment.js';
import {
  createDatabase,
  type Database,
} from '../../src/database/connection.js';
import {
  PRODUCT_SEED_DEFINITIONS,
  ProductSeedConflictError,
  seed,
} from '../../src/database/seeds/202609170001_seed_products.js';
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
const PRODUCT_CODES = PRODUCT_SEED_DEFINITIONS.map(
  ({ product_code }) => product_code,
);

interface StoredProduct {
  readonly id: number;
  readonly product_code: string;
  readonly name: string;
  readonly description: string;
  readonly image: string;
  readonly price: number;
  readonly deleted_at: Date | null;
}

let database: Database | undefined;
let testTransaction: Knex.Transaction | undefined;

const getDatabase = (): Database => {
  if (database === undefined) {
    throw new Error('Product seed test connection has not been initialized');
  }

  return database;
};

const getTestDatabase = (): Knex.Transaction => {
  if (testTransaction === undefined) {
    throw new Error('Product seed test transaction has not been initialized');
  }

  return testTransaction;
};

const readSeededProducts = async (): Promise<StoredProduct[]> =>
  getTestDatabase()<StoredProduct>('products')
    .select(
      'id',
      'product_code',
      'name',
      'description',
      'image',
      'price',
      'deleted_at',
    )
    .whereIn('product_code', PRODUCT_CODES)
    .orderBy('product_code');

describe.skipIf(!disposableDatabaseTestContextIsConfigured)('T-003 product seed', () => {
  beforeAll(async () => {
    const config = loadConfig();
    database = createDatabase(config.database);

    await database.migrate.latest({
      directory: resolve(import.meta.dirname, '../../src/database/migrations'),
      loadExtensions: ['.ts'],
    });
  });

  beforeEach(async () => {
    testTransaction = await getDatabase().transaction();
    await testTransaction('products')
      .whereIn('product_code', PRODUCT_CODES)
      .delete();
  });

  afterEach(async () => {
    if (testTransaction !== undefined && !testTransaction.isCompleted()) {
      await testTransaction.rollback();
    }

    testTransaction = undefined;
  });

  afterAll(async () => {
    if (database !== undefined) {
      await database.destroy();
    }
  });

  it('creates exactly the five canonical products with integer THB prices and relative images', async () => {
    await seed(getTestDatabase());

    const products = await readSeededProducts();

    expect(products).toHaveLength(PRODUCT_SEED_DEFINITIONS.length);
    expect(
      products.map(
        ({ product_code, name, description, image, price }) => ({
          product_code,
          name,
          description,
          image,
          price,
        }),
      ),
    ).toEqual(PRODUCT_SEED_DEFINITIONS);
    expect(products.every(({ deleted_at }) => deleted_at === null)).toBe(true);
    expect(
      products.every(
        ({ product_code, image, price }) =>
          Number.isInteger(price) &&
          price > 0 &&
          image === `/products/${product_code}.jpg`,
      ),
    ).toBe(true);
  });

  it('is a no-op when the canonical seed data already exists', async () => {
    await seed(getTestDatabase());
    const firstSnapshot = await readSeededProducts();

    await seed(getTestDatabase());
    const secondSnapshot = await readSeededProducts();

    expect(secondSnapshot).toEqual(firstSnapshot);
  });

  it('adds only missing canonical products when matching rows already exist', async () => {
    const [existingProduct] = PRODUCT_SEED_DEFINITIONS;

    if (existingProduct === undefined) {
      throw new Error('Expected at least one canonical product definition');
    }

    const [existingProductId] = await getTestDatabase()('products').insert(
      existingProduct,
    );

    await seed(getTestDatabase());

    const products = await readSeededProducts();
    expect(products).toHaveLength(PRODUCT_SEED_DEFINITIONS.length);
    expect(products.find(({ product_code }) => product_code === 'P001')?.id).toBe(
      existingProductId,
    );
  });

  it('rejects conflicting existing data without overwriting it or inserting missing products', async () => {
    const canonicalProduct = PRODUCT_SEED_DEFINITIONS[2];

    if (canonicalProduct === undefined) {
      throw new Error('Expected the P003 canonical product definition');
    }

    const conflictingProduct = {
      ...canonicalProduct,
      name: 'Changed Butter Croissant',
    };
    await getTestDatabase()('products').insert(conflictingProduct);

    await expect(seed(getTestDatabase())).rejects.toBeInstanceOf(
      ProductSeedConflictError,
    );

    const products = await readSeededProducts();
    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject(conflictingProduct);
  });
});
