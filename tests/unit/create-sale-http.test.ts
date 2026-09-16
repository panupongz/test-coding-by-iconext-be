import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import type { SaleResponse } from '../../src/domain/sale.js';
import type { CreateSaleExecutor } from '../../src/http/controllers/create-sale-controller.js';
import { createLogger } from '../../src/infrastructure/logger.js';

const SALE_RESPONSE = {
  sale_id: '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176',
  product_code: 'P001',
  name: 'Iced Americano',
  unit_price: 60,
  quantity: 1,
  total: 60,
  status: 'PENDING' as const,
  created_at: '2026-09-17T00:00:00.000Z',
  expires_at: '2026-09-17T00:05:00.000Z',
};

const logger = createLogger('silent');

const createTestApp = (service: CreateSaleExecutor) => createApp(logger, service);

describe('Create Sale HTTP boundary', () => {
  it('returns the exact sale contract with 201 for a first success', async () => {
    const execute = vi.fn<CreateSaleExecutor['execute']>().mockResolvedValue({
      created: true,
      sale: SALE_RESPONSE,
    });

    const response = await request(createTestApp({ execute }))
      .post('/api/v1/sales')
      .set('Idempotency-Key', 'create-sale-1')
      .send({ product_code: 'P001' })
      .expect(201);

    const responseBody = response.body as unknown as SaleResponse;
    expect(responseBody).toEqual(SALE_RESPONSE);
    expect(Object.keys(responseBody)).toEqual(Object.keys(SALE_RESPONSE));
    expect(execute).toHaveBeenCalledWith({
      productCode: 'P001',
      idempotencyKey: 'create-sale-1',
    });
  });

  it('returns 200 for a successful idempotent replay', async () => {
    const execute = vi.fn<CreateSaleExecutor['execute']>().mockResolvedValue({
      created: false,
      sale: { ...SALE_RESPONSE, status: 'CANCELLED' },
    });

    const response = await request(createTestApp({ execute }))
      .post('/api/v1/sales')
      .set('Idempotency-Key', 'create-sale-replay')
      .send({ product_code: 'P001' })
      .expect(200);

    expect((response.body as unknown as SaleResponse).status).toBe('CANCELLED');
  });

  it.each([
    ['missing body', undefined, 'VALIDATION_ERROR'],
    ['missing product_code', {}, 'VALIDATION_ERROR'],
    ['extra property', { product_code: 'P001', quantity: 1 }, 'VALIDATION_ERROR'],
    ['wrong type', { product_code: 1 }, 'VALIDATION_ERROR'],
    ['invalid pattern', { product_code: 'p001' }, 'INVALID_PRODUCT_CODE'],
    ['invalid length', { product_code: 'P0001' }, 'INVALID_PRODUCT_CODE'],
  ])('rejects %s without calling the service', async (_name, body, errorCode) => {
    const execute = vi.fn<CreateSaleExecutor['execute']>();
    const pendingRequest = request(createTestApp({ execute }))
      .post('/api/v1/sales')
      .set('Idempotency-Key', 'validation-key');

    const response =
      body === undefined
        ? await pendingRequest.expect(400)
        : await pendingRequest.send(body).expect(400);

    expect(
      (response.body as unknown as { error: { code: string } }).error.code,
    ).toBe(errorCode);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', undefined, 'IDEMPOTENCY_KEY_REQUIRED'],
    ['empty', '', 'IDEMPOTENCY_KEY_REQUIRED'],
    ['whitespace', '   ', 'IDEMPOTENCY_KEY_REQUIRED'],
    ['too long', 'x'.repeat(256), 'IDEMPOTENCY_KEY_TOO_LONG'],
  ])('rejects a %s Idempotency-Key', async (_name, key, errorCode) => {
    const execute = vi.fn<CreateSaleExecutor['execute']>();
    let pendingRequest = request(createTestApp({ execute })).post('/api/v1/sales');

    if (key !== undefined) {
      pendingRequest = pendingRequest.set('Idempotency-Key', key);
    }

    const response = await pendingRequest
      .send({ product_code: 'P001' })
      .expect(400);

    expect(
      (response.body as unknown as { error: { code: string } }).error.code,
    ).toBe(errorCode);
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with the fixed safe error contract', async () => {
    const execute = vi.fn<CreateSaleExecutor['execute']>();

    const response = await request(createTestApp({ execute }))
      .post('/api/v1/sales')
      .set('Idempotency-Key', 'malformed-json')
      .set('Content-Type', 'application/json')
      .send('{"product_code":')
      .expect(400);

    expect(response.body).toEqual({
      error: {
        code: 'MALFORMED_JSON',
        message: 'รูปแบบ JSON ไม่ถูกต้อง',
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('keeps payment and cancel outside T-004 as pending features', async () => {
    const execute = vi.fn<CreateSaleExecutor['execute']>();
    const saleId = '5fe1c13b-b0b4-47d6-8e4f-d0ce39596176';

    await request(createTestApp({ execute }))
      .post(`/api/v1/sales/${saleId}/payment`)
      .send({})
      .expect(501);
    await request(createTestApp({ execute }))
      .post(`/api/v1/sales/${saleId}/cancel`)
      .send({})
      .expect(501);
  });
});
