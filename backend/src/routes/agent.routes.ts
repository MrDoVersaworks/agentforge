import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { agentCreateSchema, agentUpdateSchema } from '../types/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
} from '../services/agent.service.js';

const router = Router();

// Secure all agent routes
router.use(authMiddleware);

// POST /api/agents
router.post(
  '/',
  validate(agentCreateSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { name, system_prompt, temperature } = req.body;

    const agent = await createAgent(userId, { name, system_prompt, temperature });
    res.status(201).json({
      success: true,
      data: { agent },
    });
  })
);

// GET /api/agents
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const agents = await getAgents(userId);

    res.status(200).json({
      success: true,
      data: { agents },
    });
  })
);

// GET /api/agents/:id
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const agentId = req.params.id;

    const agent = await getAgentById(userId, agentId);
    if (!agent) {
      res.status(404).json({
        success: false,
        message: 'Agent not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { agent },
    });
  })
);

// PATCH /api/agents/:id
router.patch(
  '/:id',
  validate(agentUpdateSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const agentId = req.params.id;

    try {
      const agent = await updateAgent(userId, agentId, req.body);
      res.status(200).json({
        success: true,
        data: { agent },
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  })
);

// DELETE /api/agents/:id
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const agentId = req.params.id;

    try {
      await deleteAgent(userId, agentId);
      res.status(200).json({
        success: true,
        data: null,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  })
);

export default router;
