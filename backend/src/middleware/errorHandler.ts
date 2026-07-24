import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  void _next;
  logger.error('ERROR', 'Unhandled server error: ' + err.message, err);

  if (err instanceof AppError) {
    const statusCode = err.statusCode;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  res.status(500).json({
    success: false,
    message: '[ERR_INTERNAL_SERVER] An unexpected internal server error occurred.',
  });
}