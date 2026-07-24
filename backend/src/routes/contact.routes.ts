import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { contactMessages } from '../db/schema.js';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const MAX_NAME_LENGTH = 255;
const MAX_EMAIL_LENGTH = 255;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 5000;

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(MAX_NAME_LENGTH),
  email: z.string().email('Invalid email address').max(MAX_EMAIL_LENGTH),
  message: z.string().min(MIN_MESSAGE_LENGTH, `Message must be at least ${MIN_MESSAGE_LENGTH} characters`).max(MAX_MESSAGE_LENGTH),
  ai_screening_passed: z.boolean().optional().default(false),
});

router.post('/', asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = contactSchema.parse(req.body);

    await db.insert(contactMessages).values({
      sender_name: parsed.name,
      sender_email: parsed.email,
      message: parsed.message,
      ai_screening_passed: parsed.ai_screening_passed,
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(error.errors[0].message, 400));
      return;
    }
    next(error);
  }
}));

export default router;
