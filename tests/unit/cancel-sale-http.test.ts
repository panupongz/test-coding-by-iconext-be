import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { CreateSaleExecutor } from '../../src/http/controllers/create-sale-controller.js';
import type { CancelSaleExecutor } from '../../src/http/controllers/cancel-sale-controller.js';
import { createLogger } from '../../src/infrastructure/logger.js';

const SALE_ID = '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176';
const createSaleService: CreateSaleExecutor = {
  execute: vi.fn<CreateSaleExecutor['execute']>(),
};
const logger = createLogger('silent');

const createTestApp = (service: CancelSaleExecutor) =>
  createApp(logger, createSaleService, undefined, service);

describe('Cancel Sale HTTP boundary', () => {
  it('returns the exact cancelled sale contract and passes the validated command', async () => {
    const execute = vi.fn<CancelSaleExecutor['execute']>().mockResolvedValue({
      saleId: SALE_ID,
      status: 'CANCELLED',
    });

    const response = await request(createTestApp({ execute }))
      .post(`/api/v1/sales/${SALE_ID}/cancel`)
      .set('Idempotency-Key', 'cancel-key')
      .expect(200);

    expect(response.body).toEqual({ sale_id: SALE_ID, status: 'CANCELLED' });
    expect(execute).toHaveBeenCalledWith({
      saleId: SALE_ID,
      idempotencyKey: 'cancel-key',
    });
  });

  it.each([
    ['invalid sale id', 'not-a-uuid', 'cancel-validation', 'SALE_NOT_FOUND', 404],
    ['missing key', SALE_ID, undefined, 'IDEMPOTENCY_KEY_REQUIRED', 400],
    ['empty key', SALE_ID, '', 'IDEMPOTENCY_KEY_REQUIRED', 400],
    ['too long key', SALE_ID, 'x'.repeat(256), 'IDEMPOTENCY_KEY_TOO_LONG', 400],
  ])(
    'rejects %s before executing cancellation',
    async (_name, saleId, key, errorCode, status) => {
      const execute = vi.fn<CancelSaleExecutor['execute']>();
      let pendingRequest = request(createTestApp({ execute })).post(
        `/api/v1/sales/${saleId}/cancel`,
      );

      if (key !== undefined) {
        pendingRequest = pendingRequest.set('Idempotency-Key', key);
      }

      const response = await pendingRequest.expect(status);

      expect(
        (response.body as unknown as { error: { code: string } }).error.code,
      ).toBe(errorCode);
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['empty object', {}],
    ['non-empty object', { reason: 'changed-mind' }],
    ['array', []],
  ])('rejects a %s JSON body', async (_name, body) => {
    const execute = vi.fn<CancelSaleExecutor['execute']>();

    const response = await request(createTestApp({ execute }))
      .post(`/api/v1/sales/${SALE_ID}/cancel`)
      .set('Idempotency-Key', 'cancel-body')
      .send(body)
      .expect(400);

    expect(
      (response.body as unknown as { error: { code: string } }).error.code,
    ).toBe('VALIDATION_ERROR');
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects a JSON null body before executing cancellation', async () => {
    const execute = vi.fn<CancelSaleExecutor['execute']>();

    const response = await request(createTestApp({ execute }))
      .post(`/api/v1/sales/${SALE_ID}/cancel`)
      .set('Idempotency-Key', 'cancel-null-body')
      .set('Content-Type', 'application/json')
      .send('null')
      .expect(400);

    expect(
      (response.body as unknown as { error: { code: string } }).error.code,
    ).toBe('MALFORMED_JSON');
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with the fixed safe error contract', async () => {
    const execute = vi.fn<CancelSaleExecutor['execute']>();

    const response = await request(createTestApp({ execute }))
      .post(`/api/v1/sales/${SALE_ID}/cancel`)
      .set('Idempotency-Key', 'cancel-malformed')
      .set('Content-Type', 'application/json')
      .send('{')
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
