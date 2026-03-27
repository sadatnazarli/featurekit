import { describe, it, expect, vi } from "vitest";
import { memoryAdapter } from "../../adapters/memory.js";

describe("memoryAdapter", () => {
  it("loads the initial flags", async () => {
    const adapter = memoryAdapter({ flag1: true, flag2: false });
    const flags = await adapter.load();
    expect(flags).toEqual({ flag1: true, flag2: false });
  });

  it("returns a shallow clone from load — mutations do not affect internal state", async () => {
    const adapter = memoryAdapter({ flag1: true });
    const flags = await adapter.load();
    (flags as Record<string, boolean>).flag1 = false;
    expect(await adapter.load()).toEqual({ flag1: true });
  });

  it("updates flags at runtime", async () => {
    const adapter = memoryAdapter({ flag1: true });
    adapter.update({ flag1: false, flag2: true });
    expect(await adapter.load()).toEqual({ flag1: false, flag2: true });
  });

  it("calls the watch callback on update", () => {
    const adapter = memoryAdapter({ flag1: true });
    const onChange = vi.fn();
    adapter.watch!(onChange);

    adapter.update({ flag1: false });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({ flag1: false });
  });

  it("stops calling the callback after cleanup", () => {
    const adapter = memoryAdapter({ flag1: true });
    const onChange = vi.fn();
    const cleanup = adapter.watch!(onChange);

    (cleanup as () => void)();
    adapter.update({ flag1: false });
    expect(onChange).not.toHaveBeenCalled();
  });
});
