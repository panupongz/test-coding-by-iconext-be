import { describe, expect, it } from 'vitest';

import {
  ApplicationError,
  ERROR_CODES,
} from '../../src/application/errors/application-error.js';
import { calculatePaymentChange } from '../../src/application/services/payment-service.js';
import { PAYMENT_METHOD } from '../../src/domain/payment.js';
import {
  isSaleExpiredAt,
  SALE_STATUS,
} from '../../src/domain/sale.js';
import { toPaymentResponseDto } from '../../src/http/dtos/payment-response-dto.js';
import { toSaleResponseDto } from '../../src/http/dtos/sale-response-dto.js';

const OBSERVED_AT = new Date('2026-09-17T00:05:00.000Z');

const expectApplicationError = (
  operation: () => unknown,
  expectedCode: typeof ERROR_CODES.insufficientCashAmount | typeof ERROR_CODES.qrAmountMismatch,
): void => {
  let thrown: unknown;

  try {
    operation();
  } catch (error: unknown) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(ApplicationError);
  expect(thrown).toMatchObject({ statusCode: 400, code: expectedCode });
};

describe('T-009 business rules', () => {
  it('calculates exact and overpaid CASH change using integer THB', () => {
    expect(calculatePaymentChange(PAYMENT_METHOD.cash, 60, 60)).toBe(0);
    expect(calculatePaymentChange(PAYMENT_METHOD.cash, 100, 60)).toBe(40);
  });

  it('rejects insufficient CASH with the approved mapped error', () => {
    expectApplicationError(
      () => calculatePaymentChange(PAYMENT_METHOD.cash, 59, 60),
      ERROR_CODES.insufficientCashAmount,
    );
  });

  it('accepts only exact QR equality and produces no change', () => {
    expect(calculatePaymentChange(PAYMENT_METHOD.qrPayment, 60, 60)).toBeNull();
    expectApplicationError(
      () => calculatePaymentChange(PAYMENT_METHOD.qrPayment, 61, 60),
      ERROR_CODES.qrAmountMismatch,
    );
  });

  it('treats the exact expiry boundary and later observations as expired', () => {
    expect(
      isSaleExpiredAt(new Date('2026-09-17T00:05:00.001Z'), OBSERVED_AT),
    ).toBe(false);
    expect(isSaleExpiredAt(OBSERVED_AT, OBSERVED_AT)).toBe(true);
    expect(
      isSaleExpiredAt(new Date('2026-09-17T00:04:59.999Z'), OBSERVED_AT),
    ).toBe(true);
  });

  it('maps a Sale to the exact public response including total and UTC times', () => {
    const response = toSaleResponseDto({
      saleId: '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176',
      productCode: 'P001',
      name: 'Iced Americano',
      unitPrice: 60,
      quantity: 1,
      status: SALE_STATUS.pending,
      createdAt: new Date('2026-09-17T00:00:00.000Z'),
      expiresAt: OBSERVED_AT,
    });

    expect(response).toEqual({
      sale_id: '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176',
      product_code: 'P001',
      name: 'Iced Americano',
      unit_price: 60,
      quantity: 1,
      total: 60,
      status: 'PENDING',
      created_at: '2026-09-17T00:00:00.000Z',
      expires_at: '2026-09-17T00:05:00.000Z',
    });
  });

  it('maps CASH change and omits change from the QR response', () => {
    const sharedPayment = {
      paymentId: '6e39f08a-43db-4c21-9d0f-2c6574349308',
      amountReceived: 100,
      paidAt: new Date('2026-09-17T00:01:00.000Z'),
    };
    const cash = toPaymentResponseDto({
      ...sharedPayment,
      paymentMethod: PAYMENT_METHOD.cash,
      change: 40,
    });
    const qr = toPaymentResponseDto({
      ...sharedPayment,
      paymentMethod: PAYMENT_METHOD.qrPayment,
      change: null,
    });

    expect(cash).toMatchObject({ payment_method: 'CASH', change: 40 });
    expect(qr).toEqual({
      payment_id: sharedPayment.paymentId,
      payment_method: 'QR_PAYMENT',
      amount_received: 100,
      paid_at: '2026-09-17T00:01:00.000Z',
    });
    expect(qr).not.toHaveProperty('change');
  });

  it('rejects an invalid internal CASH view without a change value', () => {
    expect(() =>
      toPaymentResponseDto({
        paymentId: '6e39f08a-43db-4c21-9d0f-2c6574349308',
        paymentMethod: PAYMENT_METHOD.cash,
        amountReceived: 60,
        change: null,
        paidAt: new Date('2026-09-17T00:01:00.000Z'),
      }),
    ).toThrow('Cash payment must include change');
  });
});
