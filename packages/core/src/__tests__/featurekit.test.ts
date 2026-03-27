import { describe, it, expect } from "vitest";
import { createFlags } from "../featurekit.js";
import { memoryAdapter } from "../adapters/memory.js";
import { runWithContext } from "../context.js";
import type { FlagMap } from "../flags.js";

function setup(sourceFlags: FlagMap = {}) {
  const adapter = memoryAdapter(sourceFlags);
  const flags = createFlags({
    source: adapter,
    defaults: { newDashboard: false, betaFeature: false },
  });
  return { flags, adapter };
}

describe("createFlags", () => {
  describe("isEnabled", () => {
    it("returns the default when flag is not in the adapter", async () => {
      const { flags } = setup({});
      expect(await flags.isEnabled("newDashboard")).toBe(false);
      expect(await flags.isEnabled("betaFeature")).toBe(false);
    });

    it("returns the evaluated value from the adapter", async () => {
      const { flags } = setup({ newDashboard: true });
      expect(await flags.isEnabled("newDashboard")).toBe(true);
    });

    it("evaluates rule-based flags", async () => {
      const { flags } = setup({
        betaFeature: { enabled: true, users: ["usr_1"] },
      });
      expect(await flags.isEnabled("betaFeature", { userId: "usr_1" })).toBe(true);
      expect(await flags.isEnabled("betaFeature", { userId: "usr_99" })).toBe(true);
    });

    it("uses context override over AsyncLocalStorage context", async () => {
      const { flags } = setup({
        betaFeature: { enabled: true, users: ["usr_override"] },
      });

      await runWithContext({ userId: "usr_als" }, async () => {
        const result = await flags.isEnabled("betaFeature", { userId: "usr_override" });
        expect(result).toBe(true);
      });
    });

    it("reads context from AsyncLocalStorage when no override is given", async () => {
      const { flags } = setup({
        betaFeature: { enabled: true, users: ["usr_als"] },
      });

      await runWithContext({ userId: "usr_als" }, async () => {
        expect(await flags.isEnabled("betaFeature")).toBe(true);
      });
    });
  });

  describe("getAll", () => {
    it("evaluates all flags from defaults", async () => {
      const { flags } = setup({ newDashboard: true });
      const all = await flags.getAll();
      expect(all).toEqual({ newDashboard: true, betaFeature: false });
    });

    it("respects context override", async () => {
      const { flags } = setup({
        newDashboard: { enabled: true, users: ["usr_1"] },
      });
      const all = await flags.getAll({ userId: "usr_1" });
      expect(all.newDashboard).toBe(true);
    });
  });

  describe("lazy loading", () => {
    it("does not call adapter.load until first isEnabled", async () => {
      let loaded = false;
      const flags = createFlags({
        source: {
          async load() {
            loaded = true;
            return {};
          },
        },
        defaults: { newDashboard: false, betaFeature: false },
      });

      expect(loaded).toBe(false);
      await flags.isEnabled("newDashboard");
      expect(loaded).toBe(true);
    });

    it("calls adapter.load only once for multiple isEnabled calls", async () => {
      let loadCount = 0;
      const flags = createFlags({
        source: {
          async load() {
            loadCount++;
            return { newDashboard: true };
          },
        },
        defaults: { newDashboard: false, betaFeature: false },
      });

      await Promise.all([
        flags.isEnabled("newDashboard"),
        flags.isEnabled("betaFeature"),
        flags.getAll(),
      ]);
      expect(loadCount).toBe(1);
    });
  });

  describe("watch", () => {
    it("picks up flag changes from the adapter", async () => {
      const { flags, adapter } = setup({ newDashboard: false });

      expect(await flags.isEnabled("newDashboard")).toBe(false);

      adapter.update({ newDashboard: true });
      expect(await flags.isEnabled("newDashboard")).toBe(true);
    });
  });

  describe("destroy", () => {
    it("resets state and stops watching", async () => {
      const { flags, adapter } = setup({ newDashboard: true });

      await flags.isEnabled("newDashboard");
      flags.destroy();

      // After destroy, update should not affect flags (watcher cleaned up)
      adapter.update({ newDashboard: false });

      // Next isEnabled triggers a fresh load
      // (adapter still has the updated state from update, so it will load that)
      expect(await flags.isEnabled("newDashboard")).toBe(false);
    });
  });

  describe("middleware", () => {
    it("returns a function compatible with Express-style middleware", () => {
      const { flags } = setup();
      const mw = flags.middleware();
      expect(typeof mw).toBe("function");
      expect(mw.length).toBe(3);
    });
  });
});
