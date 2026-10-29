import 'reflect-metadata';
import authMiddleware from '@middlewares/auth.middleware';
import { auditGlobalAuth } from '@middlewares/global-auth';
import { registeredControllers } from '@/registered-controllers';
import { getMetadataArgsStorage } from 'routing-controllers';
import { describe, expect, it } from 'vitest';

/**
 * Fails when a controller is registered without `@UseBefore(authMiddleware)`.
 * Routes are listed without the `/api` prefix. A new public route is added here
 * in the same commit.
 */
const EXPECTED_PUBLIC_ROUTES = ['GET /', 'GET /health/up'];

const storage = getMetadataArgsStorage();
const registered = new Set<unknown>(registeredControllers);

const basePathOf = (target: unknown): string => {
  const args = storage.controllers.find(entry => entry.target === target);
  return typeof args?.route === 'string' ? args.route : '';
};

const routeKey = (action: { type?: unknown; route?: unknown; target?: unknown }): string =>
  `${String(action.type).toUpperCase()} ${basePathOf(action.target)}${String(action.route)}`;

const registeredRoutes = (): string[] => storage.actions.filter(action => registered.has(action.target)).map(routeKey);

const report = auditGlobalAuth({ authMiddleware, controllers: registeredControllers as never[] });
const asKey = (route: { httpMethod: string; route: string }) => `${route.httpMethod} ${route.route}`;

describe('registered routes', () => {
  it('leaves no route reachable without authentication', () => {
    expect(report.unprotectedRoutes.map(asKey)).toEqual([]);
  });

  it('exposes exactly the routes on the public allowlist', () => {
    expect(report.publicRoutes.map(asKey).sort()).toEqual([...EXPECTED_PUBLIC_ROUTES].sort());
  });

  it('requires every public route to document why', () => {
    for (const route of report.publicRoutes) {
      expect(route.reason).toBeTruthy();
    }
  });

  // Otherwise an audit that dropped a controller would pass the checks above.
  it('classifies every route the app registers, and nothing else', () => {
    const classified = [...report.protectedRoutes, ...report.publicRoutes, ...report.unprotectedRoutes].map(asKey);

    expect(classified.sort()).toEqual(registeredRoutes().sort());
  });

  it('finds a route table at all, so the check above cannot pass vacuously', () => {
    expect(registeredRoutes().length).toBeGreaterThan(EXPECTED_PUBLIC_ROUTES.length);
  });

  it('has no contradictory or empty controllers, and no middleware running ahead of authentication', () => {
    expect(report.warnings).toEqual([]);
  });

  it('runs authentication before any other middleware on every protected route', () => {
    const authNotFirst = report.protectedRoutes.filter(route => !route.authRunsFirst).map(asKey);

    expect(authNotFirst).toEqual([]);
  });
});
