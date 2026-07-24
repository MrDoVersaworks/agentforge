import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { knowledgeDocumentSchema } from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireUserId } from '../utils/requestIdentity.js';
import {
  addDocument,
  deleteDocument,
  getDocuments,
} from '../services/knowledge.service.js';

const router = Router();

router.use(authMiddleware);

router.post(
  '/:agentId/documents',
  validate(knowledgeDocumentSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const body = req.body as { filename: string; content_text: string };
    const document = await addDocument(
      userId,
      req.params.agentId,
      {
        filename: body.filename,
        contentText: body.content_text,
      }
    );

    res.status(201).json({
      success: true,
      data: { document },
    });
  })
);

router.get(
  '/:agentId/documents',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const documents = await getDocuments(userId, req.params.agentId);

    res.status(200).json({
      success: true,
      data: { documents },
    });
  })
);

router.delete(
  '/:agentId/documents/:docId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    await deleteDocument(userId, req.params.agentId, req.params.docId);

    res.status(200).json({
      success: true,
      data: null,
    });
  })
);

export default router;