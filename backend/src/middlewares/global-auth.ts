import { ActionArgs, AuditGlobalAuthOptions, AuthAuditReport, Ctor, MetadataStorage, Middleware, RouteRef } from '@/interfaces/global-auth.interface';
import { getMetadataArgsStorage } from 'routing-controllers';

/**
 * Reads routing-controllers' metadata and files every route as protected, public
 * or unprotected. Injects nothing: auth stays explicit on each controller.
 */

const publicClasses = new Map<Ctor, string | undefined>();
const publicMethods = new Map<Ctor, Map<string, string | undefined>>();

/** Marks a route as reachable without a session. The reason is logged on boot. */
export function Public(reason?: string): ClassDecorator & MethodDecorator {
  return ((target: any, propertyKey?: string | symbol): void => {
    if (propertyKey === undefined) {
      publicClasses.set(target as Ctor, reason);
      return;
    }
    const ctor: Ctor = typeof target === 'function' ? target : target.constructor;
    let methods = publicMethods.get(ctor);
    if (!methods) {
      methods = new Map();
      publicMethods.set(ctor, methods);
    }
    methods.set(String(propertyKey), reason);
  }) as ClassDecorator & MethodDecorator;
}

const prototypeChain = (target: Ctor): Ctor[] => {
  const chain: Ctor[] = [];
  for (let current: any = target; typeof current === 'function' && current !== Function.prototype; current = Object.getPrototypeOf(current)) {
    chain.push(current);
  }
  return chain;
};

// Exact match: @Public on a base class does not open the derived controller.
const resolvePublic = (target: Ctor, method: string): { isPublic: boolean; reason?: string } => {
  if (publicClasses.has(target)) {
    return { isPublic: true, reason: publicClasses.get(target) };
  }
  const methods = publicMethods.get(target);
  if (methods?.has(method)) {
    return { isPublic: true, reason: methods.get(method) };
  }
  return { isPublic: false };
};

const controllerBasePath = (storage: MetadataStorage, controller: Ctor): string => {
  const args = storage.controllers.find(entry => entry.target === controller);
  return typeof args?.route === 'string' ? args.route : '';
};

const describeRoute = (controller: Ctor, action: ActionArgs, basePath: string): RouteRef => {
  const route = typeof action.route === 'string' ? action.route : String(action.route ?? '');
  return {
    controller: controller.name,
    action: String(action.method ?? ''),
    httpMethod: String(action.type ?? '').toUpperCase(),
    route: `${basePath}${route}` || '/',
  };
};

/**
 * Exact target match, like routing-controllers: a base class's `@UseBefore` is not
 * applied to a derived controller, although its routes are. `@UseAfter` guards nothing.
 */
const hasClassLevelAuth = (storage: MetadataStorage, controller: Ctor, authMiddleware: Middleware): boolean =>
  storage.uses.some(use => !use.afterAction && !use.method && use.middleware === authMiddleware && use.target === controller);

const hasActionLevelAuth = (storage: MetadataStorage, controller: Ctor, method: string, authMiddleware: Middleware): boolean =>
  storage.uses.some(use => !use.afterAction && use.target === controller && use.method === method && use.middleware === authMiddleware);

/**
 * Middlewares in run order: class level first, then action level. Stacked
 * `@UseBefore` decorators run bottom-up; a single `@UseBefore(a, b)` runs in order.
 */
const beforeMiddlewaresFor = (storage: MetadataStorage, controller: Ctor, method: string): Middleware[] => {
  const relevant = storage.uses.filter(use => !use.afterAction && use.target === controller);

  return [...relevant.filter(use => !use.method), ...relevant.filter(use => use.method === method)].map(use => use.middleware as Middleware);
};

// Follows the prototype chain, like routing-controllers does for actions.
const actionsByController = (storage: MetadataStorage, controllers: Ctor[]): Map<Ctor, ActionArgs[]> => {
  const grouped = new Map<Ctor, ActionArgs[]>();

  for (const controller of controllers) {
    const actions: ActionArgs[] = [];

    for (const ctor of prototypeChain(controller)) {
      for (const action of storage.actions.filter(candidate => candidate.target === ctor)) {
        if (!actions.some(seen => seen.method === action.method)) {
          actions.push(action);
        }
      }
    }

    grouped.set(controller, actions);
  }

  return grouped;
};

const warnOnInheritedMiddleware = (storage: MetadataStorage, controller: Ctor, report: AuthAuditReport): void => {
  const chain = prototypeChain(controller);
  const inherited = storage.uses.filter(use => use.target !== controller && chain.includes(use.target as Ctor));

  if (!inherited.length) return;

  const ancestors = [...new Set(inherited.map(use => (use.target as Ctor).name))];
  report.warnings.push(
    `${controller.name}: inherits routes from ${ancestors.join(', ')}, but routing-controllers does not ` +
      'apply a base class @UseBefore - declare the middleware on the controller itself',
  );
};

interface ActionAudit {
  storage: MetadataStorage;
  controller: Ctor;
  actionName: string;
  ref: RouteRef;
  classIsAuthed: boolean;
  authMiddleware: Middleware;
  report: AuthAuditReport;
}

/** Describes a protected route, warning when anything else runs ahead of authentication. */
const describeProtectedRoute = (args: ActionAudit): RouteRef => {
  const { storage, controller, actionName, ref, classIsAuthed, authMiddleware, report } = args;
  const before = beforeMiddlewaresFor(storage, controller, actionName);
  const authRunsFirst = before[0] === authMiddleware;

  if (!authRunsFirst) {
    const ahead = before.slice(0, before.indexOf(authMiddleware)).map(middleware => middleware.name || 'anonymous');
    report.warnings.push(
      `${controller.name}.${actionName}: ${ahead.join(', ')} run before authMiddleware, so anonymous requests ` +
        'reach them first - pass the middlewares to a single @UseBefore(authMiddleware, ...) in the order they should run',
    );
  }

  return { ...ref, declaredAt: classIsAuthed ? 'class' : 'action', authRunsFirst };
};

/** Files one action under exactly one of protected, public or unprotected. */
const auditAction = (storage: MetadataStorage, controller: Ctor, action: ActionArgs, context: ActionContext): void => {
  const { basePath, classIsAuthed, authMiddleware, report } = context;
  const actionName = String(action.method ?? '');
  const ref = describeRoute(controller, action, basePath);
  const { isPublic, reason } = resolvePublic(controller, actionName);
  const actionIsAuthed = classIsAuthed || hasActionLevelAuth(storage, controller, actionName, authMiddleware);

  const asProtected = () => describeProtectedRoute({ storage, controller, actionName, ref, classIsAuthed, authMiddleware, report });

  if (isPublic && actionIsAuthed) {
    report.warnings.push(`${controller.name}.${actionName}: marked @Public() but also carries @UseBefore(authMiddleware) - remove one`);
    report.protectedRoutes.push(asProtected());
    return;
  }

  if (isPublic) {
    report.publicRoutes.push({ ...ref, ...(reason ? { reason } : {}) });
  } else if (actionIsAuthed) {
    report.protectedRoutes.push(asProtected());
  } else {
    report.unprotectedRoutes.push(ref);
  }
};

interface ActionContext {
  basePath: string;
  classIsAuthed: boolean;
  authMiddleware: Middleware;
  report: AuthAuditReport;
}

export const auditGlobalAuth = (options: AuditGlobalAuthOptions): AuthAuditReport => {
  const { authMiddleware, controllers, logger } = options;

  if (typeof authMiddleware !== 'function') {
    throw new TypeError('auditGlobalAuth: authMiddleware must be a function');
  }

  const storage = getMetadataArgsStorage();
  const report: AuthAuditReport = { protectedRoutes: [], publicRoutes: [], unprotectedRoutes: [], warnings: [] };

  for (const [controller, actions] of actionsByController(storage, controllers)) {
    if (!actions.length) {
      report.warnings.push(`${controller.name}: registered as a controller but declares no routes`);
      continue;
    }

    warnOnInheritedMiddleware(storage, controller, report);

    const context: ActionContext = {
      basePath: controllerBasePath(storage, controller),
      classIsAuthed: hasClassLevelAuth(storage, controller, authMiddleware),
      authMiddleware,
      report,
    };

    for (const action of actions) {
      auditAction(storage, controller, action, context);
    }
  }

  logReport(report, logger);
  return report;
};

const logReport = (report: AuthAuditReport, logger?: AuditGlobalAuthOptions['logger']): void => {
  if (!logger) return;

  const total = report.protectedRoutes.length + report.publicRoutes.length + report.unprotectedRoutes.length;
  logger.info?.(
    `Auth audit: ${total} routes - ${report.protectedRoutes.length} protected, ` +
      `${report.publicRoutes.length} public, ${report.unprotectedRoutes.length} unprotected`,
  );

  for (const route of report.publicRoutes) {
    logger.warn?.(
      `Auth audit: PUBLIC ${route.httpMethod} ${route.route} (${route.controller}.${route.action})` +
        (route.reason ? ` - ${route.reason}` : ' - NO REASON GIVEN'),
    );
  }

  for (const route of report.unprotectedRoutes) {
    logger.error?.(
      `Auth audit: UNPROTECTED ${route.httpMethod} ${route.route} (${route.controller}.${route.action}) - ` +
        'add @UseBefore(authMiddleware), or @Public() with a reason if that is intended',
    );
  }

  for (const warning of report.warnings) {
    logger.warn?.(`Auth audit: ${warning}`);
  }
};
