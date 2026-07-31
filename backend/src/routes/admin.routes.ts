import { Router } from 'express';
import type { Request, Response } from 'express';
import { count, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  ADMIN_INBOX_DEFAULT_PAGE_SIZE,
  ADMIN_INBOX_MAX_PAGE_SIZE,
  ADMIN_SETTING_VALUE_MAX_LENGTH,
} from '../config/constants.js';
import { db } from '../db/connection.js';
import { contactMessages, systemSettings } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { ownerMiddleware } from '../middleware/owner.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(ADMIN_INBOX_MAX_PAGE_SIZE)
    .default(ADMIN_INBOX_DEFAULT_PAGE_SIZE),
});

const settingsSchema = z.object({
  google_analytics_id: z.string().trim().max(ADMIN_SETTING_VALUE_MAX_LENGTH).nullable().optional(),
  termly_uuid: z.string().trim().max(ADMIN_SETTING_VALUE_MAX_LENGTH).nullable().optional(),
});

router.use(authMiddleware);
router.use(ownerMiddleware);

router.get(
  '/inbox',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const pagination = paginationSchema.parse(req.query);
    const offset = (pagination.page - 1) * pagination.limit;

    const [messages, totals] = await Promise.all([
      db
        .select()
        .from(contactMessages)
        .orderBy(desc(contactMessages.created_at))
        .limit(pagination.limit)
        .offset(offset),
      db.select({ total: count() }).from(contactMessages).limit(1),
    ]);

    if (totals.length === 0) {
      throw new AppError('[ERR_ADMIN_INBOX_COUNT_MISSING] Inbox count query returned no result.', 500);
    }

    const total = totals[0].total;
    res.status(200).json({
      success: true,
      data: messages,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  })
);

router.patch(
  '/inbox/:id/read',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const [updated] = await db
      .update(contactMessages)
      .set({
        is_read: true,
        updated_at: sql.raw('CURRENT_TIMESTAMP'),
      })
      .where(eq(contactMessages.id, req.params.id))
      .returning();

    if (updated === undefined) {
      throw new AppError('[ERR_ADMIN_MESSAGE_NOT_FOUND] Message not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  })
);

router.delete(
  '/inbox/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const [deleted] = await db
      .delete(contactMessages)
      .where(eq(contactMessages.id, req.params.id))
      .returning({ id: contactMessages.id });

    if (deleted === undefined) {
      throw new AppError('[ERR_ADMIN_MESSAGE_NOT_FOUND] Message not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: null,
    });
  })
);

router.get(
  '/settings',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const settings = await db.select().from(systemSettings).limit(1);
    let settingsData: typeof systemSettings.$inferSelect | null;
    if (settings.length === 0) {
      settingsData = null;
    } else {
      settingsData = settings[0];
    }

    res.status(200).json({
      success: true,
      data: settingsData,
    });
  })
);

router.put(
  '/settings',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const input = settingsSchema.parse(req.body);
    const existing = await db.select({ id: systemSettings.id }).from(systemSettings).limit(1);

    let updated: typeof systemSettings.$inferSelect | undefined;
    if (existing.length === 0) {
      [updated] = await db.insert(systemSettings).values(input).returning();
    } else {
      [updated] = await db
        .update(systemSettings)
        .set({
          ...input,
          updated_at: sql.raw('CURRENT_TIMESTAMP'),
        })
        .where(eq(systemSettings.id, existing[0].id))
        .returning();
    }

    if (updated === undefined) {
      throw new AppError('[ERR_ADMIN_SETTINGS_UPDATE_FAILED] Global settings update failed.', 500);
    }

    res.status(200).json({
      success: true,
      data: updated,
    });
  })
);

router.get(
  '/reviews',
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const { platformReviews } = await import('../db/schema.js');
    const reviews = await db.select().from(platformReviews).orderBy(desc(platformReviews.created_at));
    res.status(200).json({
      success: true,
      data: reviews,
    });
  })
);

router.delete(
  '/reviews/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { platformReviews } = await import('../db/schema.js');
    const [deleted] = await db
      .delete(platformReviews)
      .where(eq(platformReviews.id, req.params.id))
      .returning();

    if (deleted === undefined) {
      throw new AppError('[ERR_ADMIN_REVIEW_NOT_FOUND] Review not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: null,
    });
  })
);

export default router;