import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import { deleteAccountSchema, loginSchema, registerSchema } from '../types/index.js';
import { config } from '../config/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CSRF_COOKIE_NAME, REFRESH_COOKIE_NAME, REFRESH_TOKEN_EXPIRY_DAYS } from '../constants/index.js';
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  deleteUserAccount,
} from '../services/auth.service.js';
import { jwtBlocklist } from '../utils/blocklist.js';
import { deleteAccountWithSessionInvalidation } from '../utils/accountDeletion.js';

const router = Router();

function authCookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' as const : 'strict' as const,
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

function setCsrfCookie(res: Response): void {
  res.cookie(CSRF_COOKIE_NAME, crypto.randomBytes(32).toString('hex'), {
    httpOnly: false,
    secure: config.NODE_ENV === 'production',
    sameSite: config.NODE_ENV === 'production' ? 'none' as const : 'strict' as const,
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function requireCsrfForCookieAuth(req: Request, res: Response): boolean {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  if (!refreshToken) return true;
  const cookieToken = req.cookies[CSRF_COOKIE_NAME] as string | undefined;
  const headerToken = req.header('X-CSRF-Token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      error: { code: 'ERR_CSRF_INVALID', message: 'CSRF validation failed.' },
    });
    return false;
  }
  return true;
}


router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as { email: string; password: string; name: string };
      const result = await registerUser(body);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, authCookieOptions());
      setCsrfCookie(res);

      res.status(201).json({
        success: true,
        data: { accessToken: result.accessToken, user: result.user },
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(400).json({
          success: false,
          error: { code: 'ERR_USER_EXISTS', message: error.message },
        });
        return;
      }
      throw error;
    }
  })
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as { email: string; password: string };
      const result = await loginUser(body.email, body.password);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, authCookieOptions());
      setCsrfCookie(res);

      res.status(200).json({
        success: true,
        data: { accessToken: result.accessToken, user: result.user },
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

router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      if (!requireCsrfForCookieAuth(req, res)) return;
      const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: { code: 'ERR_NO_REFRESH_TOKEN', message: 'No refresh token provided.' },
        });
        return;
      }

      const result = await refreshAccessToken(refreshToken);

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, authCookieOptions());
      setCsrfCookie(res);
      res.status(200).json({
        success: true,
        data: { accessToken: result.accessToken },
      });
    } catch {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
      res.status(401).json({
        success: false,
        error: { code: 'ERR_REFRESH_EXPIRED', message: 'Invalid or expired refresh token. Please login again.' },
      });
    }
  })
);

router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!requireCsrfForCookieAuth(req, res)) return;
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;

    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const signature = token?.split('.')[2];
    if (signature) {
      jwtBlocklist.add(signature);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });

    res.status(200).json({ success: true, data: null });
  })
);

router.get(
  '/profile',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    const { getSettings } = await import('../services/settings.service.js');
    const profile = await getSettings(userId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  })
);

router.delete(
  '/account',
  authMiddleware,
  validate(deleteAccountSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id as string;
      const body = req.body as { password: string };
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      const signature = token?.split('.')[2];

      await deleteAccountWithSessionInvalidation(
        () => deleteUserAccount(userId, body.password),
        () => {
          if (signature) jwtBlocklist.add(signature);
        }
      );

      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
      res.status(200).json({ success: true, data: null });
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('password')) {
        res.status(403).json({
          success: false,
          error: { code: 'ERR_INVALID_PASSWORD', message: error.message },
        });
        return;
      }
      throw error;
    }
  })
);

export default router;
