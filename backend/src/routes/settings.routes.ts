import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { geminiKeySchema, updateSettingsSchema } from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { REFRESH_COOKIE_NAME } from '../constants/index.js';
import {
  saveGeminiKey,
  getSettings,
  updateSettings,
  deleteUserAccount,
} from '../services/settings.service.js';

const router = Router();

// Secure all settings routes
router.use(authMiddleware);

// GET /api/settings
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const settings = await getSettings(userId);

    res.status(200).json({
      success: true,
      data: { settings },
    });
  })
);

// PATCH /api/settings
router.patch(
  '/',
  validate(updateSettingsSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    try {
      const settings = await updateSettings(userId, req.body);
      res.status(200).json({
        success: true,
        data: { settings },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

// POST /api/settings/api-key
router.post(
  '/api-key',
  validate(geminiKeySchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { gemini_key } = req.body;

    try {
      await saveGeminiKey(userId, gemini_key);
      res.status(200).json({
        success: true,
        message: 'Gemini API Key successfully updated.',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

// DELETE /api/settings/account (Danger Zone: Account Vaporization)
router.delete(
  '/account',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    try {
      await deleteUserAccount(userId);
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

      res.status(200).json({
        success: true,
        message: 'Account successfully deleted.',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

export default router;
