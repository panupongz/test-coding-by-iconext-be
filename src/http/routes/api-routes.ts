import { Router } from 'express';

import {
  createCreateSaleController,
  type CreateSaleExecutor,
} from '../controllers/create-sale-controller.js';
import {
  createCancelSaleController,
  type CancelSaleExecutor,
} from '../controllers/cancel-sale-controller.js';
import {
  createPaymentController,
  type PaymentExecutor,
} from '../controllers/payment-controller.js';
import { pendingFeatureController } from '../controllers/pending-feature-controller.js';

export const createApiRouter = (
  createSaleService: CreateSaleExecutor,
  paymentService?: PaymentExecutor,
  cancelSaleService?: CancelSaleExecutor,
): Router => {
  const router = Router();

  router.post('/sales', createCreateSaleController(createSaleService));
  router.post(
    '/sales/:sale_id/payment',
    paymentService === undefined
      ? pendingFeatureController
      : createPaymentController(paymentService),
  );
  router.post(
    '/sales/:sale_id/cancel',
    cancelSaleService === undefined
      ? pendingFeatureController
      : createCancelSaleController(cancelSaleService),
  );

  return router;
};
