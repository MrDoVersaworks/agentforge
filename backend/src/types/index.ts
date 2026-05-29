import { z } from 'zod';

export interface UserPayload {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

// Auth Request DTOs
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(1, 'Name is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const geminiKeySchema = z.object({
  gemini_key: z.string().min(1, 'API Key is required'),
});

export const updateSettingsSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  gemini_model: z.enum(['gemini-2.5-flash', 'gemini-2.5-pro']).optional(),
});

// Agent DTOs
export const agentCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  system_prompt: z.string().min(1, 'System prompt is required'),
  temperature: z.number().min(0).max(2).default(0.7),
});

export const agentUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  system_prompt: z.string().min(1, 'System prompt is required').optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// Conversation / Chat DTOs
export const conversationCreateSchema = z.object({
  agent_id: z.string().uuid('Invalid agent ID'),
  title: z.string().min(1, 'Title is required').default('New Chat'),
});

export const messageSendSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  stream: z.boolean().default(false),
});
