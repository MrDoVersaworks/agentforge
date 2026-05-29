// ================================================================
// AgentForge — Frontend Shared Types
// ================================================================

// ── User ──
export interface User {
  id: string;
  email: string;
  name: string;
  hasGeminiKey: boolean;
  geminiModel: string;
  createdAt: string;
}

// ── Auth ──
export interface AuthTokens {
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

// ── Agent ──
export interface Agent {
  id: string;
  userId: string;
  name: string;
  systemPrompt: string;
  temperature: number;
  documentCount: number;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentPayload {
  name: string;
  systemPrompt: string;
  temperature?: number;
}

export interface UpdateAgentPayload {
  name?: string;
  systemPrompt?: string;
  temperature?: number;
}

// ── Knowledge Document ──
export interface KnowledgeDocument {
  id: string;
  agentId: string;
  filename: string;
  chunkCount: number;
  createdAt: string;
}

export interface UploadDocumentPayload {
  filename: string;
  content: string;
}

// ── Conversation ──
export interface Conversation {
  id: string;
  agentId: string;
  title: string;
  createdAt: string;
}

// ── Message ──
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'model';
  content: string;
  createdAt: string;
}

export interface SendMessagePayload {
  message: string;
  conversationId?: string;
}

// ── Settings ──
export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface SaveCredentialsPayload {
  geminiApiKey: string;
  geminiModel?: string;
}

// ── API Response Envelope ──
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Toast ──
export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}
