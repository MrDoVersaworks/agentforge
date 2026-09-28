import { eq, and, asc, desc, gt, sql, count } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { conversations, messages, agents, users, knowledgeChunks, knowledgeDocuments } from '../db/schema.js';
import { decrypt } from './crypto.service.js';
import { generateEmbedding, generateChatResponse, generateChatResponseStream } from './gemini.service.js';
import { logger } from '../utils/logger.js';

export async function createConversation(userId: string, agentId: string, title?: string) {
  logger.info('DATABASE', `Creating conversation for agent: ${agentId} by user: ${userId}`);

  // Verify agent ownership
  const agentRows = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.user_id, userId)))
    .limit(1);

  if (agentRows.length === 0) {
    throw new Error('Agent not found or unauthorized.');
  }

  const result = await db
    .insert(conversations)
    .values({
      agent_id: agentId,
      user_id: userId,
      title: title ? title : 'New Conversation',
    })
    .returning();

  if (result.length === 0) {
    throw new Error('Failed to create conversation.');
  }

  return result[0];
}

export async function getConversations(userId: string, agentId: string) {
  logger.info('DATABASE', `Listing conversations for agent: ${agentId} of user: ${userId}`);
  return db
    .select()
    .from(conversations)
    .where(and(eq(conversations.agent_id, agentId), eq(conversations.user_id, userId)))
    .orderBy(desc(conversations.created_at));
}

export async function getMessages(userId: string, conversationId: string) {
  logger.info('DATABASE', `Retrieving messages for conversation: ${conversationId}`);

  // Verify conversation ownership
  const convoRows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.user_id, userId)))
    .limit(1);

  if (convoRows.length === 0) {
    throw new Error('Conversation not found or unauthorized.');
  }

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(asc(messages.created_at));
}

export async function deleteConversation(userId: string, conversationId: string) {
  logger.info('DATABASE', `Deleting conversation: ${conversationId} for user: ${userId}`);

  const result = await db
    .delete(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.user_id, userId)))
    .returning({ id: conversations.id });

  if (result.length === 0) {
    throw new Error('Conversation not found or unauthorized.');
  }
}

export async function queryRAGAndRespond(
  userId: string,
  conversationId: string,
  userMessage: string,
  stream: boolean,
  onChunk?: (text: string) => void,
  requestId?: string
): Promise<string> {
  logger.info('CHAT', 'RAG pipeline started', { requestId, conversationId, agentId });

  // 1. Verify ownership and fetch associated agent/user
  const convoRows = await db
    .select({
      id: conversations.id,
      agent_id: conversations.agent_id,
      user_id: conversations.user_id,
      agent_name: agents.name,
      system_prompt: agents.system_prompt,
      temperature: agents.temperature,
      encrypted_gemini_key: users.encrypted_gemini_key,
      gemini_key_iv: users.gemini_key_iv,
      gemini_key_tag: users.gemini_key_tag,
      gemini_model: users.gemini_model,
    })
    .from(conversations)
    .innerJoin(agents, eq(conversations.agent_id, agents.id))
    .innerJoin(users, eq(conversations.user_id, users.id))
    .where(and(eq(conversations.id, conversationId), eq(conversations.user_id, userId)))
    .limit(1);

  if (convoRows.length === 0) {
    throw new Error('Conversation not found or unauthorized.');
  }

  const convo = convoRows[0];

  if (!convo.encrypted_gemini_key) {
    throw new Error('Please configure your Gemini API Key in Settings first.');
  }
  if (!convo.gemini_key_iv) {
    throw new Error('Please configure your Gemini API Key in Settings first.');
  }
  if (!convo.gemini_key_tag) {
    throw new Error('Please configure your Gemini API Key in Settings first.');
  }

  const geminiKey = decrypt({
    encryptedText: convo.encrypted_gemini_key,
    iv: convo.gemini_key_iv,
    tag: convo.gemini_key_tag,
  });

  // 2. Insert user message in database
  await db.insert(messages).values({
    conversation_id: conversationId,
    role: 'user',
    content: userMessage,
  });

  // 3. Search Vector Database for semantic chunks (RAG)
  logger.info('CHAT', 'Generating message query embedding...');
  let contextChunks: string[] = [];
  try {
    const queryEmbedding = await generateEmbedding(geminiKey, userMessage);
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    const inventoryRows = await db
      .select({ chunkCount: count() })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.agent_id, convo.agent_id));
    const availableChunkCount = Number(inventoryRows[0]?.chunkCount ?? 0);

    // pgvector cosine similarity search
    const cosineDistance = sql<number>`${knowledgeChunks.embedding} <=> ${vectorLiteral}::vector`;
    const similarity = sql<number>`1 - (${cosineDistance})`;

    const results = await db
      .select({
        chunk_text: knowledgeChunks.chunk_text,
        similarity,
      })
      .from(knowledgeChunks)
      .where(
        and(
          eq(knowledgeChunks.agent_id, convo.agent_id),
          gt(similarity, 0.3)
        )
      )
      .orderBy(asc(cosineDistance))
      .limit(5);

    contextChunks = results.map((row) => row.chunk_text);
    logger.info('CHAT', 'RAG retrieval completed', {
      requestId,
      conversationId,
      agentId: convo.agent_id,
      queryEmbeddingDimensions: queryEmbedding.length,
      availableChunkCount,
      similarityThreshold: 0.3,
      retrievedChunkCount: contextChunks.length,
      retrievedSimilarities: results.map((row) => Number(row.similarity)),
      groundedContextAvailable: contextChunks.length > 0,
    });
  } catch (vectorError) {
    logger.warn('CHAT', 'RAG vector lookup failed; proceeding with conversation history only', { requestId, conversationId, agentId: convo.agent_id, error: vectorError instanceof Error ? vectorError.message : String(vectorError) });
  }

  // 4. Retrieve chat history (previous 15 messages for short, high-quality context)
  const historyRows = await db
    .select({
      role: messages.role,
      content: messages.content,
    })
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(asc(messages.created_at));

  // The last message is the user message we just inserted, exclude it from history array passed to Gemini
  const chatHistory = historyRows
    .slice(0, -1)
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      content: msg.content,
    }));

  let aiResponse = '';

  if (stream && onChunk) {
    // 5a. Streaming generation
    aiResponse = await generateChatResponseStream(
      geminiKey,
      convo.gemini_model ? convo.gemini_model : 'gemini-2.5-flash',
      convo.system_prompt,
      convo.temperature,
      chatHistory,
      userMessage,
      contextChunks,
      onChunk
    );
  } else {
    // 5b. Non-streaming generation
    aiResponse = await generateChatResponse(
      geminiKey,
      convo.gemini_model ? convo.gemini_model : 'gemini-2.5-flash',
      convo.system_prompt,
      convo.temperature,
      chatHistory,
      userMessage,
      contextChunks
    );
  }

  // 6. Save AI model response in database
  await db.insert(messages).values({
    conversation_id: conversationId,
    role: 'model',
    content: aiResponse,
  });

  logger.info('CHAT', 'Chat response generated', { requestId, conversationId, agentId: convo.agent_id, retrievedContextChunkCount: contextChunks.length, groundedContextAvailable: contextChunks.length > 0 });
  return aiResponse;
}
