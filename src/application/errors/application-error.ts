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

export const ERROR_MESSAGES = {
  [ERROR_CODES.validation]: 'ข้อมูลคำขอไม่ถูกต้อง',
  [ERROR_CODES.malformedJson]: 'รูปแบบ JSON ไม่ถูกต้อง',
  [ERROR_CODES.invalidProductCode]:
    'รหัสสินค้าต้องอยู่ในรูปแบบ P ตามด้วยตัวเลข 3 หลัก',
  [ERROR_CODES.productNotFound]: 'ไม่พบสินค้า',
  [ERROR_CODES.saleNotFound]: 'ไม่พบรายการขาย',
  [ERROR_CODES.saleAlreadyPaid]: 'รายการขายนี้ชำระเงินแล้ว',
  [ERROR_CODES.saleCancelled]: 'รายการขายนี้ถูกยกเลิกแล้ว',
  [ERROR_CODES.insufficientCashAmount]: 'จำนวนเงินสดไม่เพียงพอ',
  [ERROR_CODES.qrAmountMismatch]: 'ยอดชำระ QR ต้องเท่ากับยอดรวม',
  [ERROR_CODES.unsupportedPaymentMethod]: 'ไม่รองรับวิธีชำระเงินนี้',
  [ERROR_CODES.idempotencyKeyRequired]: 'กรุณาระบุ Idempotency-Key',
  [ERROR_CODES.idempotencyKeyTooLong]:
    'Idempotency-Key ต้องยาวไม่เกิน 255 ตัวอักษร',
  [ERROR_CODES.idempotencyConflict]:
    'Idempotency-Key นี้ขัดแย้งกับคำขอเดิม',
  [ERROR_CODES.idempotencyFailed]:
    'คำขอนี้เคยดำเนินการไม่สำเร็จและไม่สามารถลองซ้ำได้',
  [ERROR_CODES.internalServerError]: 'เกิดข้อผิดพลาดภายในระบบ',
} as const satisfies Readonly<Record<ErrorCode, string>>;

export class ApplicationError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = 'ApplicationError';
  }
}
