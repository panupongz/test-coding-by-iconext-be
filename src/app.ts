import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import { createErrorHandler, notFoundHandler } from './http/middleware/error-handler.js';
import { createRequestLogger } from './http/middleware/request-logger.js';
import { createApiRouter } from './http/routes/api-routes.js';

const JSON_BODY_LIMIT = '100kb';

export const createApp = (logger: Logger): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: JSON_BODY_LIMIT, strict: true }));
  app.use(createRequestLogger(logger));
  app.use('/api/v1', createApiRouter());
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
};
