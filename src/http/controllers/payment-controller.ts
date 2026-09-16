import type { RequestHandler } from 'express';
import { z } from 'zod';

import {
  ApplicationError,
  ERROR_CODES,
} from '../../application/errors/application-error.js';
import type {
  PaymentCommand,
  PaymentResult,
} from '../../application/services/payment-service.js';
import { PAYMENT_METHOD, type PaymentMethod } from '../../domain/payment.js';
import { readIdempotencyKey } from '../validation/idempotency-key.js';

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CREATED = 201;
const HTTP_OK = 200;

const uuidSchema = z.uuid();
const paymentBodySchema = z
  .object({
    payment_method: z.string(),
    amount_received: z.number().int().positive(),
  })
  .strict();

const parsePaymentMethod = (paymentMethod: string): PaymentMethod => {
  if (
    paymentMethod === PAYMENT_METHOD.cash ||
    paymentMethod === PAYMENT_METHOD.qrPayment
  ) {
    return paymentMethod;
  }

  throw new ApplicationError(
    HTTP_BAD_REQUEST,
    ERROR_CODES.unsupportedPaymentMethod,
    'ไม่รองรับวิธีชำระเงินนี้',
  );
};

export interface PaymentExecutor {
  execute(command: PaymentCommand): Promise<PaymentResult>;
}

export const createPaymentController = (
  service: PaymentExecutor,
): RequestHandler =>
  async (request, response, next): Promise<void> => {
    try {
      const saleId = request.params.sale_id;

      if (typeof saleId !== 'string' || !uuidSchema.safeParse(saleId).success) {
        throw new ApplicationError(
          HTTP_NOT_FOUND,
          ERROR_CODES.saleNotFound,
          'ไม่พบรายการขาย',
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
          'ข้อมูลคำขอไม่ถูกต้อง',
        );
      }

      const result = await service.execute({
        saleId,
        paymentMethod: parsePaymentMethod(parsedBody.data.payment_method),
        amountReceived: parsedBody.data.amount_received,
        idempotencyKey,
      });

      if (result.kind === 'expired') {
        response.status(HTTP_OK).json({
          sale_id: result.saleId,
          status: result.status,
        });
        return;
      }

      response
        .status(result.created ? HTTP_CREATED : HTTP_OK)
        .json(result.payment);
    } catch (error: unknown) {
      next(error);
    }
  };
