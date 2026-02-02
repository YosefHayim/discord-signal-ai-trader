import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { createLogger } from '../utils/logger.js';
import * as schema from './schema.js';

const logger = createLogger('database');

let db: NeonHttpDatabase<typeof schema> | null = null;
let sql: NeonQueryFunction<false, false> | null = null;
let isConnected = false;

export async function connectDatabase(url: string): Promise<void> {
  if (isConnected && db) {
    logger.debug('Already connected to Neon database');
    return;
  }

  try {
    logger.info('Connecting to Neon database...');
    
    sql = neon(url);
    db = drizzle(sql, { schema });
    
    await sql`SELECT 1`;
    
    isConnected = true;
    logger.info('Connected to Neon database successfully');

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to connect to Neon database', { error: message });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  
  db = null;
  sql = null;
  isConnected = false;
  logger.info('Disconnected from Neon database');
}

export function isDatabaseConnected(): boolean {
  return isConnected && db !== null;
}

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
}

export function getSql(): NeonQueryFunction<false, false> {
  if (!sql) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return sql;
}
