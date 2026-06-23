import { rateLimit } from 'express-rate-limit';

const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_REQUESTS = 20;
const API_WINDOW_MS = 60 * 1000; // 1 minute
const API_MAX_REQUESTS = 120;

export const authRateLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '[ERR_RATE_LIMIT_AUTH] Too many authentication attempts. Please try again after 15 minutes.',
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: API_WINDOW_MS,
  max: API_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '[ERR_RATE_LIMIT_API] Too many API requests. Please slow down and try again.',
  },
});
