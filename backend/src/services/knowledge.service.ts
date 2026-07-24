import { and, eq } from 'drizzle-orm';
import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  KNOWLEDGE_DOCUMENT_QUERY_LIMIT,
  KNOWLEDGE_EMBEDDING_CONCURRENCY,
} from '../config/constants.js';
import { db } from '../db/connection.js';
import {
  agents,
  knowledgeChunks,
  knowledgeDocuments,
  users,
} from '../db/schema.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { decrypt } from './crypto.service.js';
import { generateEmbedding } from './gemini.service.js';

interface AddDocumentInput {
  filename: string;
  contentText: string;
}

interface EmbeddedChunk {
  chunkText: string;
  embedding: number[];
}


export function chunkText(
  text: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): string[] {
  if (text.trim().length === 0) {
    throw new Error('[ERR_DOCUMENT_CONTENT_EMPTY] Document content cannot be empty.');
  }
  if (!Number.isFinite(chunkSize) || !Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new Error('[ERR_CHUNK_SIZE_INVALID] Chunk size must be a positive integer.');
  }
  if (!Number.isFinite(overlap) || !Number.isInteger(overlap) || overlap < 0) {
    throw new Error('[ERR_CHUNK_OVERLAP_INVALID] Chunk overlap must be a non-negative integer.');
  }
  if (overlap >= chunkSize) {
    throw new Error('[ERR_CHUNK_RANGE_INVALID] Chunk overlap must be smaller than chunk size.');
  }

  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    chunks.push(text.substring(index, index + chunkSize));
    index += chunkSize - overlap;
  }

  return chunks;
}

async function requireOwnedAgent(userId: string, agentId: string): Promise<void> {
  const agentRows = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.user_id, userId)))
    .limit(1);

  if (agentRows.length === 0) {
    throw new AppError('[ERR_AGENT_NOT_FOUND] Agent not found or unauthorized.', 404);
  }
}

async function requireGeminiKey(userId: string): Promise<string> {
  const userRows = await db
    .select({
      encrypted_gemini_key: users.encrypted_gemini_key,
      gemini_key_iv: users.gemini_key_iv,
      gemini_key_tag: users.gemini_key_tag,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRows.length === 0) {
    throw new AppError('[ERR_USER_NOT_FOUND] User account not found.', 404);
  }

  const user = userRows[0];
  if (
    user.encrypted_gemini_key === null ||
    user.gemini_key_iv === null ||
    user.gemini_key_tag === null
  ) {
    throw new AppError(
      '[ERR_GEMINI_KEY_MISSING] Configure your Gemini API Key in Settings first.',
      400
    );
  }

  return decrypt({
    encryptedText: user.encrypted_gemini_key,
    iv: user.gemini_key_iv,
    tag: user.gemini_key_tag,
  });
}

async function generateEmbeddings(
  geminiKey: string,
  textChunks: string[]
): Promise<EmbeddedChunk[]> {
  const embeddings: EmbeddedChunk[] = [];

  for (
    let index = 0;
    index < textChunks.length;
    index += KNOWLEDGE_EMBEDDING_CONCURRENCY
  ) {
    const batch = textChunks.slice(index, index + KNOWLEDGE_EMBEDDING_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (chunk) => generateEmbedding(geminiKey, chunk))
    );

    for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
      const result = results[resultIndex];
      if (result.status === 'rejected') {
        throw new Error(
          '[ERR_KNOWLEDGE_EMBEDDING_FAILED] Failed to embed a knowledge chunk.',
          { cause: result.reason }
        );
      }
      embeddings.push({
        chunkText: batch[resultIndex],
        embedding: result.value,
      });
    }
  }

  return embeddings;
}

async function persistDocument(
  agentId: string,
  input: AddDocumentInput,
  embeddings: EmbeddedChunk[]
) {
  return db.transaction(async (transaction) => {
    const documents = await transaction
      .insert(knowledgeDocuments)
      .values({
        agent_id: agentId,
        filename: input.filename,
        content_text: input.contentText,
      })
      .returning();

    if (documents.length === 0) {
      throw new Error('[ERR_DOCUMENT_CREATE_FAILED] Failed to create knowledge document.');
    }

    const document = documents[0];
    await transaction.insert(knowledgeChunks).values(
      embeddings.map((item) => ({
        document_id: document.id,
        agent_id: agentId,
        chunk_text: item.chunkText,
        embedding: item.embedding,
      }))
    );

    return document;
  });
}

export async function addDocument(
  userId: string,
  agentId: string,
  input: AddDocumentInput
) {
  logger.info('KNOWLEDGE', 'Uploading document for agent ' + agentId + ' by user ' + userId);
  await requireOwnedAgent(userId, agentId);
  const geminiKey = await requireGeminiKey(userId);
  const textChunks = chunkText(input.contentText);
  const embeddings = await generateEmbeddings(geminiKey, textChunks);
  const document = await persistDocument(agentId, input, embeddings);

  logger.info('KNOWLEDGE', 'Successfully integrated document: ' + input.filename);
  return document;
}

export async function getDocuments(userId: string, agentId: string) {
  logger.info('KNOWLEDGE', 'Listing documents for agent: ' + agentId);
  await requireOwnedAgent(userId, agentId);

  return db
    .select({
      id: knowledgeDocuments.id,
      filename: knowledgeDocuments.filename,
      created_at: knowledgeDocuments.created_at,
    })
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.agent_id, agentId))
    .limit(KNOWLEDGE_DOCUMENT_QUERY_LIMIT);
}

export async function deleteDocument(
  userId: string,
  agentId: string,
  documentId: string
): Promise<void> {
  logger.info('KNOWLEDGE', 'Deleting document: ' + documentId + ' for agent: ' + agentId);
  await requireOwnedAgent(userId, agentId);

  const deleted = await db
    .delete(knowledgeDocuments)
    .where(
      and(
        eq(knowledgeDocuments.id, documentId),
        eq(knowledgeDocuments.agent_id, agentId)
      )
    )
    .returning({ id: knowledgeDocuments.id });

  if (deleted.length === 0) {
    throw new AppError('[ERR_DOCUMENT_NOT_FOUND] Document not found or unauthorized.', 404);
  }
}