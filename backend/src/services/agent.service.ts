import { eq, and, desc, sql } from 'drizzle-orm';
import { AGENT_QUERY_LIMIT } from '../config/constants.js';
import { db } from '../db/connection.js';
import { agents } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { getAgentKnowledgeCounts } from './knowledge-counts.service.js';

interface CreateAgentInput {
  name: string;
  system_prompt: string;
  temperature: number;
}

export async function createAgent(userId: string, input: CreateAgentInput) {
  logger.info('DATABASE', 'Creating new agent for user: ' + userId);
  const result = await db
    .insert(agents)
    .values({
      user_id: userId,
      name: input.name,
      system_prompt: input.system_prompt,
      temperature: input.temperature,
    })
    .returning();

  if (result.length === 0) {
    throw new Error('[ERR_AGENT_CREATE_FAILED] Failed to create agent.');
  }

  const agent = await getAgentById(userId, result[0].id);
  if (agent === null) {
    throw new Error('[ERR_AGENT_CREATE_FAILED] Failed to load created agent.');
  }
  return agent;
}

export async function getAgents(userId: string) {
  logger.info('DATABASE', 'Retrieving agents for user: ' + userId);
  const result = await db
    .select({
      id: agents.id,
      user_id: agents.user_id,
      name: agents.name,
      system_prompt: agents.system_prompt,
      temperature: agents.temperature,
      created_at: agents.created_at,
      updated_at: agents.updated_at,
    })
    .from(agents)
    .where(eq(agents.user_id, userId))
    .orderBy(desc(agents.created_at))
    .limit(AGENT_QUERY_LIMIT);

  const counts = await getAgentKnowledgeCounts(result.map((agent) => agent.id));
  const enrichedResult = result.map((agent) => ({
    ...agent,
    document_count: counts.get(agent.id)?.document_count ?? 0,
    chunk_count: counts.get(agent.id)?.chunk_count ?? 0,
  }));

  logger.info('TRACE', 'Agent list query completed', {
    userId,
    agentCount: enrichedResult.length,
    agents: enrichedResult.map((agent) => ({
      agentId: agent.id,
      documentCount: agent.document_count,
      chunkCount: agent.chunk_count,
    })),
  });
  return enrichedResult;
}

export async function getAgentById(userId: string, agentId: string) {
  logger.info('DATABASE', 'Retrieving agent: ' + agentId + ' for user: ' + userId);
  const result = await db
    .select({
      id: agents.id,
      user_id: agents.user_id,
      name: agents.name,
      system_prompt: agents.system_prompt,
      temperature: agents.temperature,
      created_at: agents.created_at,
      updated_at: agents.updated_at,
    })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.user_id, userId)))
    .limit(1);

  if (result.length === 0) {
    logger.warn('TRACE', 'Agent detail query returned no agent', { userId, agentId });
    return null;
  }

  const counts = await getAgentKnowledgeCounts([agentId]);
  const enrichedAgent = {
    ...result[0],
    document_count: counts.get(agentId)?.document_count ?? 0,
    chunk_count: counts.get(agentId)?.chunk_count ?? 0,
  };

  logger.info('TRACE', 'Agent detail query completed', {
    userId,
    agentId,
    documentCount: enrichedAgent.document_count,
    chunkCount: enrichedAgent.chunk_count,
  });

  return enrichedAgent;
}

export async function updateAgent(
  userId: string,
  agentId: string,
  input: Partial<CreateAgentInput>
) {
  logger.info('DATABASE', 'Updating agent: ' + agentId + ' for user: ' + userId);

  const updateData = {
    ...input,
    updated_at: sql.raw('CURRENT_TIMESTAMP'),
  };

  const result = await db
    .update(agents)
    .set(updateData)
    .where(and(eq(agents.id, agentId), eq(agents.user_id, userId)))
    .returning();

  if (result.length === 0) {
    throw new AppError('[ERR_AGENT_NOT_FOUND] Agent not found or unauthorized.', 404);
  }

  const agent = await getAgentById(userId, agentId);
  if (agent === null) {
    throw new AppError('[ERR_AGENT_NOT_FOUND] Agent not found or unauthorized.', 404);
  }
  return agent;
}

export async function deleteAgent(userId: string, agentId: string): Promise<void> {
  logger.info('DATABASE', 'Deleting agent: ' + agentId + ' for user: ' + userId);
  const result = await db
    .delete(agents)
    .where(and(eq(agents.id, agentId), eq(agents.user_id, userId)))
    .returning({ id: agents.id });

  if (result.length === 0) {
    throw new AppError('[ERR_AGENT_NOT_FOUND] Agent not found or unauthorized.', 404);
  }
}
