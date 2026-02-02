import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { createLogger } from '../../utils/logger.js';
import { getErrorMessage } from '../../utils/errors.js';

const logger = createLogger('api-error');

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const message = getErrorMessage(err);
  
  logger.error('API error', {
    path: req.path,
    method: req.method,
    error: message,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? message : undefined,
  });
};
