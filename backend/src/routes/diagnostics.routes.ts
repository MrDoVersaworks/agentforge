import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

const clientDiagnosticSchema = z.object({
  event: z.string().min(1).max(120),
  route: z.string().max(300).optional(),
  requestId: z.string().max(128).optional(),
  endpoint: z.string().max(300).optional(),
  agentId: z.string().uuid().optional(),
  documentCount: z.number().int().min(0).max(100000).optional(),
  chunkCount: z.number().int().min(0).max(1000000).optional(),
  notificationVisible: z.boolean().optional(),
  notificationText: z.string().max(300).optional(),
  detail: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const router = Router();
router.use(authMiddleware);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsed = clientDiagnosticSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: '[ERR_DIAGNOSTIC_INVALID] Invalid diagnostic payload.' });
      return;
    }

    const payload = parsed.data;
    logger.info('TRACE', 'CLIENT diagnostic', {
      requestId: res.locals.requestId,
      userId: req.user?.id,
      ...payload,
    });

    res.status(204).send();
  })
);

export default router;
