import type { RequestHandler } from 'express';
import { z } from 'zod';

import {
  ApplicationError,
  ERROR_CODES,
} from '../../application/errors/application-error.js';
import type {
  CancelSaleCommand,
  CancelSaleResult,
} from '../../application/services/cancel-sale-service.js';
import { readIdempotencyKey } from '../validation/idempotency-key.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_OK = 200;

const uuidSchema = z.uuid();

export interface CancelSaleExecutor {
  execute(command: CancelSaleCommand): Promise<CancelSaleResult>;
}

export const createCancelSaleController = (
  service: CancelSaleExecutor,
): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      const saleId = request.params.sale_id;

      if (typeof saleId !== 'string' || !uuidSchema.safeParse(saleId).success) {
        throw new ApplicationError(
          HTTP_NOT_FOUND,
          ERROR_CODES.saleNotFound,
        );
      }

      const idempotencyKey = readIdempotencyKey(
        request.get('Idempotency-Key'),
      );

      if (request.body !== undefined) {
        throw new ApplicationError(
          HTTP_BAD_REQUEST,
          ERROR_CODES.validation,
        );
      }

      const result = await service.execute({ saleId, idempotencyKey });

      response.status(HTTP_OK).json({
        sale_id: result.saleId,
        status: result.status,
      });
    } catch (error: unknown) {
      next(error);
    }
  };
