export type LogCategory = 'AUTH' | 'DATABASE' | 'SERVER' | 'AI' | 'KNOWLEDGE' | 'CHAT' | 'SETTINGS' | 'ERROR' | 'TRACE';

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function write(level: 'INFO' | 'WARN' | 'ERROR', category: LogCategory, message: string, data?: unknown) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    ...(data === undefined ? {} : { data }),
  };
  const line = JSON.stringify(payload) + '\n';
  if (level === 'ERROR') process.stderr.write(line);
  else process.stdout.write(line);
}

export const logger = {

  info: (category: LogCategory, message: string, data?: unknown) => write('INFO', category, message, data),

  warn: (category: LogCategory, message: string, data?: unknown) => write('WARN', category, message, data),

  error: (category: LogCategory, message: string, error?: unknown) => write(
    'ERROR',
    category,
    message,
    error instanceof Error ? { error: error.message, stack: error.stack } : error
  ),

