export const ERROR_CODES = {
  validation: 'VALIDATION_ERROR',
  malformedJson: 'MALFORMED_JSON',
  invalidProductCode: 'INVALID_PRODUCT_CODE',
  productNotFound: 'PRODUCT_NOT_FOUND',
  saleNotFound: 'SALE_NOT_FOUND',
  saleAlreadyPaid: 'SALE_ALREADY_PAID',
  saleCancelled: 'SALE_CANCELLED',
  insufficientCashAmount: 'INSUFFICIENT_CASH_AMOUNT',
  qrAmountMismatch: 'QR_AMOUNT_MISMATCH',
  unsupportedPaymentMethod: 'UNSUPPORTED_PAYMENT_METHOD',
  idempotencyKeyRequired: 'IDEMPOTENCY_KEY_REQUIRED',
  idempotencyKeyTooLong: 'IDEMPOTENCY_KEY_TOO_LONG',
  idempotencyConflict: 'IDEMPOTENCY_CONFLICT',
  idempotencyFailed: 'IDEMPOTENCY_FAILED',
  internalServerError: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class ApplicationError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
