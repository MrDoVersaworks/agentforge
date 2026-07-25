import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/index.js';

export function ownerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authenticatedEmail = req.user?.email;
  if (authenticatedEmail === undefined || authenticatedEmail.trim().length === 0) {
    res.status(401).json({
      success: false,
      error: {
        code: 'ERR_ADMIN_IDENTITY_MISSING',
        message: '[ERR_ADMIN_IDENTITY_MISSING] Authenticated owner identity is required.',
      },
    });
    return;
  }
  const adminEmail = config.ADMIN_EMAIL || '';
  if (authenticatedEmail.toLowerCase() !== adminEmail.toLowerCase()) {
    res.status(403).json({
      success: false,
      error: {
        code: 'ERR_ADMIN_FORBIDDEN',
        message: '[ERR_ADMIN_FORBIDDEN] Owner authorization is required.',
      },
    });
    return;
  }

  next();
}