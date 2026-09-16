import { Router } from 'express';

import {
  createCreateSaleController,
  type CreateSaleExecutor,
} from '../controllers/create-sale-controller.js';
import {
  createPaymentController,
  type PaymentExecutor,
} from '../controllers/payment-controller.js';
import { pendingFeatureController } from '../controllers/pending-feature-controller.js';

export const createApiRouter = (
  createSaleService: CreateSaleExecutor,
  paymentService?: PaymentExecutor,
): Router => {
  const router = Router();

  router.post('/sales', createCreateSaleController(createSaleService));
  router.post(
    '/sales/:sale_id/payment',
    paymentService === undefined
      ? pendingFeatureController
      : createPaymentController(paymentService),
  );
  router.post('/sales/:sale_id/cancel', pendingFeatureController);

  return router;
};
