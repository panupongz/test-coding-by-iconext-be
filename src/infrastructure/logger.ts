import pino, { type Logger } from 'pino';

import type { LogLevel } from '../config/environment.js';

const REDACTED_PATHS = [
  'password',
  '*.password',
  'database.password',
  'config.database.password',
  'req.headers.authorization',
] as const;

export const createLogger = (level: LogLevel): Logger =>
  pino({
    level,
    base: null,
    redact: {
      paths: [...REDACTED_PATHS],
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
