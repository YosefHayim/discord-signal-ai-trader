import { Redis } from 'ioredis';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('redis');

let redisConnection: Redis | null = null;

export function createRedisConnection(url: string): Redis {
  if (redisConnection) {
    logger.debug('Returning existing Redis connection');
    return redisConnection;
  }

  logger.info('Creating Redis connection', { url: url.replace(/\/\/.*@/, '//***@') });

  redisConnection = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries');
        return null;
      }
      const delay = Math.min(times * 200, 2000);
      logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
  });

  redisConnection.on('connect', () => {
    logger.info('Redis connected');
  });

  redisConnection.on('error', (err: Error) => {
    logger.error('Redis error', { error: err.message });
  });

  redisConnection.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return redisConnection;
}

export function getRedisConnection(): Redis | null {
  return redisConnection;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    logger.info('Closing Redis connection');
    await redisConnection.quit();
    redisConnection = null;
  }
}
