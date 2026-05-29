import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

async function runMigrations() {
  logger.info('DATABASE', 'Starting database migrations...');
  try {
    // 1. Establish a temporary, separate client to create the extension
    logger.info('DATABASE', 'Checking/enabling pgvector database extension (isolated client)...');
    
    const sslOption = config.DATABASE_URL.includes('sslmode=require') || config.DATABASE_URL.includes('ssl=true')
      ? { rejectUnauthorized: false }
      : undefined;

    const tempClient = new pg.Client({
      connectionString: config.DATABASE_URL,
      ssl: sslOption,
    });
    
    await tempClient.connect();
    await tempClient.query('CREATE EXTENSION IF NOT EXISTS vector;');
    await tempClient.end();
    logger.info('DATABASE', 'pgvector extension active. Initializing Drizzle...');

    // 2. Now dynamic import connection.js so a brand new pool is initialized AFTER the vector type is registered
    const { db, pool } = await import('./connection.js');
    
    // 3. Run migration
    await migrate(db, { migrationsFolder: './drizzle' });
    logger.info('DATABASE', 'Database migrations completed successfully!');
    
    // 4. Close the main pool
    await pool.end();
  } catch (error) {
    logger.error('ERROR', 'Database migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

