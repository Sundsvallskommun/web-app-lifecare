import { REDIS_CONFIG, SESSION_MAX_AGE_MS } from '@config';
import { RedisStore } from 'connect-redis';
import session from 'express-session';
import createFileStore from 'session-file-store';

import { logger } from './logger';
import { getRedisClient } from './redis';

const SESSION_TTL_SECONDS = SESSION_MAX_AGE_MS / 1000;
const SESSION_FILE_PATH = './data/sessions';

/**
 * Redis is mandatory when configured so a multi-pod deployment cannot silently
 * split sessions between local files. File storage is reserved for local setups
 * where Redis is deliberately absent.
 */
export async function createSessionStore(): Promise<session.Store> {
  if (REDIS_CONFIG.enabled) {
    const redisClient = await getRedisClient();

    if (!redisClient) {
      throw new Error('Redis is configured but no Redis client was created');
    }

    logger.info('Using Redis session store');
    return new RedisStore({ client: redisClient, prefix: `${REDIS_CONFIG.keyPrefix}:session:`, ttl: SESSION_TTL_SECONDS });
  }

  const FileStore = createFileStore(session);
  logger.info('Using file-based session store (Redis is not configured)');
  return new FileStore({ ttl: SESSION_TTL_SECONDS, path: SESSION_FILE_PATH });
}
