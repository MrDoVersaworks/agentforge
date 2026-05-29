import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  addDocument,
  getDocuments,
  deleteDocument,
} from '../services/knowledge.service.js';

const router = Router();

// Secure all knowledge routes
router.use(authMiddleware);

// POST /api/knowledge/:agentId/documents
router.post(
  '/:agentId/documents',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const agentId = req.params.agentId;
    const { filename, content_text } = req.body;

    if (!filename || !content_text) {
      res.status(400).json({
        success: false,
        message: 'Filename and content_text are required.',
      });
      return;
    }

    try {
      const document = await addDocument(userId, agentId, { filename, contentText: content_text });
      res.status(201).json({
        success: true,
        data: { document },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

// GET /api/knowledge/:agentId/documents
router.get(
  '/:agentId/documents',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const agentId = req.params.agentId;

    try {
      const documents = await getDocuments(userId, agentId);
      res.status(200).json({
        success: true,
        data: { documents },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

// DELETE /api/knowledge/:agentId/documents/:docId
router.delete(
  '/:agentId/documents/:docId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const agentId = req.params.agentId;
    const docId = req.params.docId;

    try {
      await deleteDocument(userId, agentId, docId);
      res.status(200).json({
        success: true,
        data: null,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

export default router;
