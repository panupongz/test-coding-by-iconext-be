import 'dotenv/config';

import { resolve } from 'node:path';

import { loadConfig } from '../config/environment.js';
import { createLogger } from '../infrastructure/logger.js';
import { createDatabase } from './connection.js';
import { listDatabaseRunnerFiles } from './runner-files.js';

const config = loadConfig();
const logger = createLogger(config.logLevel);
const seedsDirectory = resolve(import.meta.dirname, 'seeds');
const database = createDatabase(config.database);

try {
  const seedFiles = await listDatabaseRunnerFiles(seedsDirectory);

  if (seedFiles.length === 0) {
    logger.info({ event: 'seeds_skipped' }, 'No database seeds exist yet');
  } else {
    const appliedSeeds = await database.seed.run({
      directory: seedsDirectory,
      loadExtensions: ['.js', '.ts'],
    });
    logger.info(
      { event: 'seeds_applied', appliedCount: appliedSeeds.length },
      'Database seeds completed',
    );
  }
} finally {
  await database.destroy();
}
