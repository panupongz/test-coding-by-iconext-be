import type { Knex } from 'knex';

const TABLE_ENGINE = 'InnoDB';
const TABLE_CHARACTER_SET = 'utf8mb4';
const TABLE_COLLATION = 'utf8mb4_0900_ai_ci';
const BINARY_COLLATION = 'utf8mb4_bin';
const TIMESTAMP_PRECISION = 3;

const configureTable = (table: Knex.CreateTableBuilder): void => {
  table.engine(TABLE_ENGINE);
  table.charset(TABLE_CHARACTER_SET);
  table.collate(TABLE_COLLATION);
};

export const up = async (database: Knex): Promise<void> => {
  await database.schema.createTable('products', (table) => {
    configureTable(table);

    table.bigIncrements('id').primary();
    table.string('product_code', 4).notNullable();
    table.string('name', 255).notNullable();
    table.text('description').notNullable();
    table.string('image', 255).notNullable();
    table.integer('price').unsigned().notNullable();
    table.dateTime('deleted_at', { precision: TIMESTAMP_PRECISION }).nullable();

    table.unique(['product_code'], {
      indexName: 'uq_products_product_code',
    });
    table.check(
      "`product_code` REGEXP '^P[0-9]{3}$'",
      {},
      'chk_products_product_code_format',
    );
    table.check('`price` > 0', {}, 'chk_products_price_positive');
    table.check(
      "`image` = CONCAT('/products/', `product_code`, '.jpg')",
      {},
      'chk_products_image_relative_path',
    );
  });

  await database.schema.createTable('sales', (table) => {
    configureTable(table);

    table.string('sale_id', 36).notNullable();
    table.bigInteger('product_id').unsigned().notNullable();
    table.tinyint('quantity').unsigned().notNullable().defaultTo(1);
    table.integer('unit_price').unsigned().notNullable();
    table
      .enu('status', ['PENDING', 'PAID', 'CANCELLED'], {
        useNative: true,
        enumName: 'sale_status',
      })
      .notNullable()
      .defaultTo('PENDING');
    table
      .dateTime('created_at', { precision: TIMESTAMP_PRECISION })
      .notNullable()
      .defaultTo(database.fn.now(TIMESTAMP_PRECISION));
    table
      .dateTime('expires_at', { precision: TIMESTAMP_PRECISION })
      .notNullable();

    table.primary(['sale_id']);
    table.index(['product_id'], 'idx_sales_product_id');
    table
      .foreign('product_id', 'fk_sales_product')
      .references('id')
      .inTable('products');
    table.check(
      "`sale_id` REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'",
      {},
      'chk_sales_sale_id_uuid',
    );
    table.check('`quantity` = 1', {}, 'chk_sales_quantity_one');
    table.check('`unit_price` > 0', {}, 'chk_sales_unit_price_positive');
    table.check(
      '`expires_at` > `created_at`',
      {},
      'chk_sales_expiration_after_creation',
    );
  });

  await database.schema.createTable('payments', (table) => {
    configureTable(table);

    table.string('payment_id', 36).notNullable();
    table.string('sale_id', 36).notNullable();
    table
      .enu('payment_method', ['CASH', 'QR_PAYMENT'], {
        useNative: true,
        enumName: 'payment_method',
      })
      .notNullable();
    table.integer('amount_received').unsigned().notNullable();
    table.integer('change').unsigned().nullable();
    table
      .dateTime('paid_at', { precision: TIMESTAMP_PRECISION })
      .notNullable()
      .defaultTo(database.fn.now(TIMESTAMP_PRECISION));

    table.primary(['payment_id']);
    table.unique(['sale_id'], { indexName: 'uq_payments_sale_id' });
    table
      .foreign('sale_id', 'fk_payments_sale')
      .references('sale_id')
      .inTable('sales');
    table.check(
      "`payment_id` REGEXP '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'",
      {},
      'chk_payments_payment_id_uuid',
    );
    table.check(
      '`amount_received` > 0',
      {},
      'chk_payments_amount_received_positive',
    );
    table.check(
      "(`payment_method` = 'CASH' AND `change` IS NOT NULL) OR (`payment_method` = 'QR_PAYMENT' AND `change` IS NULL)",
      {},
      'chk_payments_change_by_method',
    );
  });

  await database.schema.createTable('idempotency_keys', (table) => {
    configureTable(table);

    table.bigIncrements('id').primary();
    table.string('key', 255).collate(BINARY_COLLATION).notNullable();
    table
      .string('request_fingerprint', 64)
      .collate(BINARY_COLLATION)
      .notNullable();
    table
      .enu('operation_type', ['CREATE_SALE', 'PAYMENT', 'CANCEL'], {
        useNative: true,
        enumName: 'idempotency_operation_type',
      })
      .notNullable();
    table
      .enu('status', ['PROCESSING', 'SUCCEEDED', 'FAILED'], {
        useNative: true,
        enumName: 'idempotency_status',
      })
      .notNullable()
      .defaultTo('PROCESSING');
    table.string('sale_id', 36).nullable();
    table.string('payment_id', 36).nullable();
    table
      .dateTime('created_at', { precision: TIMESTAMP_PRECISION })
      .notNullable()
      .defaultTo(database.fn.now(TIMESTAMP_PRECISION));
    table
      .dateTime('updated_at', { precision: TIMESTAMP_PRECISION })
      .notNullable()
      .defaultTo(database.fn.now(TIMESTAMP_PRECISION));

    table.unique(['key'], { indexName: 'uq_idempotency_keys_key' });
    table.index(['sale_id'], 'idx_idempotency_keys_sale_id');
    table.index(['payment_id'], 'idx_idempotency_keys_payment_id');
    table
      .foreign('sale_id', 'fk_idempotency_keys_sale')
      .references('sale_id')
      .inTable('sales');
    table
      .foreign('payment_id', 'fk_idempotency_keys_payment')
      .references('payment_id')
      .inTable('payments');
    table.check(
      'CHAR_LENGTH(`key`) > 0',
      {},
      'chk_idempotency_keys_key_not_empty',
    );
    table.check(
      "`request_fingerprint` REGEXP '^[0-9a-f]{64}$'",
      {},
      'chk_idempotency_keys_fingerprint_sha256',
    );
    table.check(
      "((`status` = 'SUCCEEDED') AND ((`sale_id` IS NOT NULL AND `payment_id` IS NULL) OR (`sale_id` IS NULL AND `payment_id` IS NOT NULL))) OR ((`status` IN ('PROCESSING', 'FAILED')) AND `sale_id` IS NULL AND `payment_id` IS NULL)",
      {},
      'chk_idempotency_keys_resource_by_status',
    );
    table.check(
      "`operation_type` = 'PAYMENT' OR `payment_id` IS NULL",
      {},
      'chk_idempotency_keys_resource_by_operation',
    );
  });
};

export const down = async (database: Knex): Promise<void> => {
  await database.schema.dropTableIfExists('idempotency_keys');
  await database.schema.dropTableIfExists('payments');
  await database.schema.dropTableIfExists('sales');
  await database.schema.dropTableIfExists('products');
};
