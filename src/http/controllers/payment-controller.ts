import type { RequestHandler } from 'express';

import {
  ApplicationError,
  ERROR_CODES,
} from '../../application/errors/application-error.js';
import type {
  PaymentCommand,
  PaymentResult,
} from '../../application/services/payment-service.js';
import { toCancelledSaleResponseDto } from '../dtos/cancelled-sale-response-dto.js';
import { toPaymentResponseDto } from '../dtos/payment-response-dto.js';
import { readIdempotencyKey } from '../validation/idempotency-key.js';
import {
  parsePaymentMethod,
  paymentBodySchema,
  type PaymentRequestDto,
} from '../validation/payment-request.js';
import { saleIdSchema } from '../validation/sale-id.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CREATED = 201;
const HTTP_OK = 200;

export interface PaymentExecutor {
  execute(command: PaymentCommand): Promise<PaymentResult>;
}

export const createPaymentController = (
  service: PaymentExecutor,
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
      const parsedBody = paymentBodySchema.safeParse(request.body);

      if (!parsedBody.success) {
        throw new ApplicationError(
          HTTP_BAD_REQUEST,
          ERROR_CODES.validation,
        );
      }

      const requestDto: PaymentRequestDto = parsedBody.data;
      const result = await service.execute({
        saleId,
        paymentMethod: parsePaymentMethod(requestDto.payment_method),
        amountReceived: requestDto.amount_received,
        idempotencyKey,
      });

      if (result.kind === 'expired') {
        response
          .status(HTTP_OK)
          .json(toCancelledSaleResponseDto(result.saleId));
        return;
      }

      response
        .status(result.created ? HTTP_CREATED : HTTP_OK)
        .json(toPaymentResponseDto(result.payment));
    } catch (error: unknown) {
      next(error);
    }
  };
