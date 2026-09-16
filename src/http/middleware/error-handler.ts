import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';

const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_SERVER_ERROR = 500;

const INTERNAL_SERVER_ERROR_RESPONSE = Object.freeze({
  error: Object.freeze({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'เกิดข้อผิดพลาดภายในระบบ',
  }),
});

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(HTTP_NOT_FOUND).end();
};

export const createErrorHandler = (logger: Logger): ErrorRequestHandler =>
  (error, _request, response, next): void => {
    logger.error({ event: 'unhandled_exception', err: error }, 'Unhandled request exception');

    if (response.headersSent) {
      next(error);
      return;
    }

    response.status(HTTP_INTERNAL_SERVER_ERROR).json(INTERNAL_SERVER_ERROR_RESPONSE);
  };
