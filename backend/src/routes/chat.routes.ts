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
    const userId = req.user?.id as string;
    const body = req.body as { agent_id: string; title?: string };
    const { agent_id, title } = body;

    try {
      const convo = await createConversation(userId, agent_id, title);
      res.status(201).json({
        success: true,
        data: { conversation: convo },
      });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  })
);

// GET /api/chat/conversations/:agentId
router.get(
  '/conversations/:agentId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    const agentId = req.params.agentId;

    try {
      const convos = await getConversations(userId, agentId);
      res.status(200).json({
        success: true,
        data: { conversations: convos },
      });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  })
);

router.delete(
  '/conversations/:convoId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    const convoId = req.params.convoId;

    try {
      await deleteConversation(userId, convoId);
      res.status(200).json({
        success: true,
        data: null,
      });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  })
);

// GET /api/chat/conversations/:convoId/messages
router.get(
  '/conversations/:convoId/messages',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    const convoId = req.params.convoId;

    try {
      const msgs = await getMessages(userId, convoId);
      res.status(200).json({
        success: true,
        data: { messages: msgs },
      });
    } catch (error: unknown) {
      res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
  })
);

// POST /api/chat/conversations/:convoId/messages (Send user message and receive AI response)
router.post(
  '/conversations/:convoId/messages',
  validate(messageSendSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    const convoId = req.params.convoId;
    const body = req.body as { content: string; stream?: boolean };
    const { content, stream } = body;

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
    } catch (error: unknown) {
      if (stream) {
        res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
        res.end();
      } else {
        res.status(400).json({
          success: false,
          message: (error as Error).message,
        });
      }
    }
  })
);

export default router;
