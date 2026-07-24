import { config } from '../config/index.js';

export type LogCategory = 'AUTH' | 'DATABASE' | 'SERVER' | 'AI' | 'KNOWLEDGE' | 'CHAT' | 'SETTINGS' | 'ERROR';

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

const IS_DEV = config.NODE_ENV === 'development';

export const logger = {
  info: (category: LogCategory, message: string, data?: unknown) => {
    if (!IS_DEV) return;
    const color = category === 'DATABASE' ? colors.green : category === 'AI' ? colors.magenta : colors.cyan;
    process.stdout.write(
      `${colors.dim}[${new Date().toISOString()}]${colors.reset} ` +
      `${color}[${category}]${colors.reset} ` +
      `${message}\n`
    );
    if (data) {
      process.stdout.write(`${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}\n`);
    }
  },

  warn: (category: LogCategory, message: string, data?: unknown) => {
    if (!IS_DEV) return;
    process.stdout.write(
      `${colors.dim}[${new Date().toISOString()}]${colors.reset} ` +
      `${colors.yellow}[${category}]${colors.reset} ` +
      `${message}\n`
    );
    if (data) {
      process.stdout.write(`${colors.dim}${JSON.stringify(data, null, 2)}${colors.reset}\n`);
    }
  },

  error: (category: LogCategory, message: string, error?: unknown) => {
    process.stderr.write(
      `${colors.dim}[${new Date().toISOString()}]${colors.reset} ` +
      `${colors.red}[${category}]${colors.reset} ` +
      `${colors.red}${message}${colors.reset}\n`
    );
    if (error) {
      process.stderr.write(`${colors.red}${error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}${colors.reset}\n`);
    }
  },
};
