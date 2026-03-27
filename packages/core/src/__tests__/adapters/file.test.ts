import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileAdapter } from "../../adapters/file.js";

const testDir = join(tmpdir(), "featurekit-test-" + process.pid);
const testFile = join(testDir, "flags.json");

beforeEach(() => {
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("fileAdapter", () => {
  it("reads and parses a JSON file", async () => {
    writeFileSync(testFile, JSON.stringify({ flag1: true }));
    const adapter = fileAdapter({ path: testFile });
    expect(await adapter.load()).toEqual({ flag1: true });
  });

  it("throws when the file does not exist", async () => {
    const adapter = fileAdapter({ path: join(testDir, "nope.json") });
    await expect(adapter.load()).rejects.toThrow("flags file not found");
  });

  it("throws on invalid JSON", async () => {
    writeFileSync(testFile, "not json");
    const adapter = fileAdapter({ path: testFile });
    await expect(adapter.load()).rejects.toThrow("failed to parse");
  });

  it("detects file changes via watch", async () => {
    writeFileSync(testFile, JSON.stringify({ flag1: false }));
    const adapter = fileAdapter({ path: testFile });
    await adapter.load();

    const updated = new Promise<Record<string, unknown>>((resolve) => {
      const cleanup = adapter.watch!((flags) => {
        resolve(flags);
        if (typeof cleanup === "function") cleanup();
      });
    });

    // Wait a tick, then write new content
    await new Promise((r) => setTimeout(r, 50));
    writeFileSync(testFile, JSON.stringify({ flag1: true }));

    const result = await updated;
    expect(result).toEqual({ flag1: true });
  }, 5000);

  it("returns a cleanup function from watch", () => {
    writeFileSync(testFile, JSON.stringify({ flag1: true }));
    const adapter = fileAdapter({ path: testFile });
    const cleanup = adapter.watch!(() => {});
    expect(typeof cleanup).toBe("function");
    (cleanup as () => void)();
  });
});
