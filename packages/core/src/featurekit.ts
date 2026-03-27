import type { FlagMap, UserContext } from "./flags.js";
import type { SourceAdapter } from "./adapters/interface.js";
import { evaluateFlag } from "./evaluate.js";
import { getContext, runWithContext, createMiddleware } from "./context.js";

/**
 * Configuration for `createFlags()`.
 *
 * @typeParam T - Object whose keys define the valid flag names and whose values
 *               are the default boolean states. TypeScript infers flag names from this.
 */
export interface FeatureKitConfig<T extends Record<string, boolean>> {
  /** The source adapter to load flag definitions from. */
  source: SourceAdapter;
  /** Default flag values. Keys become the typed flag names. */
  defaults: T;
  /** Optional context extraction configuration. */
  context?: {
    /** Custom function to extract user context from a request object. */
    extract?: (req: unknown) => UserContext;
  };
}

/** The featurekit instance returned by `createFlags()`. */
export interface FeatureKit<T extends Record<string, boolean>> {
  /**
   * Check if a flag is enabled for the current user. Reads context from
   * AsyncLocalStorage automatically, or accepts an explicit override.
   *
   * @example
   * ```ts
   * if (await flags.isEnabled("newDashboard")) { ... }
   * if (await flags.isEnabled("beta", { userId: "usr_123" })) { ... }
   * ```
   */
  isEnabled(flagName: keyof T & string, context?: UserContext): Promise<boolean>;

  /**
   * Evaluate all flags at once. Useful for bootstrapping a frontend.
   *
   * @example
   * ```ts
   * const all = await flags.getAll()
   * // → { newDashboard: true, betaFeature: false }
   * ```
   */
  getAll(context?: UserContext): Promise<{ [K in keyof T]: boolean }>;

  /**
   * Express/Fastify/Koa-compatible middleware that stores user context
   * in AsyncLocalStorage for the duration of each request.
   */
  middleware(): (req: unknown, res: unknown, next: () => void) => void;

  /**
   * Run a function with explicit user context. For background jobs,
   * queue workers, or Next.js server components.
   */
  runWithContext: typeof runWithContext;

  /** Stop watching for flag changes and clean up resources. */
  destroy(): void;
}

/**
 * Creates a typed featurekit instance. Flag names are inferred from the `defaults`
 * object — `isEnabled("typo")` is a compile-time error.
 *
 * @example
 * ```ts
 * import { createFlags, fileAdapter } from "featurekit"
 *
 * const flags = createFlags({
 *   source: fileAdapter({ path: "./flags.json" }),
 *   defaults: { newDashboard: false, betaFeature: false },
 * })
 *
 * app.use(flags.middleware())
 *
 * if (await flags.isEnabled("newDashboard")) {
 *   return renderNewDashboard()
 * }
 * ```
 */
export function createFlags<T extends Record<string, boolean>>(
  config: FeatureKitConfig<T>,
): FeatureKit<T> {
  let flagDefs: FlagMap = {};
  let loadPromise: Promise<void> | null = null;
  let destroyWatcher: (() => void) | null = null;

  function ensureLoaded(): Promise<void> {
    if (loadPromise) return loadPromise;
    loadPromise = config.source.load().then((loaded) => {
      flagDefs = loaded;
      if (config.source.watch) {
        const cleanup = config.source.watch((updated) => {
          flagDefs = updated;
        });
        if (typeof cleanup === "function") {
          destroyWatcher = cleanup;
        }
      }
    });
    return loadPromise;
  }

  function resolveContext(override?: UserContext): UserContext {
    return override ?? getContext() ?? {};
  }

  return {
    async isEnabled(flagName, context) {
      await ensureLoaded();
      const ctx = resolveContext(context);
      const definition = flagDefs[flagName];
      if (definition === undefined) {
        // flagName is keyof T, so defaults[flagName] is always defined
        return config.defaults[flagName] as boolean;
      }
      return evaluateFlag(flagName, definition, ctx);
    },

    async getAll(context) {
      await ensureLoaded();
      const ctx = resolveContext(context);
      const result = {} as { [K in keyof T]: boolean };
      for (const key of Object.keys(config.defaults) as (keyof T & string)[]) {
        const definition = flagDefs[key];
        if (definition === undefined) {
          result[key] = config.defaults[key] as boolean;
        } else {
          result[key] = evaluateFlag(key, definition, ctx);
        }
      }
      return result;
    },

    middleware() {
      return createMiddleware(config.context?.extract);
    },

    runWithContext,

    destroy() {
      destroyWatcher?.();
      destroyWatcher = null;
      loadPromise = null;
      flagDefs = {};
    },
  };
}
