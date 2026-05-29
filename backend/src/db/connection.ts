import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../config/index.js';
import * as schema from './schema.js';

const { Pool } = pg;

const sslOption = config.DATABASE_URL.includes('sslmode=require') || config.DATABASE_URL.includes('ssl=true')
  ? { rejectUnauthorized: false }
  : undefined;

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: sslOption,
});

export const db = drizzle(pool, { schema });
export { pool };
