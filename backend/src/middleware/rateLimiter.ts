import { rateLimit } from 'express-rate-limit';
import {
  API_MAX_REQUESTS,
  API_RATE_LIMIT_WINDOW_MS,
  AUTH_MAX_REQUESTS,
  AUTH_RATE_LIMIT_WINDOW_MS,
} from '../config/constants.js';

export const authRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '[ERR_RATE_LIMIT_AUTH] Too many authentication attempts. Please try again after 15 minutes.',
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: API_RATE_LIMIT_WINDOW_MS,
  max: API_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: '[ERR_RATE_LIMIT_API] Too many API requests. Please slow down and try again.',
  },
});