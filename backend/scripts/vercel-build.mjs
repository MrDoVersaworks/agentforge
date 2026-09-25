import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
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

  console.log('[DATABASE] Production backend deployment: applying committed migrations.');
  run('npm', ['run', 'db:migrate']);
} else {
  console.log('[DATABASE] Non-production backend deployment: skipping production database migrations.');
}

console.log('[BUILD] Building AgentForge backend.');
run('npx', ['tsc']);
