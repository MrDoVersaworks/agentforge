import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  geminiKeySchema,
  resendKeySchema,
  updateSettingsSchema,
} from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/requestIdentity.js';
import {
  deleteGeminiKey,
  deleteResendKey,
  getSettings,
  saveGeminiKey,
  saveResendKey,
  updateSettings,
} from '../services/settings.service.js';

const router = Router();

router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const settings = await getSettings(requireUserId(req));
    res.status(200).json({
      success: true,
      data: { settings },
    });
  })
);

router.patch(
  '/',
  validate(updateSettingsSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as {
      name?: string;
      gemini_model?: string;
      notification_email?: string;
    };
    const settings = await updateSettings(requireUserId(req), body);

    res.status(200).json({
      success: true,
      data: { settings },
    });
  })
);

router.post(
  '/api-key',
  validate(geminiKeySchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { gemini_key: string };
    await saveGeminiKey(requireUserId(req), body.gemini_key);

    res.status(200).json({
      success: true,
      message: 'Gemini API Key successfully updated.',
    });
  })
);

router.post(
  '/resend-key',
  validate(resendKeySchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { resend_key: string };
    await saveResendKey(requireUserId(req), body.resend_key);

    res.status(200).json({
      success: true,
      message: 'Resend API Key successfully updated.',
    });
  })
);

router.delete(
  '/api-key',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await deleteGeminiKey(requireUserId(req));
    res.status(200).json({
      success: true,
      message: 'Gemini API Key purged successfully.',
    });
  })
);

router.delete(
  '/resend-key',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await deleteResendKey(requireUserId(req));
    res.status(200).json({
      success: true,
      message: 'Resend API Key purged successfully.',
    });
  })
);

export default router;