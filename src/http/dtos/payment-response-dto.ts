import {
  PAYMENT_METHOD,
  type PaymentView,
} from '../../domain/payment.js';

export interface CashPaymentResponseDto {
  readonly payment_id: string;
  readonly payment_method: typeof PAYMENT_METHOD.cash;
  readonly amount_received: number;
  readonly paid_at: string;
  readonly change: number;
}

export interface QrPaymentResponseDto {
  readonly payment_id: string;
  readonly payment_method: typeof PAYMENT_METHOD.qrPayment;
  readonly amount_received: number;
  readonly paid_at: string;
}

export type PaymentResponseDto =
  | CashPaymentResponseDto
  | QrPaymentResponseDto;

export const toPaymentResponseDto = (
  payment: PaymentView,
): PaymentResponseDto => {
  const baseResponse = {
    payment_id: payment.paymentId,
    payment_method: payment.paymentMethod,
    amount_received: payment.amountReceived,
    paid_at: payment.paidAt.toISOString(),
  };

  if (payment.paymentMethod === PAYMENT_METHOD.cash) {
    if (payment.change === null) {
      throw new Error('Cash payment must include change');
    }

    return {
      ...baseResponse,
      payment_method: PAYMENT_METHOD.cash,
      change: payment.change,
    };
  }

  return {
    ...baseResponse,
    payment_method: PAYMENT_METHOD.qrPayment,
  };
};
