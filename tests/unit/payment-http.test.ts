import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { CreateSaleExecutor } from '../../src/http/controllers/create-sale-controller.js';
import type { PaymentExecutor } from '../../src/http/controllers/payment-controller.js';
import { createLogger } from '../../src/infrastructure/logger.js';

const SALE_ID = '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176';
const PAYMENT_RESPONSE = {
  payment_id: '6e39f08a-43db-4c21-9d0f-2c6574349308',
  payment_method: 'CASH' as const,
  amount_received: 100,
  paid_at: '2026-09-17T00:01:00.000Z',
  change: 40,
};

const createSaleService: CreateSaleExecutor = {
  execute: vi.fn<CreateSaleExecutor['execute']>(),
};
const logger = createLogger('silent');

const createTestApp = (service: PaymentExecutor) =>
  createApp(logger, createSaleService, service);

describe('Payment HTTP boundary', () => {
  it('returns 201 for first success and passes the validated command to the service', async () => {
    const execute = vi.fn<PaymentExecutor['execute']>().mockResolvedValue({
      kind: 'payment',
      created: true,
      payment: PAYMENT_RESPONSE,
    });

    const response = await request(createTestApp({ execute }))
      .post(`/api/v1/sales/${SALE_ID}/payment`)
      .set('Idempotency-Key', 'payment-key')
      .send({ payment_method: 'CASH', amount_received: 100 })
      .expect(201);

    expect(response.body).toEqual(PAYMENT_RESPONSE);
    expect(execute).toHaveBeenCalledWith({
      saleId: SALE_ID,
      paymentMethod: 'CASH',
      amountReceived: 100,
      idempotencyKey: 'payment-key',
    });
  });

  it('returns 200 for a successful idempotent replay', async () => {
    const execute = vi.fn<PaymentExecutor['execute']>().mockResolvedValue({
      kind: 'payment',
      created: false,
      payment: PAYMENT_RESPONSE,
    });

    await request(createTestApp({ execute }))
      .post(`/api/v1/sales/${SALE_ID}/payment`)
      .set('Idempotency-Key', 'payment-replay')
      .send({ payment_method: 'CASH', amount_received: 100 })
      .expect(200);
  });

  it('returns 200 with the expired sale body when payment persists cancellation', async () => {
    const execute = vi.fn<PaymentExecutor['execute']>().mockResolvedValue({
      kind: 'expired',
      saleId: SALE_ID,
      status: 'CANCELLED',
    });

    const response = await request(createTestApp({ execute }))
      .post(`/api/v1/sales/${SALE_ID}/payment`)
      .set('Idempotency-Key', 'payment-expired')
      .send({ payment_method: 'CASH', amount_received: 100 })
      .expect(200);

    expect(response.body).toEqual({ sale_id: SALE_ID, status: 'CANCELLED' });
  });

  it.each([
    ['invalid sale id', 'not-a-uuid', { payment_method: 'CASH', amount_received: 100 }, 'SALE_NOT_FOUND', 404],
    ['missing key', SALE_ID, { payment_method: 'CASH', amount_received: 100 }, 'IDEMPOTENCY_KEY_REQUIRED', 400],
    ['missing body', SALE_ID, undefined, 'VALIDATION_ERROR', 400],
    ['missing method', SALE_ID, { amount_received: 100 }, 'VALIDATION_ERROR', 400],
    ['extra property', SALE_ID, { payment_method: 'CASH', amount_received: 100, note: 'x' }, 'VALIDATION_ERROR', 400],
    ['wrong amount type', SALE_ID, { payment_method: 'CASH', amount_received: '100' }, 'VALIDATION_ERROR', 400],
    ['non-positive amount', SALE_ID, { payment_method: 'CASH', amount_received: 0 }, 'VALIDATION_ERROR', 400],
    ['unsupported method', SALE_ID, { payment_method: 'CARD', amount_received: 100 }, 'UNSUPPORTED_PAYMENT_METHOD', 400],
  ])('rejects %s before executing payment', async (_name, saleId, body, errorCode, status) => {
    const execute = vi.fn<PaymentExecutor['execute']>();
    let pendingRequest = request(createTestApp({ execute }))
      .post(`/api/v1/sales/${saleId}/payment`);

    if (_name !== 'missing key') {
      pendingRequest = pendingRequest.set('Idempotency-Key', 'payment-validation');
    }

    const response =
      body === undefined
        ? await pendingRequest.expect(status)
        : await pendingRequest.send(body).expect(status);

    expect(
      (response.body as unknown as { error: { code: string } }).error.code,
    ).toBe(errorCode);
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with the fixed safe error contract', async () => {
    const execute = vi.fn<PaymentExecutor['execute']>();

    const response = await request(createTestApp({ execute }))
      .post(`/api/v1/sales/${SALE_ID}/payment`)
      .set('Idempotency-Key', 'payment-malformed')
      .set('Content-Type', 'application/json')
      .send('{"payment_method":')
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: 'MALFORMED_JSON',
        message: 'รูปแบบ JSON ไม่ถูกต้อง',
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });
});
