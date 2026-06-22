import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/connection.js';
import { contactMessages } from '../db/schema.js';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address').max(255),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  ai_screening_passed: z.boolean().optional().default(false),
});

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
});

export default router;
