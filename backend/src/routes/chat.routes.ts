import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { conversationCreateSchema, messageSendSchema } from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createConversation,
  getConversations,
  getMessages,
  deleteConversation,
  queryRAGAndRespond,
} from '../services/chat.service.js';

const router = Router();

// Secure all chat routes
router.use(authMiddleware);

// POST /api/chat/conversations
router.post(
  '/conversations',
  validate(conversationCreateSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { agent_id, title } = req.body;

    try {
      const convo = await createConversation(userId, agent_id, title);
      res.status(201).json({
        success: true,
        data: { conversation: convo },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

// GET /api/chat/conversations/:agentId
router.get(
  '/conversations/:agentId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const agentId = req.params.agentId;

    try {
      const convos = await getConversations(userId, agentId);
      res.status(200).json({
        success: true,
        data: { conversations: convos },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

// DELETE /api/chat/conversations/:convoId
router.delete(
  '/conversations/:convoId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const convoId = req.params.convoId;

    try {
      await deleteConversation(userId, convoId);
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

// GET /api/chat/conversations/:convoId/messages
router.get(
  '/conversations/:convoId/messages',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const convoId = req.params.convoId;

    try {
      const msgs = await getMessages(userId, convoId);
      res.status(200).json({
        success: true,
        data: { messages: msgs },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

// POST /api/chat/conversations/:convoId/messages (Send user message and receive AI response)
router.post(
  '/conversations/:convoId/messages',
  validate(messageSendSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const convoId = req.params.convoId;
    const { content, stream } = req.body;

    try {
      if (stream) {
        // Set proper SSE streaming headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // Establish the SSE connection

        await queryRAGAndRespond(
          userId,
          convoId,
          content,
          true,
          (chunk: string) => {
            res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          }
        );

        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        const response = await queryRAGAndRespond(userId, convoId, content, false);
        res.status(200).json({
          success: true,
          data: { content: response },
        });
      }
    } catch (error: any) {
      if (stream) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      }
    }
  })
);

export default router;
