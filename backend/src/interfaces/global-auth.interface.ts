import { getMetadataArgsStorage } from 'routing-controllers';

export type Ctor = { readonly name: string; readonly prototype: unknown };
export type Middleware = { readonly name: string } & ((...args: never[]) => unknown);

export type MetadataStorage = ReturnType<typeof getMetadataArgsStorage>;
export type ActionArgs = MetadataStorage['actions'][number];
export type StoredUse = MetadataStorage['uses'][number];

export interface RouteRef {
  controller: string;
  action: string;
  httpMethod: string;
  route: string;
  /** Why the route is public. Required on anything marked `@Public()`. */
  reason?: string;
  /** Where the protecting `@UseBefore(authMiddleware)` sits. */
  declaredAt?: 'class' | 'action';
  /** False means another middleware, such as a permission check, runs before authentication. */
  authRunsFirst?: boolean;
}

export interface AuthAuditReport {
  /** Routes carrying an explicit `@UseBefore(authMiddleware)`. */
  protectedRoutes: RouteRef[];
  /** Routes explicitly marked `@Public()`. */
  publicRoutes: RouteRef[];
  /** Routes that are neither. Every one of these is a finding. */
  unprotectedRoutes: RouteRef[];
  warnings: string[];
}

export interface AuditGlobalAuthOptions {
  authMiddleware: Middleware;
  /** Restricts the audit to the controllers actually registered with the app. */
  controllers: Ctor[];
  logger?: { info?: (message: string) => void; warn?: (message: string) => void; error?: (message: string) => void };
}
