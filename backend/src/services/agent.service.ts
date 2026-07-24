import { eq, and, desc, sql } from 'drizzle-orm';
import { AGENT_QUERY_LIMIT } from '../config/constants.js';
import { db } from '../db/connection.js';
import { agents } from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

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

  return result[0];
}

export async function getAgents(userId: string) {
  logger.info('DATABASE', 'Retrieving agents for user: ' + userId);
  return db
    .select()
    .from(agents)
    .where(eq(agents.user_id, userId))
    .orderBy(desc(agents.created_at))
    .limit(AGENT_QUERY_LIMIT);
}

export async function getAgentById(userId: string, agentId: string) {
  logger.info('DATABASE', 'Retrieving agent: ' + agentId + ' for user: ' + userId);
  const result = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.user_id, userId)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0];
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

  return result[0];
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