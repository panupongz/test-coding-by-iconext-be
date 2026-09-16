import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';

import {
  ApplicationError,
  ERROR_CODES,
  ERROR_MESSAGES,
} from '../../application/errors/application-error.js';

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_SERVER_ERROR = 500;

const INTERNAL_SERVER_ERROR_RESPONSE = Object.freeze({
  error: Object.freeze({
    code: ERROR_CODES.internalServerError,
    message: ERROR_MESSAGES[ERROR_CODES.internalServerError],
  }),
});

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(HTTP_NOT_FOUND).json({
    error: {
      code: ERROR_CODES.validation,
      message: ERROR_MESSAGES[ERROR_CODES.validation],
    },
  });
};

export const createErrorHandler = (logger: Logger): ErrorRequestHandler =>
  (error, _request, response, next): void => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (error instanceof ApplicationError) {
      response.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    if (
      error instanceof SyntaxError &&
      'status' in error &&
      error.status === HTTP_BAD_REQUEST
    ) {
      response.status(HTTP_BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.malformedJson,
          message: ERROR_MESSAGES[ERROR_CODES.malformedJson],
        },
      });
      return;
    }

    logger.error({ event: 'unhandled_exception', err: error }, 'Unhandled request exception');

    response.status(HTTP_INTERNAL_SERVER_ERROR).json(INTERNAL_SERVER_ERROR_RESPONSE);
  };
