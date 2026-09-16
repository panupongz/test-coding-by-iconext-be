import knex, { type Knex } from 'knex';

import type { DatabaseConfig } from '../config/environment.js';

const DATABASE_POOL_MINIMUM = 0;
const DATABASE_POOL_MAXIMUM = 10;

export type Database = Knex;

export const createDatabase = (config: DatabaseConfig): Database =>
  knex({
    client: 'mysql2',
    connection: {
      host: config.host,
      port: config.port,
      database: config.name,
      user: config.user,
      password: config.password,
      timezone: 'Z',
    },
    pool: {
      min: DATABASE_POOL_MINIMUM,
      max: DATABASE_POOL_MAXIMUM,
    },
  });

export const probeDatabase = async (database: Database): Promise<void> => {
  await database.raw('SELECT 1');
};
