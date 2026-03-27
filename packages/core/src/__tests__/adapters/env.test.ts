import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { envAdapter } from "../../adapters/env.js";

describe("envAdapter", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reads from FEATUREKIT_FLAGS by default", async () => {
    process.env.FEATUREKIT_FLAGS = '{"flag1":true}';
    const adapter = envAdapter();
    expect(await adapter.load()).toEqual({ flag1: true });
  });

  it("reads from a custom env var", async () => {
    process.env.MY_FLAGS = '{"custom":true}';
    const adapter = envAdapter({ envVar: "MY_FLAGS" });
    expect(await adapter.load()).toEqual({ custom: true });
  });

  it("throws when the env var is not set", async () => {
    delete process.env.FEATUREKIT_FLAGS;
    const adapter = envAdapter();
    await expect(adapter.load()).rejects.toThrow(
      'environment variable "FEATUREKIT_FLAGS" is not set',
    );
  });

  it("throws on invalid JSON", async () => {
    process.env.FEATUREKIT_FLAGS = "not json";
    const adapter = envAdapter();
    await expect(adapter.load()).rejects.toThrow("failed to parse");
  });

  it("parses complex flag definitions", async () => {
    const flags = {
      simple: true,
      complex: { enabled: true, percentage: 50, users: ["a"] },
    };
    process.env.FEATUREKIT_FLAGS = JSON.stringify(flags);
    const adapter = envAdapter();
    expect(await adapter.load()).toEqual(flags);
  });
});
