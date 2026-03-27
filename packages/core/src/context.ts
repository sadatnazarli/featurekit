import { AsyncLocalStorage } from "node:async_hooks";
import type { UserContext } from "./flags.js";

const store = new AsyncLocalStorage<UserContext>();

/** Returns the current user context from AsyncLocalStorage, or `undefined` if none is set. */
export function getContext(): UserContext | undefined {
  return store.getStore();
}

/**
 * Runs a function with the given user context. Works with both sync and async functions.
 * Use this for background jobs, queue workers, or Next.js server components
 * where middleware isn't available.
 *
 * @example
 * ```ts
 * await runWithContext({ userId: "usr_123" }, async () => {
 *   const enabled = await flags.isEnabled("betaFeature")
 * })
 * ```
 */
export function runWithContext<T>(context: UserContext, fn: () => T): T {
  return store.run(context, fn);
}

/**
 * Extracts user context from a request object. Override with a custom extractor
 * to match your auth setup.
 */
type ContextExtractor = (req: unknown) => UserContext;

const defaultExtractor: ContextExtractor = (req) => {
  const r = req as Record<string, unknown>;
  const headers = r.headers as Record<string, string | undefined> | undefined;
  const user = r.user as
    | { id?: string; email?: string; groups?: string[] }
    | undefined;

  const ctx: { userId?: string; email?: string; groups?: string[] } = {};

  const userId = headers?.["x-user-id"] ?? user?.id;
  if (userId) ctx.userId = userId;

  const email = headers?.["x-user-email"] ?? user?.email;
  if (email) ctx.email = email;

  const groupsHeader = headers?.["x-user-groups"];
  const groups = groupsHeader
    ? groupsHeader.split(",").map((g) => g.trim())
    : user?.groups;
  if (groups) ctx.groups = groups;

  return ctx;
};

/**
 * Creates Express/Fastify/Koa-compatible middleware that stores user context
 * in AsyncLocalStorage for the duration of the request. Downstream code calls
 * `flags.isEnabled()` without passing context explicitly.
 *
 * @example
 * ```ts
 * app.use(createMiddleware())
 * // or with a custom extractor:
 * app.use(createMiddleware((req) => ({ userId: req.auth.sub })))
 * ```
 */
export function createMiddleware(extract?: ContextExtractor) {
  const extractor = extract ?? defaultExtractor;
  return (req: unknown, _res: unknown, next: () => void) => {
    const context = extractor(req);
    store.run(context, next);
  };
}
