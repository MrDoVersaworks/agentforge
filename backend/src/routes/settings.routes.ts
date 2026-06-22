import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { geminiKeySchema, resendKeySchema, updateSettingsSchema } from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { REFRESH_COOKIE_NAME } from '../constants/index.js';
import {
  saveGeminiKey,
  saveResendKey,
  getSettings,
  updateSettings,
  deleteGeminiKey,
  deleteResendKey,
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
      const body = req.body as {
        name?: string;
        email?: string;
        theme?: string;
        // other settings fields as appropriate
      };
      const settings = await updateSettings(userId, body);
      res.status(200).json({
        success: true,
        data: { settings },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update settings.';
      res.status(400).json({
        success: false,
        message,
      });
    }
  })
);

// POST /api/settings/api-key (Gemini — encrypted at rest)
router.post(
  '/api-key',
  validate(geminiKeySchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const body = req.body as { gemini_key?: string };
    const { gemini_key } = body;

    try {
      await saveGeminiKey(userId, gemini_key);
      res.status(200).json({
        success: true,
        message: 'Gemini API Key successfully updated.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save Gemini key.';
      res.status(400).json({
        success: false,
        message,
      });
    }
  })
);

// POST /api/settings/resend-key (Resend — encrypted at rest)
router.post(
  '/resend-key',
  validate(resendKeySchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const body = req.body as { resend_key?: string };
    const { resend_key } = body;

    try {
      await saveResendKey(userId, resend_key);
      res.status(200).json({
        success: true,
        message: 'Resend API Key successfully updated.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save Resend key.';
      res.status(400).json({
        success: false,
        message,
      });
    }
  })
);

// DELETE /api/settings/api-key (Purge Gemini Key)
router.delete(
  '/api-key',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    try {
      await deleteGeminiKey(userId);
      res.status(200).json({
        success: true,
        message: 'Gemini API Key purged successfully.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete Gemini key.';
      res.status(400).json({
        success: false,
        message,
      });
    }
  })
);

// DELETE /api/settings/resend-key (Purge Resend Key)
router.delete(
  '/resend-key',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    try {
      await deleteResendKey(userId);
      res.status(200).json({
        success: true,
        message: 'Resend API Key purged successfully.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete Resend key.';
      res.status(400).json({
        success: false,
        message,
      });
    }
  })
);

export default router;
