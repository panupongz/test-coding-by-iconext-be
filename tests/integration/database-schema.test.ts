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

const PRODUCT_CODE = 'P999';
const SALE_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_SALE_ID = '33333333-3333-4333-8333-333333333333';
const THIRD_SALE_ID = '55555555-5555-4555-8555-555555555555';
const PAYMENT_ID = '22222222-2222-4222-8222-222222222222';
const SECOND_PAYMENT_ID = '44444444-4444-4444-8444-444444444444';
const THIRD_PAYMENT_ID = '66666666-6666-4666-8666-666666666666';
const IDEMPOTENCY_KEY = 'schema-test-payment';
const SECOND_IDEMPOTENCY_KEY = 'schema-test-failed';
const REQUEST_FINGERPRINT = 'a'.repeat(64);
const CREATED_AT = new Date('2026-09-17T00:00:00.000Z');
const EXPIRES_AT = new Date('2026-09-17T00:05:00.000Z');

interface ColumnMetadata {
  readonly TABLE_NAME: string;
  readonly COLUMN_NAME: string;
  readonly DATA_TYPE: string;
  readonly COLUMN_TYPE: string;
  readonly IS_NULLABLE: 'YES' | 'NO';
  readonly COLUMN_DEFAULT: string | null;
}

interface KeyMetadata {
  readonly TABLE_NAME: string;
  readonly COLUMN_NAME: string;
  readonly CONSTRAINT_NAME: string;
  readonly REFERENCED_TABLE_NAME: string | null;
  readonly REFERENCED_COLUMN_NAME: string | null;
}

interface IndexMetadata {
  readonly TABLE_NAME: string;
  readonly INDEX_NAME: string;
  readonly COLUMN_NAME: string;
  readonly NON_UNIQUE: number;
}

interface ReferentialRuleMetadata {
  readonly CONSTRAINT_NAME: string;
  readonly UPDATE_RULE: string;
  readonly DELETE_RULE: string;
}

interface CheckMetadata {
  readonly CONSTRAINT_NAME: string;
}

interface ProductIdRow {
  readonly id: number;
}

let database: Database | undefined;
let testTransaction: Knex.Transaction | undefined;
let databaseName = '';

const getDatabase = (): Database => {
  if (database === undefined) {
    throw new Error('Database test connection has not been initialized');
  }

  return database;
};

const getTestDatabase = (): Knex.Transaction => {
  if (testTransaction === undefined) {
    throw new Error('Database test transaction has not been initialized');
  }

  return testTransaction;
};

const insertValidFixtures = async (): Promise<void> => {
  const connection = getTestDatabase();

  const [productId] = await connection('products').insert({
    product_code: PRODUCT_CODE,
    name: 'Schema Test Product',
    description: 'Used only by the database schema integration test',
    image: `/products/${PRODUCT_CODE}.jpg`,
    price: 125,
  });

  await connection('sales').insert({
    sale_id: SALE_ID,
    product_id: productId,
    quantity: 1,
    unit_price: 125,
    status: 'PENDING',
    created_at: CREATED_AT,
    expires_at: EXPIRES_AT,
  });

  await connection('payments').insert({
    payment_id: PAYMENT_ID,
    sale_id: SALE_ID,
    payment_method: 'CASH',
    amount_received: 125,
    change: 0,
    paid_at: CREATED_AT,
  });

  await connection('idempotency_keys').insert({
    key: IDEMPOTENCY_KEY,
    request_fingerprint: REQUEST_FINGERPRINT,
    operation_type: 'PAYMENT',
    status: 'SUCCEEDED',
    payment_id: PAYMENT_ID,
  });
};

const getProductId = async (): Promise<number> => {
  const product = await getTestDatabase()<ProductIdRow>('products')
    .select('id')
    .where('product_code', PRODUCT_CODE)
    .first();

  if (product === undefined) {
    throw new Error('Expected the product fixture to exist');
  }

  return product.id;
};

const insertPendingSale = async (saleId: string): Promise<void> => {
  await getTestDatabase()('sales').insert({
    sale_id: saleId,
    product_id: await getProductId(),
    quantity: 1,
    unit_price: 125,
    status: 'PENDING',
    created_at: CREATED_AT,
    expires_at: EXPIRES_AT,
  });
};

describe.skipIf(!disposableDatabaseTestContextIsConfigured)('T-002 database schema', () => {
  beforeAll(async () => {
    const config = loadConfig();
    databaseName = config.database.name;
    database = createDatabase(config.database);

    await database.migrate.latest({
      directory: resolve(import.meta.dirname, '../../src/database/migrations'),
      loadExtensions: ['.ts'],
    });
  });

  beforeEach(async () => {
    testTransaction = await getDatabase().transaction();
    await insertValidFixtures();
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

  it('creates the required tables, columns, data types, nullability, and defaults', async () => {
    const rows = await getTestDatabase()<ColumnMetadata>(
      'information_schema.COLUMNS',
    )
      .select(
        'TABLE_NAME',
        'COLUMN_NAME',
        'DATA_TYPE',
        'COLUMN_TYPE',
        'IS_NULLABLE',
        'COLUMN_DEFAULT',
      )
      .where('TABLE_SCHEMA', databaseName)
      .whereIn('TABLE_NAME', [
        'products',
        'sales',
        'payments',
        'idempotency_keys',
      ]);

    const columns = new Map(
      rows.map((row) => [`${row.TABLE_NAME}.${row.COLUMN_NAME}`, row]),
    );

    expect([...columns.keys()].sort()).toEqual(
      [
        'idempotency_keys.created_at',
        'idempotency_keys.id',
        'idempotency_keys.key',
        'idempotency_keys.operation_type',
        'idempotency_keys.payment_id',
        'idempotency_keys.request_fingerprint',
        'idempotency_keys.sale_id',
        'idempotency_keys.status',
        'idempotency_keys.updated_at',
        'payments.amount_received',
        'payments.change',
        'payments.paid_at',
        'payments.payment_id',
        'payments.payment_method',
        'payments.sale_id',
        'products.deleted_at',
        'products.description',
        'products.id',
        'products.image',
        'products.name',
        'products.price',
        'products.product_code',
        'sales.created_at',
        'sales.expires_at',
        'sales.product_id',
        'sales.quantity',
        'sales.sale_id',
        'sales.status',
        'sales.unit_price',
      ].sort(),
    );

    expect(columns.get('products.price')).toMatchObject({
      DATA_TYPE: 'int',
      COLUMN_TYPE: 'int unsigned',
      IS_NULLABLE: 'NO',
    });
    expect(columns.get('products.deleted_at')).toMatchObject({
      DATA_TYPE: 'datetime',
      IS_NULLABLE: 'YES',
    });
    expect(columns.get('sales.quantity')).toMatchObject({
      DATA_TYPE: 'tinyint',
      COLUMN_DEFAULT: '1',
      IS_NULLABLE: 'NO',
    });
    expect(columns.get('sales.status')).toMatchObject({
      DATA_TYPE: 'enum',
      COLUMN_TYPE: "enum('PENDING','PAID','CANCELLED')",
      COLUMN_DEFAULT: 'PENDING',
    });
    expect(columns.get('payments.amount_received')).toMatchObject({
      DATA_TYPE: 'int',
      COLUMN_TYPE: 'int unsigned',
    });
    expect(columns.get('payments.change')).toMatchObject({
      DATA_TYPE: 'int',
      IS_NULLABLE: 'YES',
    });
    expect(columns.get('payments.payment_method')).toMatchObject({
      DATA_TYPE: 'enum',
      COLUMN_TYPE: "enum('CASH','QR_PAYMENT')",
      IS_NULLABLE: 'NO',
    });
    expect(columns.has('sales.deleted_at')).toBe(false);
    expect(columns.has('payments.deleted_at')).toBe(false);
  });

  it('creates the required primary keys, foreign keys, and non-cascading rules', async () => {
    const rows = await getTestDatabase()<KeyMetadata>(
      'information_schema.KEY_COLUMN_USAGE',
    )
      .select(
        'TABLE_NAME',
        'COLUMN_NAME',
        'CONSTRAINT_NAME',
        'REFERENCED_TABLE_NAME',
        'REFERENCED_COLUMN_NAME',
      )
      .where('CONSTRAINT_SCHEMA', databaseName)
      .whereIn('TABLE_NAME', [
        'products',
        'sales',
        'payments',
        'idempotency_keys',
      ]);

    const primaryKeys = rows
      .filter((row) => row.CONSTRAINT_NAME === 'PRIMARY')
      .map((row) => `${row.TABLE_NAME}.${row.COLUMN_NAME}`)
      .sort();
    const foreignKeys = rows
      .filter((row) => row.REFERENCED_TABLE_NAME !== null)
      .map(
        (row) =>
          `${row.TABLE_NAME}.${row.COLUMN_NAME}->${String(row.REFERENCED_TABLE_NAME)}.${String(row.REFERENCED_COLUMN_NAME)}`,
      )
      .sort();

    expect(primaryKeys).toEqual([
      'idempotency_keys.id',
      'payments.payment_id',
      'products.id',
      'sales.sale_id',
    ]);
    expect(foreignKeys).toEqual([
      'idempotency_keys.payment_id->payments.payment_id',
      'idempotency_keys.sale_id->sales.sale_id',
      'payments.sale_id->sales.sale_id',
      'sales.product_id->products.id',
    ]);

    const rules = await getTestDatabase()<ReferentialRuleMetadata>(
      'information_schema.REFERENTIAL_CONSTRAINTS',
    )
      .select('CONSTRAINT_NAME', 'UPDATE_RULE', 'DELETE_RULE')
      .where('CONSTRAINT_SCHEMA', databaseName)
      .whereIn('CONSTRAINT_NAME', [
        'fk_sales_product',
        'fk_payments_sale',
        'fk_idempotency_keys_sale',
        'fk_idempotency_keys_payment',
      ]);

    expect(rules).toHaveLength(4);
    expect(rules).toEqual(
      expect.arrayContaining(
        rules.map((rule) => ({
          ...rule,
          UPDATE_RULE: 'NO ACTION',
          DELETE_RULE: 'NO ACTION',
        })),
      ),
    );
  });

  it('creates the required named unique indexes and supporting relationship indexes', async () => {
    const rows = await getTestDatabase()<IndexMetadata>(
      'information_schema.STATISTICS',
    )
      .select('TABLE_NAME', 'INDEX_NAME', 'COLUMN_NAME', 'NON_UNIQUE')
      .where('TABLE_SCHEMA', databaseName)
      .whereIn('INDEX_NAME', [
        'uq_products_product_code',
        'uq_payments_sale_id',
        'uq_idempotency_keys_key',
        'idx_sales_product_id',
        'idx_idempotency_keys_sale_id',
        'idx_idempotency_keys_payment_id',
      ]);

    expect(
      rows.map(
        (row) =>
          `${row.TABLE_NAME}.${row.INDEX_NAME}.${row.COLUMN_NAME}.${String(row.NON_UNIQUE)}`,
      ),
    ).toEqual(
      expect.arrayContaining([
        'products.uq_products_product_code.product_code.0',
        'payments.uq_payments_sale_id.sale_id.0',
        'idempotency_keys.uq_idempotency_keys_key.key.0',
        'sales.idx_sales_product_id.product_id.1',
        'idempotency_keys.idx_idempotency_keys_sale_id.sale_id.1',
        'idempotency_keys.idx_idempotency_keys_payment_id.payment_id.1',
      ]),
    );
  });

  it('accepts valid relational data and a FAILED idempotency record without a resource', async () => {
    await expect(
      getTestDatabase()('idempotency_keys').insert({
        key: SECOND_IDEMPOTENCY_KEY,
        request_fingerprint: 'b'.repeat(64),
        operation_type: 'CREATE_SALE',
        status: 'FAILED',
      }),
    ).resolves.toBeDefined();

    await expect(
      getTestDatabase()('idempotency_keys')
        .whereIn('key', [IDEMPOTENCY_KEY, SECOND_IDEMPOTENCY_KEY])
        .count<{ count: number }>({ count: '*' })
        .first(),
    ).resolves.toMatchObject({ count: 2 });
  });

  it('rejects duplicate product codes, payment sale references, and idempotency keys', async () => {
    await expect(
      getTestDatabase()('products').insert({
        product_code: PRODUCT_CODE,
        name: 'Duplicate',
        description: 'Duplicate product code',
        image: `/products/${PRODUCT_CODE}.jpg`,
        price: 100,
      }),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });

    await expect(
      getTestDatabase()('payments').insert({
        payment_id: SECOND_PAYMENT_ID,
        sale_id: SALE_ID,
        payment_method: 'QR_PAYMENT',
        amount_received: 125,
        change: null,
        paid_at: CREATED_AT,
      }),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });

    await expect(
      getTestDatabase()('idempotency_keys').insert({
        key: IDEMPOTENCY_KEY,
        request_fingerprint: 'b'.repeat(64),
        operation_type: 'CANCEL',
        status: 'FAILED',
      }),
    ).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
  });

  it('rejects orphan sale, payment, and idempotency resource references', async () => {
    await expect(
      getTestDatabase()('sales').insert({
        sale_id: SECOND_SALE_ID,
        product_id: 9_999_999_999,
        quantity: 1,
        unit_price: 125,
        status: 'PENDING',
        created_at: CREATED_AT,
        expires_at: EXPIRES_AT,
      }),
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });

    await expect(
      getTestDatabase()('payments').insert({
        payment_id: SECOND_PAYMENT_ID,
        sale_id: SECOND_SALE_ID,
        payment_method: 'QR_PAYMENT',
        amount_received: 125,
        change: null,
        paid_at: CREATED_AT,
      }),
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });

    await expect(
      getTestDatabase()('idempotency_keys').insert({
        key: SECOND_IDEMPOTENCY_KEY,
        request_fingerprint: 'b'.repeat(64),
        operation_type: 'CANCEL',
        status: 'SUCCEEDED',
        sale_id: SECOND_SALE_ID,
      }),
    ).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  });

  it('accepts QR_PAYMENT with null change and rejects unsupported payment methods', async () => {
    await insertPendingSale(SECOND_SALE_ID);

    await expect(
      getTestDatabase()('payments').insert({
        payment_id: SECOND_PAYMENT_ID,
        sale_id: SECOND_SALE_ID,
        payment_method: 'QR_PAYMENT',
        amount_received: 125,
        change: null,
        paid_at: CREATED_AT,
      }),
    ).resolves.toBeDefined();

    await expect(
      getTestDatabase()('payments')
        .select('payment_method', 'change')
        .where('payment_id', SECOND_PAYMENT_ID)
        .first(),
    ).resolves.toMatchObject({
      payment_method: 'QR_PAYMENT',
      change: null,
    });

    await insertPendingSale(THIRD_SALE_ID);

    await expect(
      getTestDatabase()('payments').insert({
        payment_id: THIRD_PAYMENT_ID,
        sale_id: THIRD_SALE_ID,
        payment_method: 'CARD',
        amount_received: 125,
        change: null,
        paid_at: CREATED_AT,
      }),
    ).rejects.toMatchObject({ code: 'WARN_DATA_TRUNCATED' });
  });

  it('enforces sale status, fixed quantity, product paths, payment change, and idempotency result rules', async () => {
    const product = await getTestDatabase()<ProductIdRow>('products')
      .select('id')
      .where('product_code', PRODUCT_CODE)
      .first();

    if (product === undefined) {
      throw new Error('Expected the product fixture to exist');
    }

    await expect(
      getTestDatabase()('sales').insert({
        sale_id: SECOND_SALE_ID,
        product_id: product.id,
        quantity: 1,
        unit_price: 125,
        status: 'UNKNOWN',
        created_at: CREATED_AT,
        expires_at: EXPIRES_AT,
      }),
    ).rejects.toBeDefined();

    await expect(
      getTestDatabase()('sales').insert({
        sale_id: SECOND_SALE_ID,
        product_id: product.id,
        quantity: 2,
        unit_price: 125,
        status: 'PENDING',
        created_at: CREATED_AT,
        expires_at: EXPIRES_AT,
      }),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });

    await expect(
      getTestDatabase()('products').insert({
        product_code: 'P998',
        name: 'Bad Image',
        description: 'Image is not a relative product path',
        image: 'https://example.com/products/P998.jpg',
        price: 100,
      }),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });

    await insertPendingSale(SECOND_SALE_ID);

    let paymentConstraintError: unknown;

    try {
      await getTestDatabase()('payments').insert({
        payment_id: SECOND_PAYMENT_ID,
        sale_id: SECOND_SALE_ID,
        payment_method: 'QR_PAYMENT',
        amount_received: 125,
        change: 0,
        paid_at: CREATED_AT,
      });
    } catch (error: unknown) {
      paymentConstraintError = error;
    }

    expect(paymentConstraintError).toBeInstanceOf(Error);

    const mysqlError = paymentConstraintError as Error & {
      readonly code?: unknown;
      readonly sqlMessage?: unknown;
    };

    expect(mysqlError.code).toBe('ER_CHECK_CONSTRAINT_VIOLATED');

    if (typeof mysqlError.sqlMessage !== 'string') {
      throw new Error('Expected MySQL to report the violated constraint name');
    }

    expect(mysqlError.sqlMessage).toContain('chk_payments_change_by_method');

    await expect(
      getTestDatabase()('idempotency_keys').insert({
        key: SECOND_IDEMPOTENCY_KEY,
        request_fingerprint: 'b'.repeat(64),
        operation_type: 'CREATE_SALE',
        status: 'SUCCEEDED',
      }),
    ).rejects.toMatchObject({ code: 'ER_CHECK_CONSTRAINT_VIOLATED' });
  });

  it('installs the explicit check constraints used for database-level integrity', async () => {
    const rows = await getTestDatabase()<CheckMetadata>(
      'information_schema.CHECK_CONSTRAINTS',
    )
      .select('CONSTRAINT_NAME')
      .where('CONSTRAINT_SCHEMA', databaseName);

    expect(rows.map((row) => row.CONSTRAINT_NAME)).toEqual(
      expect.arrayContaining([
        'chk_products_product_code_format',
        'chk_products_price_positive',
        'chk_products_image_relative_path',
        'chk_sales_sale_id_uuid',
        'chk_sales_quantity_one',
        'chk_sales_unit_price_positive',
        'chk_sales_expiration_after_creation',
        'chk_payments_payment_id_uuid',
        'chk_payments_amount_received_positive',
        'chk_payments_change_by_method',
        'chk_idempotency_keys_key_not_empty',
        'chk_idempotency_keys_fingerprint_sha256',
        'chk_idempotency_keys_resource_by_status',
        'chk_idempotency_keys_resource_by_operation',
      ]),
    );
  });
});
