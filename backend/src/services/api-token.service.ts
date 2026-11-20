import { randomInt, randomUUID } from 'node:crypto';

import { CLIENT_KEY, CLIENT_SECRET, REDIS_CONFIG } from '@config';
import { logger } from '@utils/logger';
import { getRedisClient } from '@utils/redis';
import { apiURL } from '@utils/util';
import axios from 'axios';
import qs from 'qs';

import { HttpException } from '@/exceptions/HttpException';

interface Token {
  access_token: string;
  expires_in: number;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

interface RedisTokenKeys {
  lock: string;
  token: string;
}

type RedisClient = NonNullable<Awaited<ReturnType<typeof getRedisClient>>>;

const TOKEN_REFRESH_MARGIN_MS = 10_000;
const TOKEN_REQUEST_TIMEOUT_MS = 30_000;
const LOCK_TTL_MS = TOKEN_REQUEST_TIMEOUT_MS + 10_000;
const LOCK_WAIT_TIMEOUT_MS = LOCK_TTL_MS + 5_000;
const LOCK_RETRY_INITIAL_MS = 100;
const LOCK_RETRY_MAX_MS = 1_000;
const LOCK_RETRY_JITTER_FACTOR = 0.25;

const RELEASE_LOCK_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

let localCachedToken: CachedToken | null = null;
let localTokenRequest: Promise<string> | null = null;

function isToken(value: unknown): value is Token {
  return (
    typeof value === 'object' &&
    value !== null &&
    'access_token' in value &&
    typeof value.access_token === 'string' &&
    value.access_token.length > 0 &&
    'expires_in' in value &&
    typeof value.expires_in === 'number' &&
    Number.isFinite(value.expires_in) &&
    value.expires_in > 0
  );
}

function isCachedToken(value: unknown): value is CachedToken {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accessToken' in value &&
    typeof value.accessToken === 'string' &&
    value.accessToken.length > 0 &&
    'expiresAt' in value &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt)
  );
}

function getCacheLifetimeMs(expiresInSeconds: number): number {
  const tokenLifetimeMs = Math.max(1, Math.floor(expiresInSeconds * 1_000));
  const refreshMarginMs = Math.min(TOKEN_REFRESH_MARGIN_MS, Math.floor(tokenLifetimeMs * 0.1));

  return Math.max(1, tokenLifetimeMs - refreshMarginMs);
}

function getRetryDelayMs(attempt: number): number {
  const exponentialDelayMs = Math.min(LOCK_RETRY_INITIAL_MS * 2 ** attempt, LOCK_RETRY_MAX_MS);
  const jitterRangeMs = Math.floor(exponentialDelayMs * LOCK_RETRY_JITTER_FACTOR) + 1;
  const jitterMs = randomInt(jitterRangeMs);

  return exponentialDelayMs + jitterMs;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function createRedisTokenKeys(): RedisTokenKeys {
  if (!REDIS_CONFIG.enabled) {
    throw new Error('Redis token keys cannot be created without Redis configuration');
  }

  const namespace = `${REDIS_CONFIG.keyPrefix}:wso2`;
  return {
    lock: `${namespace}:token_lock`,
    token: `${namespace}:access_token`,
  };
}

class ApiTokenService {
  public async getToken(): Promise<string> {
    const redis = await getRedisClient();

    if (redis) {
      return await this.getTokenFromRedis(redis, createRedisTokenKeys());
    }

    return await this.getTokenFromMemory();
  }

  private async getTokenFromRedis(redis: RedisClient, keys: RedisTokenKeys): Promise<string> {
    const cachedToken = await this.readCachedToken(redis, keys.token);
    if (cachedToken) {
      return cachedToken;
    }

    const lockOwner = randomUUID();
    const waitDeadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;
    let attempt = 0;
    let hasLoggedContention = false;

    while (Date.now() <= waitDeadline) {
      const acquiredLock = await redis.set(keys.lock, lockOwner, {
        NX: true,
        PX: LOCK_TTL_MS,
      });

      if (acquiredLock === 'OK') {
        return await this.refreshTokenWhileHoldingLock(redis, lockOwner, keys);
      }

      if (!hasLoggedContention) {
        logger.info('OAuth token refresh is already in progress; waiting for the shared cache');
        hasLoggedContention = true;
      }

      const remainingWaitMs = waitDeadline - Date.now();
      if (remainingWaitMs <= 0) {
        break;
      }

      await this.sleep(Math.min(getRetryDelayMs(attempt), remainingWaitMs));

      const refreshedToken = await this.readCachedToken(redis, keys.token);
      if (refreshedToken) {
        return refreshedToken;
      }

      attempt += 1;
    }

    logger.error('Timed out waiting for the shared OAuth token cache to be refreshed');
    throw new HttpException(503, 'Service Unavailable');
  }

  private async refreshTokenWhileHoldingLock(redis: RedisClient, lockOwner: string, keys: RedisTokenKeys): Promise<string> {
    try {
      const cachedToken = await this.readCachedToken(redis, keys.token);
      if (cachedToken) {
        return cachedToken;
      }

      logger.info('Acquired the shared OAuth token refresh lock');
      const token = await this.fetchToken();
      const cacheLifetimeMs = getCacheLifetimeMs(token.expires_in);
      const cachedTokenValue: CachedToken = {
        accessToken: token.access_token,
        expiresAt: Date.now() + cacheLifetimeMs,
      };

      await redis.set(keys.token, JSON.stringify(cachedTokenValue), {
        PX: cacheLifetimeMs,
      });
      logger.info(`OAuth token cached in Redis for ${cacheLifetimeMs}ms`);

      return token.access_token;
    } finally {
      await this.releaseLock(redis, lockOwner, keys.lock);
    }
  }

  private async releaseLock(redis: RedisClient, lockOwner: string, lockKey: string): Promise<void> {
    try {
      await redis.eval(RELEASE_LOCK_SCRIPT, {
        arguments: [lockOwner],
        keys: [lockKey],
      });
    } catch (error) {
      logger.warn(`Failed to release the OAuth token refresh lock: ${getErrorMessage(error)}`);
    }
  }

  private async readCachedToken(redis: RedisClient, tokenKey: string): Promise<string | null> {
    const serializedToken = await redis.get(tokenKey);
    if (!serializedToken) {
      return null;
    }

    try {
      const parsedToken: unknown = JSON.parse(serializedToken.toString());
      if (isCachedToken(parsedToken) && Date.now() < parsedToken.expiresAt) {
        return parsedToken.accessToken;
      }
    } catch {
      logger.warn('Ignoring an invalid value in the shared OAuth token cache');
    }

    return null;
  }

  private async getTokenFromMemory(): Promise<string> {
    if (localCachedToken && Date.now() < localCachedToken.expiresAt) {
      return localCachedToken.accessToken;
    }

    if (localTokenRequest) {
      return await localTokenRequest;
    }

    const tokenRequest = this.fetchAndCacheTokenInMemory();
    localTokenRequest = tokenRequest;

    try {
      return await tokenRequest;
    } finally {
      if (localTokenRequest === tokenRequest) {
        localTokenRequest = null;
      }
    }
  }

  private async fetchAndCacheTokenInMemory(): Promise<string> {
    const token = await this.fetchToken();
    const cacheLifetimeMs = getCacheLifetimeMs(token.expires_in);

    localCachedToken = {
      accessToken: token.access_token,
      expiresAt: Date.now() + cacheLifetimeMs,
    };
    logger.info(`OAuth token cached in memory for ${cacheLifetimeMs}ms`);

    return token.access_token;
  }

  private async fetchToken(): Promise<Token> {
    const authString = Buffer.from(`${CLIENT_KEY}:${CLIENT_SECRET}`, 'utf-8').toString('base64');

    try {
      const { data } = await axios<unknown>({
        timeout: TOKEN_REQUEST_TIMEOUT_MS,
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify({
          grant_type: 'client_credentials',
        }),
        url: apiURL('token'),
      });

      if (!isToken(data)) {
        throw new HttpException(502, 'Bad Gateway');
      }

      logger.info(`OAuth token is valid for ${data.expires_in}s`);
      return data;
    } catch (error) {
      logger.error(`Failed to fetch an OAuth access token: ${getErrorMessage(error)}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(502, 'Bad Gateway');
    }
  }

  private async sleep(milliseconds: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, milliseconds));
  }
}

export default ApiTokenService;
