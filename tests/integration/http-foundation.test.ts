import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { createErrorHandler } from '../../src/http/middleware/error-handler.js';
import { createLogger } from '../../src/infrastructure/logger.js';

const logger = createLogger('silent');
const app = createApp(logger);

const ACTION_ROUTES = [
  '/api/v1/sales',
  '/api/v1/sales/5fe1c13b-b0b4-47d6-8e4f-d0ce39596176/payment',
  '/api/v1/sales/5fe1c13b-b0b4-47d6-8e4f-d0ce39596176/cancel',
] as const;

describe('HTTP foundation', () => {
  it.each(ACTION_ROUTES)('registers POST %s without requiring authentication', async (path) => {
    const response = await request(app).post(path).send({});

    expect(response.status).toBe(501);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it.each(ACTION_ROUTES)('does not register GET %s', async (path) => {
    await request(app).get(path).expect(404);
  });

  it.each(ACTION_ROUTES)('does not register DELETE %s', async (path) => {
    await request(app).delete(path).expect(404);
  });

  it('does not expose Product management routes', async () => {
    await request(app).post('/api/v1/products').send({}).expect(404);
    await request(app).get('/api/v1/products').expect(404);
  });

  it('sanitizes unhandled exceptions with the approved 500 contract', async () => {
    const failingApp = express();
    failingApp.get('/boom', () => {
      throw new Error('SELECT * FROM secrets WHERE token = internal-value');
    });
    failingApp.use(createErrorHandler(logger));

    const response = await request(failingApp).get('/boom').expect(500);

    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'เกิดข้อผิดพลาดภายในระบบ',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('SELECT');
    expect(JSON.stringify(response.body)).not.toContain('internal-value');
  });
});
