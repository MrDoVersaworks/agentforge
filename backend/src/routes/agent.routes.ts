import { Router } from 'express';
import type { Request, Response } from 'express';
import { AGENT_CACHE_TTL_SECONDS } from '../config/constants.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { agentCreateSchema, agentUpdateSchema } from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { cacheMiddleware, invalidateCache } from '../utils/cache.js';
import { requireUserId } from '../utils/requestIdentity.js';
import {
  createAgent,
  deleteAgent,
  getAgentById,
  getAgents,
  updateAgent,
} from '../services/agent.service.js';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  validate(agentCreateSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const body = req.body as {
      name: string;
      system_prompt: string;
      temperature: number;
    };
    const agent = await createAgent(userId, body);
    invalidateCache('/api/agents', userId);

    res.status(201).json({
      success: true,
      data: { agent },
    });
  })
);

router.get(
  '/',
  cacheMiddleware(AGENT_CACHE_TTL_SECONDS),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const agents = await getAgents(requireUserId(req));
    res.status(200).json({
      success: true,
      data: { agents },
    });
  })
);

router.get(
  '/:id',
  cacheMiddleware(AGENT_CACHE_TTL_SECONDS),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const agent = await getAgentById(requireUserId(req), req.params.id);
    if (agent === null) {
      res.status(404).json({
        success: false,
        message: '[ERR_AGENT_NOT_FOUND] Agent not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { agent },
    });
  })
);

router.patch(
  '/:id',
  validate(agentUpdateSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    const body = req.body as {
      name?: string;
      system_prompt?: string;
      temperature?: number;
    };
    const agent = await updateAgent(userId, req.params.id, body);
    invalidateCache('/api/agents', userId);

    res.status(200).json({
      success: true,
      data: { agent },
    });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = requireUserId(req);
    await deleteAgent(userId, req.params.id);
    invalidateCache('/api/agents', userId);

    res.status(200).json({
      success: true,
      data: null,
    });
  })
);

export default router;