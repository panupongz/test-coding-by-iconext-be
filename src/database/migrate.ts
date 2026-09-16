import 'dotenv/config';

import { resolve } from 'node:path';

import { loadConfig } from '../config/environment.js';
import { createLogger } from '../infrastructure/logger.js';
import { createDatabase } from './connection.js';
import { listDatabaseRunnerFiles } from './runner-files.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);
const migrationsDirectory = resolve(import.meta.dirname, 'migrations');
const database = createDatabase(config.database);

try {
  const migrationFiles = await listDatabaseRunnerFiles(migrationsDirectory);

  if (migrationFiles.length === 0) {
    logger.info({ event: 'migrations_skipped' }, 'No database migrations exist yet');
  } else {
    await database.migrate.latest({
      directory: migrationsDirectory,
      loadExtensions: ['.js', '.ts'],
    });
    logger.info(
      { event: 'migrations_applied' },
      'Database migrations completed',
    );
  }
} finally {
  await database.destroy();
}
