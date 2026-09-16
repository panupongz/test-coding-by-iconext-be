import type { RequestHandler } from 'express';

const HTTP_NOT_IMPLEMENTED = 501;

export const pendingFeatureController: RequestHandler = (_request, response) => {
  response.sendStatus(HTTP_NOT_IMPLEMENTED);
};
