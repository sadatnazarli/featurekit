import type { FlagMap } from "../flags.js";

/**
 * A source adapter loads flag definitions and optionally watches for changes.
 * Implement this interface to plug in any flag source — a database, an API, Redis, etc.
 *
 * @example
 * ```ts
 * const adapter: SourceAdapter = {
 *   async load() { return { myFlag: true } },
 *   watch(onChange) { /* poll, subscribe, etc. *\/ },
 * }
 * ```
 */
export interface SourceAdapter {
  /** Loads flag definitions from the source. Called once on first flag evaluation. */
  load(): Promise<FlagMap>;

  /**
   * Watches for flag definition changes and calls `onChange` when they update.
   * Returns a cleanup function to stop watching, or void.
   */
  watch?(onChange: (flags: FlagMap) => void): void | (() => void);
}
