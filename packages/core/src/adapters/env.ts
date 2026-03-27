import type { FlagMap } from "../flags.js";
import type { SourceAdapter } from "./interface.js";

/**
 * Reads flag definitions from an environment variable containing a JSON string.
 * No file, no infrastructure — works in serverless, edge, containers.
 *
 * @example
 * ```ts
 * // FEATUREKIT_FLAGS='{"newDashboard":true}' node app.js
 * const source = envAdapter()
 *
 * // Custom env var:
 * const source = envAdapter({ envVar: "MY_FLAGS" })
 * ```
 */
export function envAdapter(
  options?: { envVar?: string },
): SourceAdapter {
  const envVar = options?.envVar ?? "FEATUREKIT_FLAGS";

  return {
    async load() {
      const raw = process.env[envVar];
      if (!raw) {
        throw new Error(
          `featurekit: environment variable "${envVar}" is not set. ` +
            `Set it to a JSON string of flag definitions.`,
        );
      }
      try {
        return JSON.parse(raw) as FlagMap;
      } catch (err) {
        throw new Error(
          `featurekit: failed to parse "${envVar}" as JSON: ${(err as Error).message}`,
        );
      }
    },
  };
}
