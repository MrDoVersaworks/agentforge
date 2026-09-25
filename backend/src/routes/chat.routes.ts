import { Router, Request, Response } from 'express';
import { z } from 'zod';
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

const agentConversationParamsSchema = z.object({ agentId: z.string().uuid('Invalid agent ID') });
const conversationParamsSchema = z.object({ convoId: z.string().uuid('Invalid conversation ID') });
const router = Router();

router.use(authMiddleware);

router.post(
  '/conversations',
  validate(conversationCreateSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    const body = req.body as { agent_id: string; title?: string };
    try {
      const convo = await createConversation(userId, body.agent_id, body.title);
      res.status(201).json({ success: true, data: { conversation: convo } });
    } catch (error: unknown) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  })
);

router.get(
  '/conversations/:agentId',
  validate(agentConversationParamsSchema, 'params'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    try {
      const convos = await getConversations(userId, req.params.agentId);
      res.status(200).json({ success: true, data: { conversations: convos } });
    } catch (error: unknown) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  })
);

router.delete(
  '/conversations/:convoId',
  validate(conversationParamsSchema, 'params'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    try {
      await deleteConversation(userId, req.params.convoId);
      res.status(200).json({ success: true, data: null });
    } catch (error: unknown) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  })
);

router.get(
  '/conversations/:convoId/messages',
  validate(conversationParamsSchema, 'params'),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    try {
      const msgs = await getMessages(userId, req.params.convoId);
      res.status(200).json({ success: true, data: { messages: msgs } });
    } catch (error: unknown) {
      res.status(400).json({ success: false, message: (error as Error).message });
    }
  })
);

router.post(
  '/conversations/:convoId/messages',
  validate(conversationParamsSchema, 'params'),
  validate(messageSendSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id as string;
    const convoId = req.params.convoId;
    const body = req.body as { content: string; stream?: boolean };

    try {
      if (body.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        await queryRAGAndRespond(
          userId,
          convoId,
          body.content,
          true,
          (chunk: string) => {
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          }
        );

        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        const response = await queryRAGAndRespond(userId, convoId, body.content, false);
        res.status(200).json({ success: true, data: { content: response } });
      }
    } catch (error: unknown) {
      if (body.stream) {
        res.write(`data: ${JSON.stringify({ error: (error as Error).message })}\n\n`);
        res.end();
      } else {
        res.status(400).json({ success: false, message: (error as Error).message });
      }
    }
  })
);

export default router;
