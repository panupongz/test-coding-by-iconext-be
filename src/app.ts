import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import type { CreateSaleExecutor } from './http/controllers/create-sale-controller.js';
import type { PaymentExecutor } from './http/controllers/payment-controller.js';
import { createErrorHandler, notFoundHandler } from './http/middleware/error-handler.js';
import { createRequestLogger } from './http/middleware/request-logger.js';
import { createApiRouter } from './http/routes/api-routes.js';

const JSON_BODY_LIMIT = '100kb';

export const createApp = (
  logger: Logger,
  createSaleService: CreateSaleExecutor,
  paymentService?: PaymentExecutor,
): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: JSON_BODY_LIMIT, strict: true }));
  app.use(createRequestLogger(logger));
  app.use('/api/v1', createApiRouter(createSaleService, paymentService));
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
};
