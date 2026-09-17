import type { RequestHandler } from 'express';

import {
  ApplicationError,
  ERROR_CODES,
} from '../../application/errors/application-error.js';
import type {
  CreateSaleCommand,
  CreateSaleResult,
} from '../../application/services/create-sale-service.js';
import { toSaleResponseDto } from '../dtos/sale-response-dto.js';
import {
  createSaleBodySchema,
  productCodeSchema,
  type CreateSaleRequestDto,
} from '../validation/create-sale-request.js';
import { readIdempotencyKey } from '../validation/idempotency-key.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_CREATED = 201;
const HTTP_OK = 200;

export interface CreateSaleExecutor {
  execute(command: CreateSaleCommand): Promise<CreateSaleResult>;
}

export const createCreateSaleController = (
  service: CreateSaleExecutor,
): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      const idempotencyKey = readIdempotencyKey(
        request.get('Idempotency-Key'),
      );
      const parsedBody = createSaleBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        throw new ApplicationError(
          HTTP_BAD_REQUEST,
          ERROR_CODES.validation,
        );
      }

      if (!productCodeSchema.safeParse(parsedBody.data.product_code).success) {
        throw new ApplicationError(
          HTTP_BAD_REQUEST,
          ERROR_CODES.invalidProductCode,
        );
      }

      const requestDto: CreateSaleRequestDto = parsedBody.data;
      const result = await service.execute({
        productCode: requestDto.product_code,
        idempotencyKey,
      });

      response
        .status(result.created ? HTTP_CREATED : HTTP_OK)
        .json(toSaleResponseDto(result.sale));
    } catch (error: unknown) {
      next(error);
    }
  };
