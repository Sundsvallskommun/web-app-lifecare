import { config } from 'dotenv';
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === 'true';
export const SWAGGER_ENABLED = process.env.SWAGGER_ENABLED === 'true';

// Namespaces every Redis key this application owns. Only needs overriding via
// REDIS_KEY_PREFIX when several applications share one Redis instance.
const DEFAULT_REDIS_KEY_PREFIX = 'web-app-lifecare';

type RedisConfig = { enabled: false } | { enabled: true; host: string; keyPrefix: string; port: number; password?: string };

function parseRedisPort(value: string): number {
  const parsedPort = Number(value);

  if (!/^\d+$/.test(value) || !Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65_535) {
    throw new Error('REDIS_PORT must be an integer between 1 and 65535');
  }

  return parsedPort;
}

export function createRedisConfig(environment: NodeJS.ProcessEnv): RedisConfig {
  const redisHost = environment.REDIS_HOST?.trim() ?? '';
  const configuredKeyPrefix = environment.REDIS_KEY_PREFIX?.trim() ?? '';
  const redisKeyPrefix = configuredKeyPrefix === '' ? DEFAULT_REDIS_KEY_PREFIX : configuredKeyPrefix;
  const redisPort = environment.REDIS_PORT?.trim() ?? '';
  const redisPassword = environment.REDIS_PASSWORD ?? '';

  if (!redisHost) {
    if (redisPort || redisPassword) {
      throw new Error('REDIS_HOST is required when REDIS_PORT or REDIS_PASSWORD is configured');
    }

    return { enabled: false };
  }

  const connection = {
    host: redisHost,
    keyPrefix: redisKeyPrefix,
    port: parseRedisPort(redisPort || '6379'),
  };

  return redisPassword ? { enabled: true, ...connection, password: redisPassword } : { enabled: true, ...connection };
}

export const REDIS_CONFIG = createRedisConfig(process.env);

// 'auto': the cookie is Secure when Express sees the request as HTTPS (directly, or via
// X-Forwarded-Proto from a trusted proxy). A hard `true` makes express-session silently drop
// the cookie when the proxy does not forward the protocol, which breaks login entirely.
export const SESSION_COOKIE_SECURE: boolean | 'auto' = process.env.NODE_ENV === 'production' ? 'auto' : false;

/** Session lifetime, used as the session store TTL. */
export const SESSION_MAX_AGE_MS = 4 * 24 * 60 * 60 * 1000;

export const {
  NODE_ENV,
  PORT,
  API_BASE_URL,
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
  SECRET_KEY,
  CLIENT_KEY,
  CLIENT_SECRET,
  BASE_URL_PREFIX,
  SAML_CALLBACK_URL,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_SUCCESS_REDIRECT,
  SAML_FAILURE_REDIRECT,
  SAML_LOGOUT_REDIRECT,
  SAML_ENTRY_SSO,
  SAML_ISSUER,
  SAML_IDP_PUBLIC_CERT,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  MUNICIPALITY_ID,
} = process.env;
