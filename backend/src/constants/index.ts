// ================================================================
// AgentForge Backend — Centralized Constants
// ================================================================

// ── Authentication ──
export const REFRESH_COOKIE_NAME = 'agentforge_refresh_token';
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const ACCESS_TOKEN_EXPIRY = '15m';
export const BCRYPT_SALT_ROUNDS = 10;

// ── Rate Limiting ──
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const AUTH_RATE_LIMIT_MAX = 20;
export const API_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const API_RATE_LIMIT_MAX = 200;

// ── Knowledge Pipeline ──
export const CHUNK_SIZE = 800;
export const CHUNK_OVERLAP = 200;
export const EMBEDDING_MODEL = 'text-embedding-004';
export const EMBEDDING_DIMENSIONS = 768;

// ── Chat / RAG ──
export const RAG_TOP_K = 5;
export const RAG_SIMILARITY_THRESHOLD = 0.3;
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// ── Server ──
export const JSON_BODY_LIMIT = '10mb';
