import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

const EMBEDDING_DIMENSION = 768;
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-004';

type ChatHistoryEntry = {
  role: 'user' | 'model';
  content: string;
};

type GeminiHistoryEntry = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item: unknown) => typeof item === 'number' && Number.isFinite(item))
  );
}

function validateModelName(modelName: string): void {
  if (modelName.trim().length === 0) {
    throw new Error('[ERR_GEMINI_MODEL_MISSING] A Gemini model name is required.');
  }
}

function buildContextText(contextChunks: string[]): string {
  // Retrieval can validly produce no matches; the user request remains complete without RAG context.
  if (contextChunks.length === 0) {
    return '';
  }

  return (
    'Retrieved Relevant Knowledge Context:\n---\n' +
    contextChunks.join('\n\n') +
    '\n---\n\n'
  );
}

function toGeminiHistory(history: ChatHistoryEntry[]): GeminiHistoryEntry[] {
  return history.map((entry) => ({
    role: entry.role,
    parts: [{ text: entry.content }],
  }));
}

export async function generateEmbedding(
  apiKey: string,
  text: string
): Promise<number[]> {
  logger.info('AI', 'Generating embedding for text (length: ' + text.length + ')');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: DEFAULT_EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    const embeddingValues: unknown = result.embedding.values;

    if (!isNumberArray(embeddingValues) || embeddingValues.length === 0) {
      throw new Error('[ERR_GEMINI_EMBEDDING_INVALID] Gemini API returned an invalid embedding.');
    }

    let normalizedEmbedding = embeddingValues;
    if (normalizedEmbedding.length > EMBEDDING_DIMENSION) {
      normalizedEmbedding = normalizedEmbedding.slice(0, EMBEDDING_DIMENSION);
    } else if (normalizedEmbedding.length < EMBEDDING_DIMENSION) {
      const padded = new Array<number>(EMBEDDING_DIMENSION).fill(0);
      for (let index = 0; index < normalizedEmbedding.length; index += 1) {
        padded[index] = normalizedEmbedding[index];
      }
      normalizedEmbedding = padded;
    }

    return normalizedEmbedding;
  } catch (error: unknown) {
    logger.error('AI', 'Embedding generation failed:', error);
    throw new Error(
      '[ERR_EMBEDDING_GENERATION] Failed to generate embedding from Gemini API. Please check your API key.',
      { cause: error }
    );
  }
}

export async function generateChatResponse(
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  temperature: number,
  history: ChatHistoryEntry[],
  currentMessage: string,
  contextChunks: string[]
): Promise<string> {
  logger.info('AI', 'Generating non-streaming response using ' + modelName);

  try {
    validateModelName(modelName);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature },
      systemInstruction: systemPrompt,
    });

    const contextText = buildContextText(contextChunks);
    const chatHistory = toGeminiHistory(history);

    const chat = model.startChat({ history: chatHistory });
    const fullPrompt = contextText + 'User Request: ' + currentMessage;
    const result = await chat.sendMessage(fullPrompt);
    const responseText = result.response.text();
    if (responseText.trim().length === 0) {
      throw new Error('[ERR_GEMINI_RESPONSE_EMPTY] Gemini API returned an empty response.');
    }

    return responseText;
  } catch (error: unknown) {
    logger.error('AI', 'Chat response generation failed:', error);
    throw new Error('[ERR_CHAT_GENERATION] Failed to generate response from Gemini API.', {
      cause: error,
    });
  }
}

export async function generateChatResponseStream(
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  temperature: number,
  history: ChatHistoryEntry[],
  currentMessage: string,
  contextChunks: string[],
  onChunk: (text: string) => void
): Promise<string> {
  logger.info('AI', 'Generating streaming response using ' + modelName);

  try {
    validateModelName(modelName);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { temperature },
      systemInstruction: systemPrompt,
    });

    const contextText = buildContextText(contextChunks);
    const chatHistory = toGeminiHistory(history);

    const chat = model.startChat({ history: chatHistory });
    const fullPrompt = contextText + 'User Request: ' + currentMessage;
    const result = await chat.sendMessageStream(fullPrompt);

    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      onChunk(chunkText);
    }

    if (fullText.trim().length === 0) {
      throw new Error('[ERR_GEMINI_STREAM_EMPTY] Gemini API returned an empty response.');
    }

    return fullText;
  } catch (error: unknown) {
    logger.error('AI', 'Streaming chat response failed:', error);
    throw new Error(
      '[ERR_CHAT_STREAM_GENERATION] Failed to generate streaming response from Gemini API.',
      { cause: error }
    );
  }
}