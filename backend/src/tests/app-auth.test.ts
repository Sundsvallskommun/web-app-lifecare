import 'reflect-metadata';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { getMetadataArgsStorage } from 'routing-controllers';
import App from '@/app';
import { BASE_URL_PREFIX } from '@config';
import { registeredControllers } from '@/registered-controllers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Boots the real app and calls every protected route without a session. The route
 * list comes from routing-controllers' metadata, so new routes are swept automatically.
 *
 * GET / proves the app is up. /health/up is not called, since it goes downstream.
 */

const PUBLIC_ROUTES = new Set(['GET /', 'GET /health/up']);
const PROTECTED_ROUTE = '/me';
const PUBLIC_ROUTE = '/';

const storage = getMetadataArgsStorage();

const controllerRoute = (target: Function) => storage.controllers.find(controller => controller.target === target)?.route ?? '';

const registered = new Set<Function>(registeredControllers);

const allRoutes = storage.actions
  .filter(action => registered.has(action.target))
  .map(action => {
    if (typeof action.route !== 'string') {
      throw new Error(`Cannot sweep non-string route on ${action.target.name}.${action.method}`);
    }

    return {
      method: action.type.toUpperCase(),
      route: `${controllerRoute(action.target)}${action.route}`,
    };
  });

const protectedRoutes = allRoutes.filter(({ method, route }) => !PUBLIC_ROUTES.has(`${method} ${route}`));

const fillParams = (route: string) => route.replace(/:(\w+)/g, (_, name: string) => `any-${name.toLowerCase()}`);

let server: Server;
let baseUrl: string;

const path = (route: string) => `${baseUrl}${BASE_URL_PREFIX}${route}`;

beforeAll(async () => {
  const app = new App(registeredControllers);

  await new Promise<void>(resolve => {
    server = app.getServer().listen(0, '127.0.0.1', () => resolve());
  });

  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

describe('the route table this suite sweeps', () => {
  it('was actually found, so a broken filter cannot pass as a clean sweep', () => {
    expect(protectedRoutes.length).toBeGreaterThan(0);
  });

  it('exempts only routes that exist, so a renamed public route is noticed', () => {
    const known = new Set(allRoutes.map(({ method, route }) => `${method} ${route}`));

    expect([...PUBLIC_ROUTES].filter(route => !known.has(route))).toEqual([]);
  });
});

describe('the running application', () => {
  it('answers 401 on a protected route when there is no session', async () => {
    const response = await fetch(path(PROTECTED_ROUTE));

    expect(response.status).toBe(401);
  });

  it('answers 200 on the public route, so the 401 above is authentication and not a dead app', async () => {
    const response = await fetch(path(PUBLIC_ROUTE));

    expect(response.status).toBe(200);
  });

  it('rejects a forged session cookie', async () => {
    const response = await fetch(path(PROTECTED_ROUTE), {
      headers: { cookie: 'connect.sid=s%3Aforged.signature' },
    });

    expect(response.status).toBe(401);
  });

  // 400 or 403 here means another middleware ran before authentication.
  it.each(protectedRoutes.map(({ method, route }): [string, string] => [method, route]))(
    'answers 401, not 400 or 403, on %s %s without a session',
    async (method, route) => {
      const response = await fetch(path(fillParams(route)), {
        method,
        headers: { 'content-type': 'application/json' },
        ...(method === 'GET' || method === 'DELETE' ? {} : { body: '{}' }),
      });

      expect(response.status).toBe(401);
    },
  );
});
