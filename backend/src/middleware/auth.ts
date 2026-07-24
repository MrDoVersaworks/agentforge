import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/index.js';
import { jwtBlocklist } from '../utils/blocklist.js';
import { logger } from '../utils/logger.js';

const userPayloadSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});

function rejectAuthentication(
  res: Response,
  message: string
): void {
  res.status(401).json({
    success: false,
    message,
  });
}

function requireBearerToken(req: Request, res: Response): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader === undefined) {
    logger.warn('AUTH', 'Access denied: No authorization header found');
    rejectAuthentication(
      res,
      '[ERR_AUTH_MISSING_TOKEN] Authentication required. No token provided.'
    );
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || parts[1].length === 0) {
    logger.warn('AUTH', 'Access denied: Invalid authorization header format');
    rejectAuthentication(
      res,
      '[ERR_AUTH_INVALID_FORMAT] Invalid authorization header format. Expected Bearer <token>.'
    );
    return null;
  }

  return parts[1];
}

function isTokenBlocklisted(token: string): boolean {
  const signature = token.split('.')[2];
  if (signature === undefined || signature.length === 0) {
    return false;
  }

  return jwtBlocklist.has(signature);
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = requireBearerToken(req, res);
  if (token === null) {
    return;
  }

  if (isTokenBlocklisted(token)) {
    logger.warn('AUTH', 'Access denied: Token is blocklisted');
    rejectAuthentication(
      res,
      '[ERR_AUTH_SESSION_INVALID] Session invalidated. Please log in again.'
    );
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
    req.user = userPayloadSchema.parse(decoded);
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('AUTH', 'Access denied: Token expired');
      rejectAuthentication(
        res,
        '[ERR_AUTH_TOKEN_EXPIRED] Access token expired.'
      );
      return;
    }

    logger.error('AUTH', 'Access denied: Token verification failed', error);
    rejectAuthentication(
      res,
      '[ERR_AUTH_INVALID_TOKEN] Invalid token.'
    );
  }
}