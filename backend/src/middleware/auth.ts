import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtBlocklist } from '../utils/blocklist.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { UserPayload } from '../types/index.js';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    logger.warn('AUTH', 'Access denied: No authorization header found');
    res.status(401).json({
      success: false,
      message: 'Authentication required. No token provided.',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 ? true : parts[0] !== 'Bearer') {
    logger.warn('AUTH', 'Access denied: Invalid authorization header format');
    res.status(401).json({
      success: false,
      message: 'Invalid authorization header format. Expected Bearer <token>',
    });
    return;
  }

  const token = parts[1];

  try {
    // 1. Check if token signature is in the native in-memory blocklist
    const signature = token.split('.')[2];
    if (signature && jwtBlocklist.has(signature)) {
      logger.warn('AUTH', 'Access denied: Token is blocklisted (Logged out)');
      res.status(401).json({
        success: false,
        message: 'Session invalidated. Please log in again.',
      });
      return;
    }
    const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as UserPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };
    next();
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('AUTH', 'Access denied: Token expired');
      res.status(401).json({
        success: false,
        message: 'Access token expired.',
      });
      return;
    }

    logger.error('AUTH', 'Access denied: Token verification failed', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
}
