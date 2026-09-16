import {
  ApplicationError,
  ERROR_CODES,
} from '../../application/errors/application-error.js';

const HTTP_BAD_REQUEST = 400;
const MAXIMUM_IDEMPOTENCY_KEY_LENGTH = 255;

export const readIdempotencyKey = (
  headerValue: string | undefined,
): string => {
  if (headerValue === undefined || headerValue.trim().length === 0) {
    throw new ApplicationError(
      HTTP_BAD_REQUEST,
      ERROR_CODES.idempotencyKeyRequired,
      'กรุณาระบุ Idempotency-Key',
    );
  }

  if (headerValue.length > MAXIMUM_IDEMPOTENCY_KEY_LENGTH) {
    throw new ApplicationError(
      HTTP_BAD_REQUEST,
      ERROR_CODES.idempotencyKeyTooLong,
      'Idempotency-Key ต้องยาวไม่เกิน 255 ตัวอักษร',
    );
  }

  return headerValue;
};
