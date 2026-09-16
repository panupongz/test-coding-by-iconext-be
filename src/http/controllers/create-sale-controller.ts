import type { RequestHandler } from 'express';
import { z } from 'zod';

import {
  ApplicationError,
  ERROR_CODES,
} from '../../application/errors/application-error.js';
import type {
  CreateSaleCommand,
  CreateSaleResult,
} from '../../application/services/create-sale-service.js';
import { readIdempotencyKey } from '../validation/idempotency-key.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_CREATED = 201;
const HTTP_OK = 200;

const productCodeSchema = z.string().regex(/^P\d{3}$/);
const createSaleBodySchema = z
  .object({
    product_code: z.string(),
  })
  .strict();

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
          'ข้อมูลคำขอไม่ถูกต้อง',
        );
      }

      if (!productCodeSchema.safeParse(parsedBody.data.product_code).success) {
        throw new ApplicationError(
          HTTP_BAD_REQUEST,
          ERROR_CODES.invalidProductCode,
          'รหัสสินค้าต้องอยู่ในรูปแบบ P ตามด้วยตัวเลข 3 หลัก',
        );
      }

      const result = await service.execute({
        productCode: parsedBody.data.product_code,
        idempotencyKey,
      });

      response.status(result.created ? HTTP_CREATED : HTTP_OK).json(result.sale);
    } catch (error: unknown) {
      next(error);
    }
  };
