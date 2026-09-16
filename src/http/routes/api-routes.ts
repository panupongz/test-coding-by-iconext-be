import { Router } from 'express';

import {
  createCreateSaleController,
  type CreateSaleExecutor,
} from '../controllers/create-sale-controller.js';
import { pendingFeatureController } from '../controllers/pending-feature-controller.js';

export const createApiRouter = (createSaleService: CreateSaleExecutor): Router => {
  const router = Router();

  router.post('/sales', createCreateSaleController(createSaleService));
  router.post('/sales/:sale_id/payment', pendingFeatureController);
  router.post('/sales/:sale_id/cancel', pendingFeatureController);

  return router;
};
