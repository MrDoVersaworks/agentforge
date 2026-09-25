import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// The production database belongs to the backend deployment. The frontend
// build must never require or access DATABASE_URL. Production migrations are
// executed by backend/scripts/vercel-build.mjs in the backend Vercel project.
console.log('[DATABASE] Frontend deployment: database migrations are owned by the backend deployment.');
console.log('[BUILD] Building AgentForge frontend.');
run('npx', ['next', 'build']);
