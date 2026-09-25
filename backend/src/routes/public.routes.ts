import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { systemSettings } from '../db/schema.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { z } from 'zod';

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

const reviewSchema = z.object({
  name: z.string().trim().min(1).max(255),
  profession: z.string().trim().max(255).optional(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string().trim().min(1).max(1000),
});

router.get('/reviews', asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  try {
    const { platformReviews } = await import('../db/schema.js');
    const { desc, eq } = await import('drizzle-orm');
    const reviews = await db
      .select()
      .from(platformReviews)
      .where(eq(platformReviews.status, 'approved'))
      .orderBy(desc(platformReviews.created_at));
    res.status(200).json({ success: true, data: reviews });
  } catch (_err) {
    res.status(200).json({ success: true, data: [] });
  }
}));

router.post('/reviews', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const input = reviewSchema.parse(req.body);
    const { platformReviews } = await import('../db/schema.js');
    const [inserted] = await db.insert(platformReviews).values({
      name: input.name,
      profession: input.profession || 'Verified User',
      rating: input.rating,
      feedback: input.feedback,
      status: 'pending',
    }).returning();
    res.status(201).json({ success: true, data: inserted });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: '[ERR_VALIDATION] Invalid review submission.' });
      return;
    }
    res.status(500).json({ success: false, message: '[ERR_REVIEW_POST_FAILED] Failed to post review.' });
  }
}));

export default router;
