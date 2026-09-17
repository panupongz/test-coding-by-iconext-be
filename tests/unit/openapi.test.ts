import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { openApiDocument } from '../../src/http/openapi.js';
import type { CreateSaleExecutor } from '../../src/http/controllers/create-sale-controller.js';
import { createLogger } from '../../src/infrastructure/logger.js';

const createSaleService: CreateSaleExecutor = {
  execute: vi.fn<CreateSaleExecutor['execute']>(),
};

describe('OpenAPI documentation', () => {
  it('documents exactly the three existing business endpoints', () => {
    expect(Object.keys(openApiDocument.paths).sort()).toEqual([
      '/api/v1/sales',
      '/api/v1/sales/{sale_id}/cancel',
      '/api/v1/sales/{sale_id}/payment',
    ]);
  });

  it('serves Swagger UI at /api-docs', async () => {
    const response = await request(
      createApp(createLogger('silent'), createSaleService),
    )
      .get('/api-docs/')
      .expect(200);

    expect(response.text).toContain('id="swagger-ui"');
    expect(response.text).toContain('ICONEXT Sales API');

    await request(createApp(createLogger('silent'), createSaleService))
      .get('/api-docs/swagger-ui-bundle.js')
      .expect('Content-Type', /javascript/u)
      .expect(200);
  });
});
