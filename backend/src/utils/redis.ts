import { REDIS_CONFIG } from '@config';
import { createClient } from 'redis';

import { logger } from './logger';

export type RedisClient = ReturnType<typeof createClient>;

const REDIS_CONNECT_TIMEOUT_MS = 10_000;
const REDIS_MAX_RECONNECT_ATTEMPTS = 5;

let redisClient: RedisClient | null = null;
let redisConnection: Promise<RedisClient> | null = null;
let closingRedisClient: RedisClient | null = null;

class RedisConnectionError extends Error {
  public readonly cause: unknown;

  public constructor(cause: unknown) {
    super(`Unable to connect to configured Redis: ${errorMessage(cause)}`);
    this.name = 'RedisConnectionError';
    this.cause = cause;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createConfiguredClient(): RedisClient {
  if (!REDIS_CONFIG.enabled) {
    throw new Error('Cannot create a Redis client without Redis configuration');
  }

  const { host, password, port } = REDIS_CONFIG;
  let hasConnected = false;
  const client = createClient({
    disableOfflineQueue: true,
    socket: {
      host,
      port,
      connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
      reconnectStrategy: retries => {
        if (!hasConnected && retries >= REDIS_MAX_RECONNECT_ATTEMPTS) {
          return new Error(`Redis reconnect attempts exhausted after ${retries} retries`);
        }

        return Math.min(retries * 100, 3_000);
      },
    },
    ...(password ? { password } : {}),
  });

  client.on('error', (error: unknown) => logger.error(`Redis error: ${errorMessage(error)}`));
  client.on('connect', () => logger.info(`Connected to Redis (${host}:${port})`));
  client.on('ready', () => {
    hasConnected = true;
  });
  client.on('reconnecting', () => logger.info('Redis reconnecting'));

  return client;
}

async function connectRedis(client: RedisClient, disposeOnFailure: boolean): Promise<RedisClient> {
  try {
    await client.connect();
    return client;
  } catch (error: unknown) {
    if (disposeOnFailure) {
      if (redisClient === client) {
        redisClient = null;
      }

      if (client.isOpen) {
        try {
          client.destroy();
        } catch (destroyError: unknown) {
          logger.warn(`Failed to destroy the Redis client after a connection error: ${errorMessage(destroyError)}`);
        }
      }
    }

    throw new RedisConnectionError(error);
  }
}

/**
 * Returns the single shared Redis client. When Redis is configured, all concurrent
 * callers await the same connection attempt and connection failures are propagated.
 * A null result therefore only means that Redis is deliberately not configured.
 */
export async function getRedisClient(): Promise<RedisClient | null> {
  if (!REDIS_CONFIG.enabled) {
    return null;
  }

  if (redisConnection) {
    return redisConnection;
  }

  if (redisClient?.isOpen) {
    return redisClient;
  }

  const disposeOnFailure = redisClient === null;
  const client = redisClient ?? createConfiguredClient();
  redisClient = client;

  const connection = connectRedis(client, disposeOnFailure);
  redisConnection = connection;

  try {
    return await connection;
  } finally {
    if (redisConnection === connection) {
      redisConnection = null;
    }
  }
}

/**
 * Reports whether Redis-backed dependencies can accept commands immediately.
 * Redis is optional, so an intentionally local file-backed setup is ready.
 */
export function isRedisReady(): boolean {
  return !REDIS_CONFIG.enabled || redisClient?.isReady === true;
}

export async function closeRedisClient(): Promise<void> {
  let client = redisClient ?? closingRedisClient;

  if (!client && redisConnection) {
    try {
      client = await redisConnection;
    } catch {
      return;
    }
  }

  redisClient = null;
  closingRedisClient = client;

  try {
    if (client?.isOpen) {
      await client.close();
    }
  } finally {
    if (closingRedisClient === client) {
      closingRedisClient = null;
    }
  }
}

/** Immediately releases Redis resources after the graceful shutdown deadline. */
export function destroyRedisClient(): void {
  const client = redisClient ?? closingRedisClient;
  redisClient = null;
  closingRedisClient = null;

  if (client?.isOpen) {
    client.destroy();
  }
}
