import 'reflect-metadata';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import express from 'express';
import { useExpressServer } from 'routing-controllers';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '@/exceptions/HttpException';
import errorMiddleware from '@middlewares/error.middleware';
import { logger } from '@utils/logger';

const api = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/services/api.service', () => ({
  default: class {
    get = api.get;
  },
}));

const { CitizenController, LOOKUP_LIMIT } = await import('@/controllers/citizen.controller');

/**
 * The real routing, validation, rate limit and error middleware, with the session stubbed
 * and the downstream API mocked. The rate limit is per user, so each test uses its own
 * username to get its own count.
 */

const PERSONAL_NUMBER = '199001011234';
const PERSON_ID = 'b2c3d4e5-0000-4000-8000-000000000001';

let server: Server;
let baseUrl: string;

const lookup = (body: unknown, opts: { session?: string; username?: string } = {}) =>
  fetch(`${baseUrl}/lookup`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(opts.session ? { 'x-test-session': opts.session } : {}),
      ...(opts.username ? { 'x-test-username': opts.username } : {}),
    },
    body: JSON.stringify(body),
  });

const citizenFound = () => {
  api.get.mockImplementation(async ({ url }: { url: string }) =>
    url.endsWith('/guid') ? { data: PERSON_ID, message: 'success' } : { data: { givenname: 'Anna', lastname: 'Andersson' }, message: 'success' },
  );
};

beforeAll(async () => {
  const app = express();

  app.use(express.json());
  app.use((req, _res, next) => {
    const session = req.header('x-test-session');
    Object.assign(req, {
      isAuthenticated: () => true,
      user: { username: req.header('x-test-username') },
      ...(session ? { sessionID: session } : {}),
    });
    next();
  });

  useExpressServer(app, { controllers: [CitizenController], defaultErrorHandler: false });
  app.use(errorMiddleware);

  await new Promise<void>(resolve => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });

  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

beforeEach(() => {
  vi.restoreAllMocks();
  api.get.mockReset();
  citizenFound();
});

describe('POST /lookup', () => {
  it('returns the id and name of the person', async () => {
    const response = await lookup({ SocialSecurityNumber: PERSONAL_NUMBER }, { username: 'found' });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ data: { personId: PERSON_ID, givenname: 'Anna', lastname: 'Andersson' } });
  });

  it('accepts the number with a hyphen, as the frontend may send it', async () => {
    const response = await lookup({ SocialSecurityNumber: '19900101-1234' }, { username: 'hyphen' });

    expect(response.status).toBe(200);
  });

  it.each([
    ['too short', '9001011234'],
    ['too long', '1990010112345'],
    ['letters', '19900101123A'],
    ['a path that leaves its segment', '../../199001011234'],
    ['a trailing newline', '199001011234\n'],
    ['a number instead of a string', 199001011234],
    ['nothing', undefined],
  ])('answers 400 without a downstream call on %s', async (_name, SocialSecurityNumber) => {
    const response = await lookup({ SocialSecurityNumber }, { username: 'invalid' });

    expect(response.status).toBe(400);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('keeps a rejected number out of both the response and the logs', async () => {
    const logged = [vi.spyOn(logger, 'error'), vi.spyOn(logger, 'info'), vi.spyOn(console, 'error')];

    const response = await lookup({ SocialSecurityNumber: '19900101123A' }, { username: 'rejected' });

    expect(await response.text()).not.toContain('19900101123A');
    expect(logged.flatMap(spy => spy.mock.calls.map(call => String(call[0]))).join('\n')).not.toContain('19900101123A');
  });

  it('answers 404 when citizen does not know the number', async () => {
    api.get.mockRejectedValue(new HttpException(404, 'Not found'));

    const response = await lookup({ SocialSecurityNumber: PERSONAL_NUMBER }, { username: 'unknown' });

    expect(response.status).toBe(404);
  });

  it('answers 404 when citizen returns no id', async () => {
    api.get.mockResolvedValue({ data: '', message: 'success' });

    const response = await lookup({ SocialSecurityNumber: PERSONAL_NUMBER }, { username: 'no-id' });

    expect(response.status).toBe(404);
  });

  it('logs one line per lookup with the user and the masked number', async () => {
    const info = vi.spyOn(logger, 'info');

    await lookup({ SocialSecurityNumber: PERSONAL_NUMBER }, { username: 'kalle' });

    const lines = info.mock.calls.map(call => String(call[0]));
    expect(lines).toEqual(["Citizen lookup: '199001******' by 'kalle'"]);
  });

  it('logs a lookup that finds nothing too', async () => {
    const info = vi.spyOn(logger, 'info');
    api.get.mockRejectedValue(new HttpException(404, 'Not found'));

    await lookup({ SocialSecurityNumber: PERSONAL_NUMBER }, { username: 'logged-miss' });

    expect(info).toHaveBeenCalledTimes(1);
  });
});

describe('the lookup rate limit', () => {
  const useUpLimit = async (username?: string) => {
    for (let call = 0; call < LOOKUP_LIMIT; call++) {
      const response = await lookup({ SocialSecurityNumber: PERSONAL_NUMBER }, { username });
      expect(response.status).toBe(200);
    }
  };

  it('answers 429 over the limit, without a downstream call', async () => {
    await useUpLimit('limited');
    api.get.mockClear();

    const response = await lookup({ SocialSecurityNumber: PERSONAL_NUMBER }, { username: 'limited' });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ message: 'Too many lookups' });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('counts each user on their own', async () => {
    await useUpLimit('spent');

    const response = await lookup({ SocialSecurityNumber: PERSONAL_NUMBER }, { username: 'fresh' });

    expect(response.status).toBe(200);
  });

  it('keeps counting when the user logs in again and gets a new session', async () => {
    await useUpLimit('relogin');

    const response = await lookup({ SocialSecurityNumber: PERSONAL_NUMBER }, { username: 'relogin', session: 'new-session' });

    expect(response.status).toBe(429);
  });

  it('treats a username in another case as the same user', async () => {
    await useUpLimit('Casey');

    const response = await lookup({ SocialSecurityNumber: PERSONAL_NUMBER }, { username: 'casey' });

    expect(response.status).toBe(429);
  });

  it('falls back to the IP address when there is no username', async () => {
    await useUpLimit();

    const response = await lookup({ SocialSecurityNumber: PERSONAL_NUMBER });

    expect(response.status).toBe(429);
  });
});
