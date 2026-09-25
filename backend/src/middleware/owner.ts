import type { NextFunction, Request, Response } from 'express';
import { config } from '../config/index.js';

export function ownerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authenticatedUserId = req.user?.id;
  if (!authenticatedUserId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'ERR_ADMIN_IDENTITY_MISSING',
        message: '[ERR_ADMIN_IDENTITY_MISSING] Authenticated owner identity is required.',
      },
    });
    return;
  }

  if (!config.ADMIN_USER_ID || authenticatedUserId !== config.ADMIN_USER_ID) {
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
