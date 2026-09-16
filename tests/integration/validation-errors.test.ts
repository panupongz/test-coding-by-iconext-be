import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import {
  ApplicationError,
  ERROR_CODES,
  ERROR_MESSAGES,
  type ErrorCode,
} from '../../src/application/errors/application-error.js';
import type { CancelSaleExecutor } from '../../src/http/controllers/cancel-sale-controller.js';
import type { CreateSaleExecutor } from '../../src/http/controllers/create-sale-controller.js';
import type { PaymentExecutor } from '../../src/http/controllers/payment-controller.js';
import { createLogger } from '../../src/infrastructure/logger.js';

const SALE_ID = '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176';
const THAI_CHARACTER = /[\u0E00-\u0E7F]/u;
const TECH04_ERROR_CODES = [
  'VALIDATION_ERROR',
  'MALFORMED_JSON',
  'INVALID_PRODUCT_CODE',
  'PRODUCT_NOT_FOUND',
  'SALE_NOT_FOUND',
  'SALE_ALREADY_PAID',
  'SALE_CANCELLED',
  'INSUFFICIENT_CASH_AMOUNT',
  'QR_AMOUNT_MISMATCH',
  'UNSUPPORTED_PAYMENT_METHOD',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_KEY_TOO_LONG',
  'IDEMPOTENCY_CONFLICT',
  'IDEMPOTENCY_FAILED',
  'INTERNAL_SERVER_ERROR',
] as const satisfies readonly ErrorCode[];

const logger = createLogger('silent');

const createSaleService = (
  error?: Error,
): CreateSaleExecutor => ({
  execute: vi.fn<CreateSaleExecutor['execute']>(() =>
    error === undefined
      ? Promise.reject(new Error('Unexpected Create Sale execution'))
      : Promise.reject(error),
  ),
});

const paymentService = (
  error?: Error,
): PaymentExecutor => ({
  execute: vi.fn<PaymentExecutor['execute']>(() =>
    error === undefined
      ? Promise.reject(new Error('Unexpected Payment execution'))
      : Promise.reject(error),
  ),
});

const cancelService = (
  error?: Error,
): CancelSaleExecutor => ({
  execute: vi.fn<CancelSaleExecutor['execute']>(() =>
    error === undefined
      ? Promise.reject(new Error('Unexpected Cancel execution'))
      : Promise.reject(error),
  ),
});

const expectErrorContract = (
  body: unknown,
  expectedCode: ErrorCode,
): void => {
  expect(body).toEqual({
    error: {
      code: expectedCode,
      message: ERROR_MESSAGES[expectedCode],
    },
  });
};

describe('T-007 Validation + Thai Error Response', () => {
  it('exposes exactly the TECH04 fixed enum with a non-empty Thai message per code', () => {
    expect(Object.values(ERROR_CODES)).toEqual(TECH04_ERROR_CODES);
    expect(Object.keys(ERROR_MESSAGES)).toEqual(TECH04_ERROR_CODES);

    for (const code of TECH04_ERROR_CODES) {
      const message = ERROR_MESSAGES[code];
      expect(message.trim()).not.toBe('');
      expect(message).toMatch(THAI_CHARACTER);
    }
  });

  it.each([
    ['missing Create Sale field', '/api/v1/sales', { extra: true }],
    [
      'wrong Payment type',
      `/api/v1/sales/${SALE_ID}/payment`,
      { payment_method: 'CASH', amount_received: '100' },
    ],
    [
      'extra Payment field',
      `/api/v1/sales/${SALE_ID}/payment`,
      { payment_method: 'CASH', amount_received: 100, extra: true },
    ],
  ])('returns the standard validation envelope for %s', async (_name, path, body) => {
    const response = await request(
      createApp(logger, createSaleService(), paymentService(), cancelService()),
    )
      .post(path)
      .set('Idempotency-Key', 't007-validation')
      .send(body)
      .expect(400);

    expectErrorContract(response.body, ERROR_CODES.validation);
  });

  it('distinguishes malformed JSON from schema validation', async () => {
    const response = await request(
      createApp(logger, createSaleService(), paymentService(), cancelService()),
    )
      .post('/api/v1/sales')
      .set('Idempotency-Key', 't007-malformed')
      .set('Content-Type', 'application/json')
      .send('{"product_code":')
      .expect(400);

    expectErrorContract(response.body, ERROR_CODES.malformedJson);
  });

  it.each([
    ['invalid Create Sale code', '/api/v1/sales', { product_code: 'p001' }, ERROR_CODES.invalidProductCode],
    ['invalid Payment Sale', '/api/v1/sales/not-a-uuid/payment', { payment_method: 'CASH', amount_received: 100 }, ERROR_CODES.saleNotFound],
  ])('maps %s to its fixed error code', async (_name, path, body, code) => {
    const response = await request(
      createApp(logger, createSaleService(), paymentService(), cancelService()),
    )
      .post(path)
      .set('Idempotency-Key', 't007-invalid-input')
      .send(body)
      .expect(code === ERROR_CODES.saleNotFound ? 404 : 400);

    expectErrorContract(response.body, code);
  });

  it.each([
    [ERROR_CODES.productNotFound, 404],
    [ERROR_CODES.idempotencyConflict, 409],
    [ERROR_CODES.idempotencyFailed, 409],
  ] as const)('maps Create Sale %s to the standard error envelope', async (code, status) => {
    const response = await request(
      createApp(logger, createSaleService(new ApplicationError(status, code))),
    )
      .post('/api/v1/sales')
      .set('Idempotency-Key', `t007-${code}`)
      .send({ product_code: 'P001' })
      .expect(status);

    expectErrorContract(response.body, code);
  });

  it.each([
    [ERROR_CODES.saleNotFound, 404],
    [ERROR_CODES.saleAlreadyPaid, 409],
    [ERROR_CODES.saleCancelled, 409],
    [ERROR_CODES.insufficientCashAmount, 400],
    [ERROR_CODES.qrAmountMismatch, 400],
  ] as const)('maps Payment %s to the standard error envelope', async (code, status) => {
    const response = await request(
      createApp(
        logger,
        createSaleService(),
        paymentService(new ApplicationError(status, code)),
        cancelService(),
      ),
    )
      .post(`/api/v1/sales/${SALE_ID}/payment`)
      .set('Idempotency-Key', `t007-${code}`)
      .send({ payment_method: 'CASH', amount_received: 100 })
      .expect(status);

    expectErrorContract(response.body, code);
  });

  it('rejects a Cancel body and invalid Sale ID with the approved contracts', async () => {
    const app = createApp(
      logger,
      createSaleService(),
      paymentService(),
      cancelService(),
    );
    const bodyResponse = await request(app)
      .post(`/api/v1/sales/${SALE_ID}/cancel`)
      .set('Idempotency-Key', 't007-cancel-body')
      .send({})
      .expect(400);
    const idResponse = await request(app)
      .post('/api/v1/sales/not-a-uuid/cancel')
      .set('Idempotency-Key', 't007-cancel-id')
      .expect(404);

    expectErrorContract(bodyResponse.body, ERROR_CODES.validation);
    expectErrorContract(idResponse.body, ERROR_CODES.saleNotFound);
  });

  it('sanitizes unexpected exceptions without exposing internal details', async () => {
    const internalDetail = 'SELECT password FROM credentials';
    const response = await request(
      createApp(logger, createSaleService(new Error(internalDetail))),
    )
      .post('/api/v1/sales')
      .set('Idempotency-Key', 't007-internal')
      .send({ product_code: 'P001' })
      .expect(500);

    expectErrorContract(response.body, ERROR_CODES.internalServerError);
    expect(JSON.stringify(response.body)).not.toContain(internalDetail);
    expect(JSON.stringify(response.body)).not.toContain('stack');
  });

  it('uses the standard Thai envelope for an unmatched route', async () => {
    const response = await request(
      createApp(logger, createSaleService(), paymentService(), cancelService()),
    )
      .get('/api/v1/unknown')
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: ERROR_CODES.validation,
        message: ERROR_MESSAGES[ERROR_CODES.validation],
      },
    });
  });
});
