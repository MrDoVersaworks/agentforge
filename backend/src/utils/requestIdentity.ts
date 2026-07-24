import type { Request } from 'express';
import { AppError } from '../middleware/errorHandler.js';

export function requireUserId(req: Request): string {
  const userId = req.user?.id;
  if (userId === undefined || userId.trim().length === 0) {
    throw new AppError(
      '[ERR_AUTH_IDENTITY_MISSING] Authenticated user identity is required.',
      401
    );
  }

  return userId;
}