import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("appRouter", () => {
  it("has all expected router keys", () => {
    const routerKeys = Object.keys(appRouter._def.procedures);
    // Check that main routers exist
    expect(routerKeys).toContain("auth.me");
    expect(routerKeys).toContain("auth.logout");
    expect(routerKeys).toContain("simulations.list");
    expect(routerKeys).toContain("simulations.create");
    expect(routerKeys).toContain("simulations.start");
    expect(routerKeys).toContain("simulations.stop");
    expect(routerKeys).toContain("workers.list");
    expect(routerKeys).toContain("workers.create");
    expect(routerKeys).toContain("proxies.list");
    expect(routerKeys).toContain("proxies.create");
    expect(routerKeys).toContain("proxies.bulkCreate");
    expect(routerKeys).toContain("behaviorProfiles.list");
    expect(routerKeys).toContain("antiDetect.get");
    expect(routerKeys).toContain("antiDetect.update");
    expect(routerKeys).toContain("analytics.get");
    expect(routerKeys).toContain("analytics.update");
    expect(routerKeys).toContain("systemSettings.get");
    expect(routerKeys).toContain("systemSettings.update");
    expect(routerKeys).toContain("reports.list");
    expect(routerKeys).toContain("reports.summary");
    expect(routerKeys).toContain("dashboard.stats");
  });

  it("auth.logout clears session cookie", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });

  it("auth.me returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-123");
    expect(result?.role).toBe("admin");
  });
});
