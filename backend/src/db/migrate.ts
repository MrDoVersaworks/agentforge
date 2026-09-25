import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import * as schema from './schema.js';

const MIGRATION_LOCK_KEY = 72674101;

async function runMigrations() {
  logger.info('DATABASE', 'Starting database migrations...');
  const sslOption = config.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : config.DATABASE_URL.includes('ssl=true')
      ? { rejectUnauthorized: false }
      : undefined;

  const client = new pg.Client({
    connectionString: config.DATABASE_URL,
    ssl: sslOption,
  });

  let lockAcquired = false;

  try {
    await client.connect();

    logger.info('DATABASE', 'Acquiring PostgreSQL migration lock...');
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);
    lockAcquired = true;
    logger.info('DATABASE', 'PostgreSQL migration lock acquired.');

    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    logger.info('DATABASE', 'pgvector extension active. Running committed migrations...');

    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: './drizzle' });

    logger.info('DATABASE', 'Database migrations completed successfully.');
  } catch (error) {
    logger.error('ERROR', 'Database migration failed:', error);
    process.exitCode = 1;
  } finally {
    if (lockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
        logger.info('DATABASE', 'PostgreSQL migration lock released.');
      } catch (unlockError) {
        logger.error('ERROR', 'Failed to release PostgreSQL migration lock:', unlockError);
        process.exitCode = 1;
      }
    }
    await client.end().catch((closeError) => {
      logger.error('ERROR', 'Failed to close migration database client:', closeError);
      process.exitCode = 1;
    });
  }
}

runMigrations().catch((error) => {
  logger.error('ERROR', 'Unhandled error during migration execution', error);
  process.exitCode = 1;
});
