import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const frontendDir = resolve(process.cwd());
const backendDir = resolve(frontendDir, '../backend');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.VERCEL_ENV === 'production') {
  if (!process.env.DATABASE_URL) {
    console.error('[ERR_PRODUCTION_DATABASE_URL_MISSING] DATABASE_URL is required for the production migration gate.');
    process.exit(1);
  }

  console.log('[DATABASE] Production deployment: installing backend migration dependencies.');
  run('npm', ['ci'], backendDir);

  console.log('[DATABASE] Production deployment: applying committed migrations.');
  run('npm', ['run', 'db:migrate'], backendDir);
} else {
  console.log('[DATABASE] Non-production deployment: skipping production database migrations.');
}

console.log('[BUILD] Building AgentForge frontend.');
run('npx', ['next', 'build'], frontendDir);
