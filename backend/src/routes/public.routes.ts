import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { systemSettings } from '../db/schema.js';

const router = Router();

router.get('/settings', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settingsArray = await db.select().from(systemSettings).limit(1);
    const settings = settingsArray[0] ? settingsArray[0] : { google_analytics_id: '', termly_uuid: '' };
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

export default router;
