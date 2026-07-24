import dotenv from 'dotenv';
import { z } from 'zod';
import { DEFAULT_PORT, MAX_PORT, MIN_PORT } from './constants.js';

dotenv.config();

const REQUIRED_AES_KEY_LENGTH = 64;

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  AES_ENCRYPTION_KEY: z.string().length(
    REQUIRED_AES_KEY_LENGTH,
    'AES_ENCRYPTION_KEY must be exactly ' + REQUIRED_AES_KEY_LENGTH + ' hex characters (32 bytes)'
  ),
  PORT: z.coerce.number().int().min(MIN_PORT).max(MAX_PORT).default(DEFAULT_PORT),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email address'),
});

type EnvConfig = z.infer<typeof envSchema>;

function validateConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missingVars = result.error.issues.map(
      (issue) => '  - ' + issue.path.join('.') + ': ' + issue.message
    );
    throw new Error(
      '[ERR_CONFIG_VALIDATION] AgentForge server refused to start. Missing or invalid environment variables:\n' +
        missingVars.join('\n') +
        '\n\nCheck your .env file against .env.example.'
    );
  }

  return result.data;
}

export const config: EnvConfig = validateConfig();