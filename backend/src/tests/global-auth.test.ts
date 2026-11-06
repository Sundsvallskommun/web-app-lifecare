import 'reflect-metadata';
import { Controller, Delete, Get, Post, UseAfter, UseBefore } from 'routing-controllers';
import authMiddleware from '@middlewares/auth.middleware';
import { Public, auditGlobalAuth } from '@middlewares/global-auth';
import { describe, expect, it, vi } from 'vitest';

const otherMiddleware = async (_req: unknown, _res: unknown, next: () => void) => next();

@Controller('/mixed')
class MixedController {
  @Get('/protected-action')
  @UseBefore(authMiddleware)
  protectedAction() {
    return 'ok';
  }

  @Public('deliberately open')
  @Get('/open')
  openAction() {
    return 'ok';
  }

  @Get('/forgotten')
  forgottenAction() {
    return 'ok';
  }

  @Post('/other-middleware-only')
  @UseBefore(otherMiddleware)
  otherMiddlewareOnly() {
    return 'ok';
  }
}

@Controller('/class-level')
@UseBefore(authMiddleware)
class ClassLevelController {
  @Get('/one')
  one() {
    return 'ok';
  }

  @Delete('/two')
  two() {
    return 'ok';
  }
}

@Controller('/unreasoned')
class UnreasonedController {
  @Public()
  @Get('/no-reason')
  noReason() {
    return 'ok';
  }
}

@Controller('/contradictory')
class ContradictoryController {
  @Public('says public')
  @Get('/both')
  @UseBefore(authMiddleware)
  both() {
    return 'ok';
  }
}

class BaseController {
  @Get('/inherited')
  inherited() {
    return 'ok';
  }
}

@Controller('/derived')
@UseBefore(authMiddleware)
class DerivedController extends BaseController {}

// Serves /inheriting/from-base without auth: the base class's @UseBefore is not inherited.
@UseBefore(authMiddleware)
class AuthedBaseController {
  @Get('/from-base')
  fromBase() {
    return 'ok';
  }
}

@Controller('/inheriting')
class InheritingController extends AuthedBaseController {}

@Controller('/empty')
class EmptyController {}

// @UseAfter runs after the handler has answered, so it guards nothing.
@Controller('/after-action')
class UseAfterActionController {
  @Get('/late')
  @UseAfter(authMiddleware)
  late() {
    return 'ok';
  }
}

@Controller('/after-class')
@UseAfter(authMiddleware)
class UseAfterClassController {
  @Get('/late')
  late() {
    return 'ok';
  }
}

// Stacked decorators run bottom-up, so `stacked` runs otherMiddleware first.
@Controller('/ordering')
class WrongOrderController {
  @Get('/stacked')
  @UseBefore(authMiddleware)
  @UseBefore(otherMiddleware)
  stacked() {
    return 'ok';
  }

  @Get('/single-call')
  @UseBefore(authMiddleware, otherMiddleware)
  singleCall() {
    return 'ok';
  }
}

@Controller('/class-first')
@UseBefore(otherMiddleware)
class ClassMiddlewareBeforeAuthController {
  @Get('/late-auth')
  @UseBefore(authMiddleware)
  lateAuth() {
    return 'ok';
  }
}

const audit = (controllers: unknown[]) => auditGlobalAuth({ authMiddleware, controllers: controllers as never[] });
const asKey = (route: { httpMethod: string; route: string }) => `${route.httpMethod} ${route.route}`;

describe('auditGlobalAuth', () => {
  it('classifies each route as protected, public or unprotected exactly once', () => {
    const report = audit([MixedController]);

    expect(report.protectedRoutes.map(asKey)).toEqual(['GET /mixed/protected-action']);
    expect(report.publicRoutes.map(asKey)).toEqual(['GET /mixed/open']);
    expect(report.unprotectedRoutes.map(asKey).sort()).toEqual(['GET /mixed/forgotten', 'POST /mixed/other-middleware-only']);
  });

  it('does not accept an unrelated middleware as authentication', () => {
    const report = audit([MixedController]);

    expect(report.unprotectedRoutes.map(asKey)).toContain('POST /mixed/other-middleware-only');
  });

  it('recognises class-level authentication for every action on the controller', () => {
    const report = audit([ClassLevelController]);

    expect(report.unprotectedRoutes).toEqual([]);
    expect(report.protectedRoutes.map(asKey).sort()).toEqual(['DELETE /class-level/two', 'GET /class-level/one']);
    expect(report.protectedRoutes.every(route => route.declaredAt === 'class')).toBe(true);
  });

  it('records where the protecting decorator sits', () => {
    const report = audit([MixedController]);

    expect(report.protectedRoutes[0].declaredAt).toBe('action');
  });

  it('carries the reason through so review can read it', () => {
    const report = audit([MixedController]);

    expect(report.publicRoutes[0].reason).toBe('deliberately open');
  });

  it('leaves the reason undefined when @Public() was given none', () => {
    const report = audit([UnreasonedController]);

    expect(report.publicRoutes).toHaveLength(1);
    expect(report.publicRoutes[0].reason).toBeUndefined();
  });

  it('warns when a route claims to be both public and protected, and treats it as protected', () => {
    const report = audit([ContradictoryController]);

    expect(report.publicRoutes).toEqual([]);
    expect(report.protectedRoutes.map(asKey)).toEqual(['GET /contradictory/both']);
    expect(report.warnings.join(' ')).toMatch(/marked @Public\(\) but also carries @UseBefore/);
  });

  it('covers inherited actions when the controller itself carries class-level auth', () => {
    const report = audit([DerivedController]);

    expect(report.unprotectedRoutes).toEqual([]);
    expect(report.protectedRoutes.map(asKey)).toEqual(['GET /derived/inherited']);
  });

  it('reports an inherited route as unprotected when only the base class carries the auth', () => {
    const report = audit([InheritingController]);

    expect(report.protectedRoutes).toEqual([]);
    expect(report.unprotectedRoutes.map(asKey)).toEqual(['GET /inheriting/from-base']);
  });

  it('explains why a base class @UseBefore does not count', () => {
    const report = audit([InheritingController]);

    expect(report.warnings.join(' ')).toMatch(/inherits routes from AuthedBaseController/);
    expect(report.warnings.join(' ')).toMatch(/does not apply a base class @UseBefore/);
  });

  it('warns about a registered controller that serves no routes', () => {
    const report = audit([EmptyController]);

    expect(report.warnings.join(' ')).toMatch(/EmptyController: registered as a controller but declares no routes/);
  });

  it('only reports the controllers it was given', () => {
    const report = audit([ClassLevelController]);
    const all = [...report.protectedRoutes, ...report.publicRoutes, ...report.unprotectedRoutes];

    expect(all.every(route => route.controller === 'ClassLevelController')).toBe(true);
  });

  it('detects that stacked @UseBefore decorators put authentication last', () => {
    const report = audit([WrongOrderController]);
    const stacked = report.protectedRoutes.find(route => route.route === '/ordering/stacked');

    expect(stacked.authRunsFirst).toBe(false);
    expect(report.warnings.join(' ')).toMatch(/run before authMiddleware/);
  });

  it('accepts middlewares passed to a single @UseBefore call in the right order', () => {
    const report = audit([WrongOrderController]);
    const singleCall = report.protectedRoutes.find(route => route.route === '/ordering/single-call');

    expect(singleCall.authRunsFirst).toBe(true);
  });

  it('detects class-level middleware running ahead of action-level authentication', () => {
    const report = audit([ClassMiddlewareBeforeAuthController]);

    expect(report.protectedRoutes[0].authRunsFirst).toBe(false);
    expect(report.warnings.join(' ')).toMatch(/otherMiddleware run before authMiddleware/);
  });

  it('names the middlewares that got ahead of authentication', () => {
    const report = audit([ClassMiddlewareBeforeAuthController]);

    expect(report.warnings.join(' ')).toContain('otherMiddleware');
  });

  it('does not accept an action-level @UseAfter(authMiddleware) as protection', () => {
    const report = audit([UseAfterActionController]);

    expect(report.protectedRoutes).toEqual([]);
    expect(report.unprotectedRoutes.map(asKey)).toEqual(['GET /after-action/late']);
  });

  it('does not accept a class-level @UseAfter(authMiddleware) as protection', () => {
    const report = audit([UseAfterClassController]);

    expect(report.protectedRoutes).toEqual([]);
    expect(report.unprotectedRoutes.map(asKey)).toEqual(['GET /after-class/late']);
  });

  it('refuses to run without a real auth middleware', () => {
    expect(() => auditGlobalAuth({ authMiddleware: undefined as never, controllers: [] })).toThrow(TypeError);
  });

  it('logs a summary, the reason for each public route and an error per unprotected route', () => {
    const info = vi.fn();
    const warn = vi.fn();
    const error = vi.fn();

    auditGlobalAuth({ authMiddleware, controllers: [MixedController] as never[], logger: { info, warn, error } });

    expect(info).toHaveBeenCalledWith(expect.stringContaining('4 routes - 1 protected, 1 public, 2 unprotected'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('PUBLIC GET /mixed/open'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('deliberately open'));
    expect(error).toHaveBeenCalledWith(expect.stringContaining('UNPROTECTED GET /mixed/forgotten'));
    expect(error).toHaveBeenCalledTimes(2);
  });

  it('names the public route that forgot its reason', () => {
    const warn = vi.fn();

    auditGlobalAuth({ authMiddleware, controllers: [UnreasonedController] as never[], logger: { warn } });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('NO REASON GIVEN'));
  });
});
