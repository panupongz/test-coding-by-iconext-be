import { z } from 'zod';

import {
  ApplicationError,
  ERROR_CODES,
} from '../../application/errors/application-error.js';
import { PAYMENT_METHOD, type PaymentMethod } from '../../domain/payment.js';

const HTTP_BAD_REQUEST = 400;

export const paymentBodySchema = z
  .object({
    payment_method: z.string(),
    amount_received: z.number().int().positive(),
  })
  .strict();

export type PaymentRequestDto = z.infer<typeof paymentBodySchema>;

export const parsePaymentMethod = (paymentMethod: string): PaymentMethod => {
  if (
    paymentMethod === PAYMENT_METHOD.cash ||
    paymentMethod === PAYMENT_METHOD.qrPayment
  ) {
    return paymentMethod;
  }

  throw new ApplicationError(
    HTTP_BAD_REQUEST,
    ERROR_CODES.unsupportedPaymentMethod,
  );
};
