import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { systemSettings } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/settings', asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  try {
    const settingsArray = await db.select().from(systemSettings).limit(1);
    const settings = settingsArray[0] ? settingsArray[0] : { google_analytics_id: '', termly_uuid: '' };
    res.status(200).json({ success: true, data: settings });
  } catch (_err) {
    // Fail gracefully if table has not been migrated yet
    res.status(200).json({ success: true, data: { google_analytics_id: '', termly_uuid: '' } });
  }
}));

export default router;
