import 'dotenv/config';

import type { Server } from 'node:http';

import type { Express } from 'express';

import { createApp } from './app.js';
import { CreateSaleService } from './application/services/create-sale-service.js';
import { CancelSaleService } from './application/services/cancel-sale-service.js';
import { PaymentService } from './application/services/payment-service.js';
import { loadConfig } from './config/environment.js';
import { createDatabase, probeDatabase, type Database } from './database/connection.js';
import { waitForDatabase } from './database/readiness.js';
import { createLogger } from './infrastructure/logger.js';

const bootstrapLogger = createLogger('info');

const listen = async (app: Express, port: number): Promise<Server> =>
  new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      server.off('error', reject);
      resolve(server);
    });
    server.once('error', reject);
  });

const closeServer = async (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });

const registerShutdownHandlers = (
  server: Server,
  database: Database,
  logger: ReturnType<typeof createLogger>,
): void => {
  let shutdownStarted = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shutdownStarted) {
      return;
    }

    shutdownStarted = true;
    logger.info({ event: 'shutdown_started', signal }, 'Graceful shutdown started');

    try {
      await closeServer(server);
      await database.destroy();
      logger.info({ event: 'shutdown_completed' }, 'Graceful shutdown completed');
    } catch (error: unknown) {
      logger.error({ event: 'shutdown_failed', err: error }, 'Graceful shutdown failed');
      process.exitCode = 1;
    }
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
};

const main = async (): Promise<void> => {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);
  const database = createDatabase(config.database);

  try {
    await waitForDatabase(
      () => probeDatabase(database),
      config.databaseReadiness,
      logger,
    );

    const server = await listen(
      createApp(
        logger,
        new CreateSaleService(database),
        new PaymentService(database),
        new CancelSaleService(database),
      ),
      config.port,
    );
    registerShutdownHandlers(server, database, logger);
    logger.info(
      {
        event: 'server_started',
        port: config.port,
        nodeEnvironment: config.nodeEnvironment,
        timezone: config.timezone,
      },
      'HTTP server started',
    );
  } catch (error: unknown) {
    await database.destroy();
    throw error;
  }
};

try {
  await main();
} catch (error: unknown) {
  bootstrapLogger.fatal({ event: 'startup_failed', err: error }, 'Application startup failed');
  process.exitCode = 1;
}
