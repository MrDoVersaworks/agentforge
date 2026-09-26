import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/index.js';
import * as schema from './schema.js';

const { Pool } = pg;

const databaseUrl = new URL(config.DATABASE_URL);
const legacySslMode = databaseUrl.searchParams.get('sslmode');
const legacySsl = databaseUrl.searchParams.get('ssl');
databaseUrl.searchParams.delete('sslmode');
databaseUrl.searchParams.delete('ssl');

const sslOption = legacySslMode === 'require' || legacySsl === 'true'
  ? { rejectUnauthorized: false }
  : undefined;

const pool = new Pool({
  connectionString: databaseUrl.toString(),
  ssl: sslOption,
});

export const db = drizzle(pool, { schema });
export { pool };
