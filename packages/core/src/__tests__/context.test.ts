import { describe, it, expect } from "vitest";
import { getContext, runWithContext, createMiddleware } from "../context.js";

describe("getContext", () => {
  it("returns undefined outside any context scope", () => {
    expect(getContext()).toBeUndefined();
  });
});

describe("runWithContext", () => {
  it("makes context available inside the callback", () => {
    runWithContext({ userId: "usr_1" }, () => {
      expect(getContext()).toEqual({ userId: "usr_1" });
    });
  });

  it("returns the callback's return value", () => {
    const result = runWithContext({ userId: "usr_1" }, () => 42);
    expect(result).toBe(42);
  });

  it("works with async functions", async () => {
    const result = await runWithContext({ userId: "usr_1" }, async () => {
      await new Promise((r) => setTimeout(r, 10));
      return getContext();
    });
    expect(result).toEqual({ userId: "usr_1" });
  });

  it("nests contexts correctly — inner shadows outer", () => {
    runWithContext({ userId: "outer" }, () => {
      expect(getContext()?.userId).toBe("outer");
      runWithContext({ userId: "inner" }, () => {
        expect(getContext()?.userId).toBe("inner");
      });
      expect(getContext()?.userId).toBe("outer");
    });
  });

  it("maintains context across await boundaries", async () => {
    await runWithContext({ userId: "usr_1", groups: ["beta"] }, async () => {
      await Promise.resolve();
      const ctx = getContext();
      expect(ctx?.userId).toBe("usr_1");
      expect(ctx?.groups).toEqual(["beta"]);
    });
  });
});

describe("createMiddleware", () => {
  it("sets context from request headers", () => {
    const mw = createMiddleware();
    const req = {
      headers: {
        "x-user-id": "usr_1",
        "x-user-email": "alice@co.com",
        "x-user-groups": "admin, beta",
      },
    };

    mw(req, {}, () => {
      const ctx = getContext();
      expect(ctx?.userId).toBe("usr_1");
      expect(ctx?.email).toBe("alice@co.com");
      expect(ctx?.groups).toEqual(["admin", "beta"]);
    });
  });

  it("sets context from req.user object", () => {
    const mw = createMiddleware();
    const req = {
      headers: {},
      user: { id: "usr_2", email: "bob@co.com", groups: ["users"] },
    };

    mw(req, {}, () => {
      const ctx = getContext();
      expect(ctx?.userId).toBe("usr_2");
      expect(ctx?.email).toBe("bob@co.com");
      expect(ctx?.groups).toEqual(["users"]);
    });
  });

  it("uses a custom extractor when provided", () => {
    const mw = createMiddleware((req) => {
      const r = req as { auth: { sub: string } };
      return { userId: r.auth.sub };
    });

    mw({ auth: { sub: "usr_3" } }, {}, () => {
      expect(getContext()?.userId).toBe("usr_3");
    });
  });

  it("context is not available after middleware completes", () => {
    const mw = createMiddleware();
    mw({ headers: { "x-user-id": "usr_1" } }, {}, () => {
      // context available here
    });
    expect(getContext()).toBeUndefined();
  });
});
