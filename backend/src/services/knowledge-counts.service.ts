import { count, inArray } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { knowledgeChunks, knowledgeDocuments } from '../db/schema.js';

export interface AgentKnowledgeCounts {
  document_count: number;
  chunk_count: number;
}

export async function getAgentKnowledgeCounts(agentIds: string[]): Promise<Map<string, AgentKnowledgeCounts>> {
  const counts = new Map<string, AgentKnowledgeCounts>();

  if (agentIds.length === 0) {
    return counts;
  }

  const [documentRows, chunkRows] = await Promise.all([
    db
      .select({
        agent_id: knowledgeDocuments.agent_id,
        document_count: count(),
      })
      .from(knowledgeDocuments)
      .where(inArray(knowledgeDocuments.agent_id, agentIds))
      .groupBy(knowledgeDocuments.agent_id),
    db
      .select({
        agent_id: knowledgeChunks.agent_id,
        chunk_count: count(),
      })
      .from(knowledgeChunks)
      .where(inArray(knowledgeChunks.agent_id, agentIds))
      .groupBy(knowledgeChunks.agent_id),
  ]);

  for (const agentId of agentIds) {
    counts.set(agentId, { document_count: 0, chunk_count: 0 });
  }

  for (const row of documentRows) {
    counts.get(row.agent_id)!.document_count = row.document_count;
  }

  for (const row of chunkRows) {
    counts.get(row.agent_id)!.chunk_count = row.chunk_count;
  }

  return counts;
}

export async function getDocumentChunkCounts(documentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  if (documentIds.length === 0) {
    return counts;
  }

  const rows = await db
    .select({
      document_id: knowledgeChunks.document_id,
      chunk_count: count(),
    })
    .from(knowledgeChunks)
    .where(inArray(knowledgeChunks.document_id, documentIds))
    .groupBy(knowledgeChunks.document_id);

  for (const documentId of documentIds) {
    counts.set(documentId, 0);
  }

  for (const row of rows) {
    counts.set(row.document_id, row.chunk_count);
  }

  return counts;
}
