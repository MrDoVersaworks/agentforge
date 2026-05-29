import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('ERROR', `Unhandled server error: ${err.message}`, err);

  res.status(500).json({
    success: false,
    message: 'An unexpected internal server error occurred.',
  });
}
