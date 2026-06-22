import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';

// Standard TTL is 60 seconds
export const appCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

/**
 * Middleware to cache responses for GET requests
 * @param duration TTL in seconds (overrides default if provided)
 */
export const cacheMiddleware = (duration?: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    interface AuthenticatedRequest extends Request {
      user?: { id: string; email: string; };
    }
    const authReq = req as AuthenticatedRequest;
    
    // Construct a unique cache key based on the URL and user ID (if authenticated)
    const userId = authReq.user?.id ? authReq.user?.id : 'anonymous';
    const key = `__express__${req.originalUrl ? req.originalUrl : req.url}__user__${userId}`;
    const cachedResponse = appCache.get(key);

    if (cachedResponse) {
      res.status(200).json(cachedResponse);
      return;
    }

    // Wrap res.json to intercept the response and cache it
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown): Response => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (duration) {
          appCache.set(key, body, duration);
        } else {
          appCache.set(key, body);
        }
      }
      return originalJson(body);
    }) as unknown as typeof res.json;

    next();
  };
};

/**
 * Function to manually clear cache keys by prefix (e.g., when a resource is updated)
 * @param urlPrefix The URL path prefix to clear (e.g., '/api/agents')
 * @param userId The user ID whose cache should be cleared
 */
export const invalidateCache = (urlPrefix: string, userId: string): void => {
  const keys = appCache.keys();
  const keysToDelete = keys.filter(
    (k: string) => k.startsWith(`__express__${urlPrefix}`) && k.endsWith(`__user__${userId}`)
  );
  if (keysToDelete.length > 0) {
    appCache.del(keysToDelete);
  }
};
