import { describe, it, expect } from "vitest";
import { fnv1a32, evaluateFlag } from "../evaluate.js";
import type { RuleBasedFlag } from "../flags.js";

describe("fnv1a32", () => {
  it("returns the offset basis for an empty string", () => {
    expect(fnv1a32("")).toBe(2166136261);
  });

  it("hashes 'a' to the known FNV-1a value", () => {
    expect(fnv1a32("a")).toBe(0xe40c292c);
  });

  it("produces consistent results for the same input", () => {
    const input = "newDashboard:usr_123";
    expect(fnv1a32(input)).toBe(fnv1a32(input));
  });

  it("produces different results for different inputs", () => {
    expect(fnv1a32("flag:user_a")).not.toBe(fnv1a32("flag:user_b"));
  });

  it("returns an unsigned 32-bit integer", () => {
    const result = fnv1a32("test");
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(2 ** 32);
  });
});

describe("evaluateFlag", () => {
  it("returns a simple boolean flag directly", () => {
    expect(evaluateFlag("flag", true)).toBe(true);
    expect(evaluateFlag("flag", false)).toBe(false);
  });

  it("returns false when enabled is false, regardless of other rules", () => {
    const flag: RuleBasedFlag = {
      enabled: false,
      users: ["usr_1"],
      groups: ["admin"],
      percentage: 100,
    };
    expect(evaluateFlag("flag", flag, { userId: "usr_1", groups: ["admin"] })).toBe(false);
  });

  it("respects overrides with highest priority", () => {
    const flag: RuleBasedFlag = {
      enabled: true,
      overrides: { usr_blocked: false, usr_vip: true },
      users: ["usr_blocked"],
    };
    // Override says false even though user is in users list
    expect(evaluateFlag("flag", flag, { userId: "usr_blocked" })).toBe(false);
    expect(evaluateFlag("flag", flag, { userId: "usr_vip" })).toBe(true);
  });

  it("matches userId in users array", () => {
    const flag: RuleBasedFlag = { enabled: true, users: ["usr_1", "usr_2"] };
    expect(evaluateFlag("flag", flag, { userId: "usr_1" })).toBe(true);
    expect(evaluateFlag("flag", flag, { userId: "usr_99" })).toBe(true); // falls through to enabled
  });

  it("matches email in users array", () => {
    const flag: RuleBasedFlag = { enabled: true, users: ["alice@co.com"] };
    expect(evaluateFlag("flag", flag, { email: "alice@co.com" })).toBe(true);
  });

  it("matches any group intersection", () => {
    const flag: RuleBasedFlag = { enabled: true, groups: ["admin", "beta"] };
    expect(evaluateFlag("flag", flag, { groups: ["beta", "users"] })).toBe(true);
    expect(evaluateFlag("flag", flag, { groups: ["users"] })).toBe(true); // falls through to enabled
  });

  it("uses deterministic percentage rollout", () => {
    const flag: RuleBasedFlag = { enabled: false, percentage: 50 };
    // enabled is false, so percentage should not matter
    expect(evaluateFlag("flag", flag, { userId: "usr_1" })).toBe(false);
  });

  it("deterministically includes or excludes users by percentage", () => {
    const flag: RuleBasedFlag = { enabled: true, percentage: 50 };
    // Collect results for 1000 users — should be roughly 50% but always consistent
    const results = Array.from({ length: 1000 }, (_, i) =>
      evaluateFlag("test-flag", flag, { userId: `user_${i}` }),
    );
    const enabledCount = results.filter(Boolean).length;

    // Should be roughly 50% (within a reasonable range)
    expect(enabledCount).toBeGreaterThan(400);
    expect(enabledCount).toBeLessThan(600);

    // Same user always gets the same result
    const firstRun = evaluateFlag("test-flag", flag, { userId: "user_42" });
    const secondRun = evaluateFlag("test-flag", flag, { userId: "user_42" });
    expect(firstRun).toBe(secondRun);
  });

  it("returns false when percentage is set but no userId is available", () => {
    const flag: RuleBasedFlag = { enabled: true, percentage: 10 };
    expect(evaluateFlag("flag", flag)).toBe(false);
    expect(evaluateFlag("flag", flag, {})).toBe(false);
  });

  it("falls back to enabled value when no rules match", () => {
    const flag: RuleBasedFlag = { enabled: true };
    expect(evaluateFlag("flag", flag, { userId: "usr_1" })).toBe(true);
  });

  it("returns false for 0% rollout even when enabled is true", () => {
    const flag: RuleBasedFlag = { enabled: true, percentage: 0 };
    expect(evaluateFlag("flag", flag, { userId: "any_user" })).toBe(false);
  });

  it("handles the full priority chain correctly", () => {
    const flag: RuleBasedFlag = {
      enabled: true,
      percentage: 0,
      users: ["usr_2"],
      groups: ["beta"],
      overrides: { usr_1: false },
    };
    // Override wins
    expect(evaluateFlag("flag", flag, { userId: "usr_1", groups: ["beta"] })).toBe(false);
    // Users list wins over groups
    expect(evaluateFlag("flag", flag, { userId: "usr_2" })).toBe(true);
    // Groups match
    expect(evaluateFlag("flag", flag, { userId: "usr_3", groups: ["beta"] })).toBe(true);
    // No match, percentage is 0, so user is excluded
    expect(evaluateFlag("flag", flag, { userId: "usr_4" })).toBe(false);
  });
});
