import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  AES_ENCRYPTION_KEY: z.string().length(64, 'AES_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)'),
  PORT: z.string().default('5003'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
});

type EnvConfig = z.infer<typeof envSchema>;

function validateConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missingVars = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    );
    const errorMessage = [
      '[ERR_CONFIG_VALIDATION] AgentForge server refused to start. Missing or invalid environment variables:',
      ...missingVars,
      '',
      'Check your .env file against .env.example.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  return result.data;
}

export const config: EnvConfig = validateConfig();
