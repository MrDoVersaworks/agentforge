import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../types/index.js';
import { config } from '../config/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { REFRESH_COOKIE_NAME, REFRESH_TOKEN_EXPIRY_DAYS } from '../constants/index.js';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
} from '../services/auth.service.js';

const router = Router();

// POST /register
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;
      const result = await registerUser({ email, password, name });

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.status(201).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: { code: 'ERR_USER_EXISTS', message: error.message },
        });
        return;
      }
      throw error;
    }
  })
);

// POST /login
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await loginUser(email, password);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        path: '/',
      });

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Invalid email or password')) {
        res.status(401).json({
          success: false,
          error: { code: 'ERR_INVALID_CREDENTIALS', message: error.message },
        });
        return;
      }
      throw error;
    }
  })
);

// POST /refresh
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: { code: 'ERR_NO_REFRESH_TOKEN', message: 'No refresh token provided.' },
        });
        return;
      }

      const accessToken = await refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        data: { accessToken },
      });
    } catch (error: unknown) {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      res.status(401).json({
        success: false,
        error: { code: 'ERR_REFRESH_EXPIRED', message: 'Invalid or expired refresh token. Please login again.' },
      });
    }
  })
);

// POST /logout
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    res.status(200).json({
      success: true,
      data: null,
    });
  })
);

// GET /profile (for AuthContext bootstrap)
router.get(
  '/profile',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    // Import getSettings inline to avoid circular dependency
    const { getSettings } = await import('../services/settings.service.js');
    const profile = await getSettings(userId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  })
);

export default router;
