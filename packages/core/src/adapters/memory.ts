import type { FlagMap } from "../flags.js";
import type { SourceAdapter } from "./interface.js";

/**
 * In-memory adapter — ideal for testing. Pass a plain object of flag definitions
 * and optionally mutate them with `update()` to simulate runtime changes.
 *
 * @example
 * ```ts
 * const adapter = memoryAdapter({ newDashboard: true, beta: false })
 * const flags = createFlags({ source: adapter, defaults: { newDashboard: false, beta: false } })
 * ```
 */
export function memoryAdapter(
  initial: FlagMap,
): SourceAdapter & { update: (flags: FlagMap) => void } {
  let flags = { ...initial };
  let listener: ((flags: FlagMap) => void) | null = null;

  return {
    async load() {
      return { ...flags };
    },

    watch(onChange) {
      listener = onChange;
      return () => {
        listener = null;
      };
    },

    /** Update flags at runtime. Triggers the watch callback if active. */
    update(newFlags: FlagMap) {
      flags = { ...newFlags };
      listener?.({ ...flags });
    },
  };
}
