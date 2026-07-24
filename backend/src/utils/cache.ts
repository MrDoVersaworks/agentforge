import NodeCache from 'node-cache';
import type { Request, Response, NextFunction } from 'express';
import {
  CACHE_CHECK_PERIOD_SECONDS,
  CACHE_DEFAULT_TTL_SECONDS,
  HTTP_SUCCESS_STATUS_MAX_EXCLUSIVE,
  HTTP_SUCCESS_STATUS_MIN,
} from '../config/constants.js';

export const appCache = new NodeCache({
  stdTTL: CACHE_DEFAULT_TTL_SECONDS,
  checkperiod: CACHE_CHECK_PERIOD_SECONDS,
});

/**
 * Middleware to cache authenticated GET responses.
 * @param duration TTL in seconds (overrides default if provided)
 */
export const cacheMiddleware = (duration?: number) => {
  if (
    duration !== undefined &&
    (!Number.isFinite(duration) || !Number.isInteger(duration) || duration <= 0)
  ) {
    throw new Error('[ERR_CACHE_DURATION_INVALID] Cache duration must be a positive integer.');
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const userId = req.user?.id;
    if (userId === undefined || userId.length === 0) {
      next(
        new Error(
          '[ERR_CACHE_IDENTITY_MISSING] Authenticated identity is required for user-scoped caching.'
        )
      );
      return;
    }

    const key = ['__express__', req.originalUrl, '__user__', userId].join('');
    const cachedResponse = appCache.get(key);

    if (cachedResponse !== undefined) {
      res.status(HTTP_SUCCESS_STATUS_MIN).json(cachedResponse);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown): Response => {
      if (
        res.statusCode >= HTTP_SUCCESS_STATUS_MIN &&
        res.statusCode < HTTP_SUCCESS_STATUS_MAX_EXCLUSIVE
      ) {
        if (duration !== undefined) {
          appCache.set(key, body, duration);
        } else {
          appCache.set(key, body);
        }
      }
      return originalJson(body);
    });

    next();
  };
};

/**
 * Clear cache keys for one authenticated owner.
 * @param urlPrefix URL path prefix to clear
 * @param userId Authenticated owner ID
 */
export const invalidateCache = (urlPrefix: string, userId: string): void => {
  if (urlPrefix.length === 0 || userId.length === 0) {
    throw new Error(
      '[ERR_CACHE_INVALIDATION_IDENTITY_MISSING] Cache invalidation requires a URL prefix and user ID.'
    );
  }

  const keysToDelete = appCache
    .keys()
    .filter(
      (key: string) =>
        key.startsWith('__express__' + urlPrefix) && key.endsWith('__user__' + userId)
    );

  if (keysToDelete.length > 0) {
    appCache.del(keysToDelete);
  }
};