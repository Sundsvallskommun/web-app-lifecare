import 'reflect-metadata';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Boots the real app, since the attributes come from how session, trust proxy and NODE_ENV
 * work together. NODE_ENV is read when the config module loads, so each boot re-imports it.
 */

const BOOT_TIMEOUT_MS = 60_000;

const originalEnv = process.env.NODE_ENV;

let server: Server;
let url: string;

const boot = async (env: string) => {
  process.env.NODE_ENV = env;
  vi.resetModules();
  const { default: App } = await import('@/app');
  const { registeredControllers } = await import('@/registered-controllers');

  const app = new App(registeredControllers).getServer();
  app.get('/session-test', (req, res) => {
    Object.assign(req.session, { touched: true });
    res.send('ok');
  });

  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });

  const { port } = server.address() as AddressInfo;
  url = `http://127.0.0.1:${port}/session-test`;
};

const shutDown = () => new Promise<void>(resolve => server.close(() => resolve()));

const setCookie = async (headers: Record<string, string> = {}) => (await fetch(url, { headers })).headers.get('set-cookie');

afterAll(() => {
  process.env.NODE_ENV = originalEnv;
});

describe('the session cookie in production', () => {
  beforeAll(() => boot('production'), BOOT_TIMEOUT_MS);
  afterAll(shutDown);

  it('is set behind TLS, which proves trust proxy reads X-Forwarded-Proto', async () => {
    expect(await setCookie({ 'x-forwarded-proto': 'https' })).toMatch(/^connect\.sid=/);
  });

  it('is HttpOnly, Secure and SameSite=Lax', async () => {
    const cookie = await setCookie({ 'x-forwarded-proto': 'https' });

    expect(cookie).toMatch(/;\s*HttpOnly/i);
    expect(cookie).toMatch(/;\s*Secure/i);
    expect(cookie).toMatch(/;\s*SameSite=Lax/i);
  });

  it('has no Max-Age or Expires, so it ends with the browser session', async () => {
    const cookie = await setCookie({ 'x-forwarded-proto': 'https' });

    expect(cookie).not.toMatch(/Max-Age/i);
    expect(cookie).not.toMatch(/Expires/i);
  });

  it('is not set over plain HTTP', async () => {
    expect(await setCookie()).toBeNull();
  });
});

describe('the session cookie outside production', () => {
  beforeAll(() => boot('development'), BOOT_TIMEOUT_MS);
  afterAll(shutDown);

  it('is set over plain HTTP without Secure, so local login keeps working', async () => {
    const cookie = await setCookie();

    expect(cookie).toMatch(/^connect\.sid=/);
    expect(cookie).not.toMatch(/;\s*Secure/i);
  });
});
