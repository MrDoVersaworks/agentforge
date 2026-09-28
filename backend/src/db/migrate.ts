import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import * as schema from './schema.js';

const MIGRATION_LOCK_KEY = 72674101;

async function runMigrations() {
  logger.info('DATABASE', 'Starting database migrations...');
  // pg emits a warning when legacy SSL query parameters remain in the
  // connection string. Normalize them into the explicit pg client option so
  // production TLS behavior is deliberate and the warning is removed.
  const databaseUrl = new URL(config.DATABASE_URL);
  const legacySslMode = databaseUrl.searchParams.get('sslmode');
  const legacySsl = databaseUrl.searchParams.get('ssl');
  databaseUrl.searchParams.delete('sslmode');
  databaseUrl.searchParams.delete('ssl');
  const sslOption = legacySslMode === 'require' || legacySsl === 'true'
    ? { rejectUnauthorized: false }
    : undefined;

  const client = new pg.Client({
    connectionString: databaseUrl.toString(),
    ssl: sslOption,
  });

  let lockAcquired = false;
  const db = drizzle(client, { schema });

  try {
    await client.connect();

    logger.info('DATABASE', 'Acquiring PostgreSQL migration lock...');
    await db.execute(sql`SELECT pg_advisory_lock(${MIGRATION_LOCK_KEY})`);
    lockAcquired = true;
    logger.info('DATABASE', 'PostgreSQL migration lock acquired.');

    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    logger.info('DATABASE', 'pgvector extension active. Running committed migrations...');

    await migrate(db, { migrationsFolder: './drizzle' });

    logger.info('DATABASE', 'Database migrations completed successfully.');
  } catch (error) {
    logger.error('ERROR', 'Database migration failed:', error);
    process.exitCode = 1;
  } finally {
    if (lockAcquired) {
      try {
        await db.execute(sql`SELECT pg_advisory_unlock(${MIGRATION_LOCK_KEY})`);
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
