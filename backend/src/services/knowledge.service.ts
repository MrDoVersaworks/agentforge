import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { agents, knowledgeDocuments, knowledgeChunks, users } from '../db/schema.js';
import { decrypt } from './crypto.service.js';
import { generateEmbedding } from './gemini.service.js';
import { logger } from '../utils/logger.js';

interface AddDocumentInput {
  filename: string;
  contentText: string;
}

export function chunkText(text: string, chunkSize: number = 800, overlap: number = 150): string[] {
  const chunks: string[] = [];
  if (!text || text.trim().length === 0) return chunks;

  let i = 0;
  while (i < text.length) {
    const chunk = text.substring(i, i + chunkSize);
    chunks.push(chunk);
    i += chunkSize - overlap;
    // If the next index is beyond the text length, break
    if (i >= text.length) break;
  }
  return chunks;
}

export async function addDocument(userId: string, agentId: string, input: AddDocumentInput) {
  logger.info('KNOWLEDGE', `Uploading document for agent ${agentId} by user ${userId}`);

  // 1. Verify agent ownership
  const agentRows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.user_id, userId)))
    .limit(1);

  if (agentRows.length === 0) {
    throw new Error('Agent not found or unauthorized.');
  }

  // 2. Fetch and decrypt Gemini API key
  const userRows = await db
    .select({
      encrypted_gemini_key: users.encrypted_gemini_key,
      gemini_key_iv: users.gemini_key_iv,
      gemini_key_tag: users.gemini_key_tag,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = userRows[0];
  if (!user || !user.encrypted_gemini_key || !user.gemini_key_iv || !user.gemini_key_tag) {
    throw new Error('Please configure your Gemini API Key in Settings first.');
  }

  const geminiKey = decrypt({
    encryptedText: user.encrypted_gemini_key,
    iv: user.gemini_key_iv,
    tag: user.gemini_key_tag,
  });

  // 3. Perform text chunking
  const textChunks = chunkText(input.contentText);
  if (textChunks.length === 0) {
    throw new Error('Document content cannot be empty.');
  }

  // 4. Save the document metadata
  const docResult = await db
    .insert(knowledgeDocuments)
    .values({
      agent_id: agentId,
      filename: input.filename,
      content_text: input.contentText,
    })
    .returning();

  const doc = docResult[0];

  // 5. Generate embeddings in parallel batches (concurrency limit: 5)
  logger.info('KNOWLEDGE', `Generating embeddings for ${textChunks.length} chunks...`);

  const CONCURRENCY = 5;
  const allEmbeddings: { chunkText: string; embedding: number[] }[] = [];

  for (let i = 0; i < textChunks.length; i += CONCURRENCY) {
    const batch = textChunks.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((chunk) => generateEmbedding(geminiKey, chunk))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'rejected') {
        logger.error('KNOWLEDGE', `Error embedding chunk: ${batch[j].substring(0, 30)}...`, result.reason);
        // Clean up the document to avoid incomplete state
        await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, doc.id));
        throw new Error('Failed to embed knowledge chunk. Please verify your Gemini API key.');
      }
      allEmbeddings.push({ chunkText: batch[j], embedding: result.value });
    }
  }

  // 6. Batch insert all chunks in a single DB round-trip
  await db.insert(knowledgeChunks).values(
    allEmbeddings.map((item) => ({
      document_id: doc.id,
      agent_id: agentId,
      chunk_text: item.chunkText,
      embedding: item.embedding,
    }))
  );

  logger.info('KNOWLEDGE', `Successfully integrated document: ${input.filename} (${textChunks.length} chunks vector-embedded)`);
  return doc;
}

export async function getDocuments(userId: string, agentId: string) {
  logger.info('KNOWLEDGE', `Listing documents for agent: ${agentId} of user: ${userId}`);

  // Verify ownership
  const agentRows = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.user_id, userId)))
    .limit(1);

  if (agentRows.length === 0) {
    throw new Error('Agent not found or unauthorized.');
  }

  return db
    .select({
      id: knowledgeDocuments.id,
      filename: knowledgeDocuments.filename,
      created_at: knowledgeDocuments.created_at,
    })
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.agent_id, agentId));
}

export async function deleteDocument(userId: string, agentId: string, docId: string) {
  logger.info('KNOWLEDGE', `Deleting document: ${docId} for agent: ${agentId} of user: ${userId}`);

  // Verify ownership
  const agentRows = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.user_id, userId)))
    .limit(1);

  if (agentRows.length === 0) {
    throw new Error('Agent not found or unauthorized.');
  }

  // Delete document (cascade triggers deletion of knowledge_chunks automatically)
  const result = await db
    .delete(knowledgeDocuments)
    .where(and(eq(knowledgeDocuments.id, docId), eq(knowledgeDocuments.agent_id, agentId)))
    .returning({ id: knowledgeDocuments.id });

  if (result.length === 0) {
    throw new Error('Document not found or unauthorized.');
  }
}
