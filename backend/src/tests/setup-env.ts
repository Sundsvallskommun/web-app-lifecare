import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '0',
  BASE_URL_PREFIX: '/api',
  API_BASE_URL: 'http://localhost:9/never-called',
  CLIENT_KEY: 'test-client-key',
  CLIENT_SECRET: 'test-client-secret',
  SECRET_KEY: 'test-secret-key',
  MUNICIPALITY_ID: '2281',
  LOG_FORMAT: 'dev',
  LOG_DIR: '../../data/logs',
  SWAGGER_ENABLED: 'false',
  SESSION_MEMORY: 'true',
  ORIGIN: 'http://localhost:3000',
  CREDENTIALS: 'true',
  SAML_CALLBACK_URL: 'http://localhost:3001/api/saml/login/callback',
  SAML_LOGOUT_CALLBACK_URL: 'http://localhost:3001/api/saml/logout/callback',
  SAML_FAILURE_REDIRECT: 'http://localhost:3001/api/saml/login',
  SAML_SUCCESS_REDIRECT: 'http://localhost:3000/',
  SAML_LOGOUT_REDIRECT: 'http://localhost:3000/',
  SAML_ENTRY_SSO: 'http://localhost:9/sso',
  SAML_ISSUER: 'passport-saml-test',
  SAML_IDP_PUBLIC_CERT: publicKey,
  SAML_PRIVATE_KEY: privateKey,
  SAML_PUBLIC_KEY: publicKey,
};

for (const [key, value] of Object.entries(defaults)) {
  if (process.env[key] === undefined || process.env[key] === '') {
    process.env[key] = value;
  }
}
