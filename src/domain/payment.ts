export const PAYMENT_METHOD = {
  cash: 'CASH',
  qrPayment: 'QR_PAYMENT',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export interface PaymentView {
  readonly paymentId: string;
  readonly paymentMethod: PaymentMethod;
  readonly amountReceived: number;
  readonly change: number | null;
  readonly paidAt: Date;
}

export interface CashPaymentResponse {
  readonly payment_id: string;
  readonly payment_method: typeof PAYMENT_METHOD.cash;
  readonly amount_received: number;
  readonly paid_at: string;
  readonly change: number;
}

export interface QrPaymentResponse {
  readonly payment_id: string;
  readonly payment_method: typeof PAYMENT_METHOD.qrPayment;
  readonly amount_received: number;
  readonly paid_at: string;
}

export type PaymentResponse = CashPaymentResponse | QrPaymentResponse;

export const toPaymentResponse = (payment: PaymentView): PaymentResponse => {
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
