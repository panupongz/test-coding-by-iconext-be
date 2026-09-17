import type { RequestHandler } from 'express';

import {
  ApplicationError,
  ERROR_CODES,
} from '../../application/errors/application-error.js';
import type {
  CancelSaleCommand,
  CancelSaleResult,
} from '../../application/services/cancel-sale-service.js';
import { toCancelledSaleResponseDto } from '../dtos/cancelled-sale-response-dto.js';
import { cancelSaleBodySchema } from '../validation/cancel-sale-request.js';
import { readIdempotencyKey } from '../validation/idempotency-key.js';
import { saleIdSchema } from '../validation/sale-id.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_OK = 200;

export interface CancelSaleExecutor {
  execute(command: CancelSaleCommand): Promise<CancelSaleResult>;
}

export const createCancelSaleController = (
  service: CancelSaleExecutor,
): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      const saleId = request.params.sale_id;

      if (
        typeof saleId !== 'string' ||
        !saleIdSchema.safeParse(saleId).success
      ) {
        throw new ApplicationError(
          HTTP_NOT_FOUND,
          ERROR_CODES.saleNotFound,
        );
      }

      const idempotencyKey = readIdempotencyKey(
        request.get('Idempotency-Key'),
      );

      if (!cancelSaleBodySchema.safeParse(request.body).success) {
        throw new ApplicationError(
          HTTP_BAD_REQUEST,
          ERROR_CODES.validation,
        );
      }

      const result = await service.execute({ saleId, idempotencyKey });

      response
        .status(HTTP_OK)
        .json(toCancelledSaleResponseDto(result.saleId));
    } catch (error: unknown) {
      next(error);
    }
  };
