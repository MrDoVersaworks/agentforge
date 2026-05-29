import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

const EMBEDDING_DIMENSION = 768;
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-004';

export async function generateEmbedding(
  apiKey: string,
  text: string
): Promise<number[]> {
  logger.info('AI', `Generating embedding for text (length: ${text.length})`);
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: DEFAULT_EMBEDDING_MODEL });
    const result = await model.embedContent(text);
    let embedding = result.embedding.values;

    if (!embedding || embedding.length === 0) {
      throw new Error('Gemini API returned an empty embedding.');
    }

    // Ensure dimension is exactly 768
    if (embedding.length > EMBEDDING_DIMENSION) {
      embedding = embedding.slice(0, EMBEDDING_DIMENSION);
    } else if (embedding.length < EMBEDDING_DIMENSION) {
      const padded = new Array(EMBEDDING_DIMENSION).fill(0);
      for (let i = 0; i < embedding.length; i++) {
        padded[i] = embedding[i];
      }
      embedding = padded;
    }

    return embedding;
  } catch (error: unknown) {
    logger.error('AI', 'Embedding generation failed:', error);
    throw new Error('Failed to generate embedding from Gemini API. Please check your API key.');
  }
}

export async function generateChatResponse(
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  temperature: number,
  history: { role: 'user' | 'model'; content: string }[],
  currentMessage: string,
  contextChunks: string[]
): Promise<string> {
  logger.info('AI', `Generating non-streaming response using ${modelName}`);
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Construct rich prompt with RAG context
    const contextText = contextChunks.length > 0 
      ? `Retrieved Relevant Knowledge Context:\n---\n${contextChunks.join('\n\n')}\n---\n\n`
      : '';

    const model = genAI.getGenerativeModel({
      model: modelName || 'gemini-2.5-flash',
      generationConfig: { temperature },
      systemInstruction: systemPrompt,
    });

    const chatHistory = history.map((h) => ({
      role: h.role,
      parts: [{ text: h.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
    });

    const fullPrompt = `${contextText}User Request: ${currentMessage}`;
    const result = await chat.sendMessage(fullPrompt);
    const response = result.response;
    return response.text();
  } catch (error: unknown) {
    logger.error('AI', 'Chat response generation failed:', error);
    throw new Error('Failed to generate response from Gemini API.');
  }
}

export async function generateChatResponseStream(
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  temperature: number,
  history: { role: 'user' | 'model'; content: string }[],
  currentMessage: string,
  contextChunks: string[],
  onChunk: (text: string) => void
): Promise<string> {
  logger.info('AI', `Generating streaming response using ${modelName}`);
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const contextText = contextChunks.length > 0 
      ? `Retrieved Relevant Knowledge Context:\n---\n${contextChunks.join('\n\n')}\n---\n\n`
      : '';

    const model = genAI.getGenerativeModel({
      model: modelName || 'gemini-2.5-flash',
      generationConfig: { temperature },
      systemInstruction: systemPrompt,
    });

    const chatHistory = history.map((h) => ({
      role: h.role,
      parts: [{ text: h.content }],
    }));

    const chat = model.startChat({
      history: chatHistory,
    });

    const fullPrompt = `${contextText}User Request: ${currentMessage}`;
    const result = await chat.sendMessageStream(fullPrompt);

    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      onChunk(chunkText);
    }
    
    return fullText;
  } catch (error: unknown) {
    logger.error('AI', 'Streaming chat response failed:', error);
    throw new Error('Failed to generate streaming response from Gemini API.');
  }
}
