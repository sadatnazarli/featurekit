import { readFile } from "node:fs/promises";
import { watch, type FSWatcher } from "node:fs";
import type { FlagMap } from "../flags.js";
import type { SourceAdapter } from "./interface.js";

const DEBOUNCE_MS = 100;

/**
 * Reads flag definitions from a JSON file. Supports hot-reloading via `fs.watch` —
 * when the file changes, flags update without a restart.
 *
 * If the file becomes invalid JSON after startup, the adapter logs a warning and
 * keeps the previous valid state. It never crashes your application.
 *
 * @example
 * ```ts
 * const source = fileAdapter({ path: "./flags.json" })
 * ```
 */
export function fileAdapter(options: { path: string }): SourceAdapter {
  const filePath = options.path;

  async function loadFile(): Promise<FlagMap> {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as FlagMap;
  }

  return {
    async load() {
      try {
        return await loadFile();
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === "ENOENT") {
          throw new Error(
            `featurekit: flags file not found at "${filePath}". ` +
              `Create a JSON file with your flag definitions.`,
          );
        }
        throw new Error(
          `featurekit: failed to parse "${filePath}": ${error.message}`,
        );
      }
    },

    watch(onChange) {
      let timeout: ReturnType<typeof setTimeout> | null = null;
      let watcher: FSWatcher;

      try {
        watcher = watch(filePath, () => {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(async () => {
            try {
              const flags = await loadFile();
              onChange(flags);
            } catch {
              // Invalid JSON or read error — keep previous state, don't crash
              console.warn(
                `featurekit: failed to reload "${filePath}", keeping previous flag state`,
              );
            }
          }, DEBOUNCE_MS);
        });
      } catch {
        // File might not exist yet for watching — non-fatal
        console.warn(
          `featurekit: could not watch "${filePath}" for changes`,
        );
        return () => {};
      }

      return () => {
        if (timeout) clearTimeout(timeout);
        watcher.close();
      };
    },
  };
}
