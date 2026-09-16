import { setTimeout as delay } from 'node:timers/promises';

import type { Logger } from 'pino';

import type { DatabaseReadinessConfig } from '../config/environment.js';

export type DatabaseProbe = () => Promise<void>;
export type Sleep = (milliseconds: number) => Promise<void>;

export class DatabaseReadinessError extends Error {
  public constructor(maxAttempts: number) {
    super(`Database did not become ready after ${String(maxAttempts)} attempts`);
    this.name = 'DatabaseReadinessError';
  }
}

const getErrorType = (error: unknown): string =>
  error instanceof Error ? error.name : 'UnknownError';

export const waitForDatabase = async (
  probe: DatabaseProbe,
  config: DatabaseReadinessConfig,
  logger: Logger,
  sleep: Sleep = delay,
): Promise<void> => {
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    try {
      await probe();
      logger.info(
        { event: 'database_ready', attempt },
        'Database connection is ready',
      );
      return;
    } catch (error: unknown) {
      logger.warn(
        {
          event: 'database_not_ready',
          attempt,
          maxAttempts: config.maxAttempts,
          errorType: getErrorType(error),
        },
        'Database connection is not ready',
      );

      if (attempt < config.maxAttempts) {
        await sleep(config.retryDelayMs);
      }
    }
  }

  throw new DatabaseReadinessError(config.maxAttempts);
};
