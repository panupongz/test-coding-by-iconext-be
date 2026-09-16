import { Router } from 'express';

import { pendingFeatureController } from '../controllers/pending-feature-controller.js';

export const createApiRouter = (): Router => {
  const router = Router();

  router.post('/sales', pendingFeatureController);
  router.post('/sales/:sale_id/payment', pendingFeatureController);
  router.post('/sales/:sale_id/cancel', pendingFeatureController);

  return router;
};
