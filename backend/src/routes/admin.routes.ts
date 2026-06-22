import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { contactMessages, systemSettings } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Protect all admin routes
router.use(authMiddleware);

// Optional: You could add a requireOwner middleware here if you have roles

// GET /api/admin/inbox - Retrieve all messages
router.get('/inbox', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const messages = await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.created_at));

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/inbox/:id/read - Mark message as read
router.patch('/inbox/:id/read', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const [updated] = await db
      .update(contactMessages)
      .set({ is_read: true })
      .where(eq(contactMessages.id, id))
      .returning();

    if (!updated) {
      next(new AppError('Message not found', 404));
      return;
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/inbox/:id - Delete message
router.delete('/inbox/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(contactMessages)
      .where(eq(contactMessages.id, id))
      .returning();

    if (!deleted) {
      next(new AppError('Message not found', 404));
      return;
    }

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
});


// ============================================================
// GLOBAL SETTINGS (Legal & Analytics)
// ============================================================
router.get('/settings', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
        const settingsArray = await db.select().from(systemSettings).limit(1);
    const settings = settingsArray[0] ? settingsArray[0] : { google_analytics_id: '', termly_uuid: '' };
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

router.put('/settings', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as { google_analytics_id?: string; termly_uuid?: string };
    const { google_analytics_id, termly_uuid } = body;
    const settingsArray = await db.select().from(systemSettings).limit(1);
    
    let updated: typeof systemSettings.$inferSelect | undefined;
    if (settingsArray.length > 0) {
      [updated] = await db.update(systemSettings)
        .set({ google_analytics_id: google_analytics_id ? google_analytics_id : null, termly_uuid: termly_uuid ? termly_uuid : null, updated_at: new Date() })
        .where(eq(systemSettings.id, settingsArray[0].id))
        .returning();
    } else {
      [updated] = await db.insert(systemSettings)
        .values({ google_analytics_id: google_analytics_id ? google_analytics_id : null, termly_uuid: termly_uuid ? termly_uuid : null })
        .returning();
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;

