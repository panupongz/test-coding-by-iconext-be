import type { RequestHandler } from 'express';
import type { Logger } from 'pino';

export const createRequestLogger = (logger: Logger): RequestHandler =>
  (request, response, next): void => {
    const startedAt = performance.now();

    response.once('finish', () => {
      logger.info(
        {
          event: 'http_request_completed',
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs: Math.round(performance.now() - startedAt),
        },
        'HTTP request completed',
      );
    });

    next();
  };
