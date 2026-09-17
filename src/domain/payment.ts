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
