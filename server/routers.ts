import { COOKIE_NAME } from "@shared/const";
import { workerEngine } from "./worker-engine";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import {
  simulations, workers, proxies, behaviorProfiles,
  antiDetectSettings, analyticsConfig, systemConfig, simulationResults
} from "../drizzle/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Simulations CRUD
  simulations: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(simulations).where(eq(simulations.userId, ctx.user.id)).orderBy(desc(simulations.createdAt));
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(simulations).where(and(eq(simulations.id, input.id), eq(simulations.userId, ctx.user.id))).limit(1);
      return result[0] || null;
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      targetUrl: z.string().url(),
      keywords: z.array(z.string()).min(1),
      durationMinutes: z.number().min(1).max(1440).default(60),
      hitsPerMinute: z.number().min(1).max(1000).default(10),
      maxPages: z.number().min(1).max(50).default(5),
      behaviorProfileId: z.number().optional(),
      proxyStrategy: z.enum(["round_robin", "random", "fastest", "least_used", "geographic", "weighted", "sequential"]).default("round_robin"),
      searchEngine: z.enum(["google", "bing", "yahoo", "duckduckgo", "all"]).default("google"),
      simulationMode: z.enum(["aggressive", "normal", "safe", "custom"]).default("normal"),
      pogoStickingEnabled: z.boolean().default(true),
      pogoStickingRate: z.number().min(0).max(100).default(40),
      competitorClickCount: z.number().min(0).max(10).default(2),
      competitorDwellTime: z.number().min(1).max(30).default(3),
      targetDwellTime: z.number().min(5).max(600).default(60),
      scrollOnTarget: z.boolean().default(true),
      clickInternalLinks: z.boolean().default(true),
      serpPageDepth: z.number().min(1).max(10).default(3),
      randomizeOrder: z.boolean().default(true),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(simulations).values({ ...input, userId: ctx.user.id });
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      targetUrl: z.string().url().optional(),
      keywords: z.array(z.string()).optional(),
      durationMinutes: z.number().min(1).max(1440).optional(),
      hitsPerMinute: z.number().min(1).max(1000).optional(),
      maxPages: z.number().min(1).max(50).optional(),
      behaviorProfileId: z.number().optional(),
      proxyStrategy: z.enum(["round_robin", "random", "fastest", "least_used", "geographic", "weighted", "sequential"]).optional(),
      searchEngine: z.enum(["google", "bing", "yahoo", "duckduckgo", "all"]).optional(),
      status: z.enum(["pending", "running", "paused", "completed", "failed", "cancelled"]).optional(),
      simulationMode: z.enum(["aggressive", "normal", "safe", "custom"]).optional(),
      pogoStickingEnabled: z.boolean().optional(),
      pogoStickingRate: z.number().min(0).max(100).optional(),
      competitorClickCount: z.number().min(0).max(10).optional(),
      competitorDwellTime: z.number().min(1).max(30).optional(),
      targetDwellTime: z.number().min(5).max(600).optional(),
      scrollOnTarget: z.boolean().optional(),
      clickInternalLinks: z.boolean().optional(),
      serpPageDepth: z.number().min(1).max(10).optional(),
      randomizeOrder: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(simulations).set(data).where(and(eq(simulations.id, id), eq(simulations.userId, ctx.user.id)));
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(simulations).where(and(eq(simulations.id, input.id), eq(simulations.userId, ctx.user.id)));
      return { success: true };
    }),
    start: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Verify ownership
      const [sim] = await db.select().from(simulations).where(and(eq(simulations.id, input.id), eq(simulations.userId, ctx.user.id))).limit(1);
      if (!sim) throw new Error("Simülasyon bulunamadı");
      // Reset status and hits for restart
      await db.update(simulations).set({ status: "running", totalHits: 0, successHits: 0, failedHits: 0, startedAt: new Date(), completedAt: null }).where(eq(simulations.id, input.id));
      // Start worker engine
      const result = await workerEngine.startSimulation(input.id);
      if (!result.success) throw new Error(result.error || "Başlatılamadı");
      return { success: true };
    }),
    stop: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Verify ownership
      const [sim] = await db.select().from(simulations).where(and(eq(simulations.id, input.id), eq(simulations.userId, ctx.user.id))).limit(1);
      if (!sim) throw new Error("Simülasyon bulunamadı");
      // Stop worker engine
      await workerEngine.stopSimulation(input.id);
      return { success: true };
    }),
    engineMetrics: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const metrics = workerEngine.getMetrics(input.id);
      return metrics || { simulationId: input.id, totalHits: 0, successHits: 0, failedHits: 0, activeWorkers: 0, currentHitsPerMinute: 0, logs: [] };
    }),
    engineStatus: protectedProcedure.query(async () => {
      const running = workerEngine.getRunningSimulations();
      const allMetrics = workerEngine.getAllMetrics();
      return { runningCount: running.length, runningIds: running, metrics: allMetrics };
    }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { total: 0, running: 0, completed: 0, totalHits: 0, successRate: 0 };
      const all = await db.select().from(simulations).where(eq(simulations.userId, ctx.user.id));
      const running = all.filter(s => s.status === "running").length;
      const completed = all.filter(s => s.status === "completed").length;
      const totalHits = all.reduce((sum, s) => sum + (s.totalHits || 0), 0);
      const successHits = all.reduce((sum, s) => sum + (s.successHits || 0), 0);
      const successRate = totalHits > 0 ? Math.round((successHits / totalHits) * 100) : 0;
      return { total: all.length, running, completed, totalHits, successRate };
    }),
  }),

  // Workers CRUD
  workers: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(workers).orderBy(desc(workers.createdAt));
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      ipAddress: z.string().min(1),
      port: z.number().min(1).max(65535).default(8080),
      maxBrowsers: z.number().min(1).max(100).default(10),
      region: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(workers).values(input);
      return { success: true };
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      ipAddress: z.string().optional(),
      port: z.number().optional(),
      maxBrowsers: z.number().optional(),
      status: z.enum(["active", "idle", "offline", "error"]).optional(),
      region: z.string().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(workers).set(data).where(eq(workers.id, id));
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(workers).where(eq(workers.id, input.id));
      return { success: true };
    }),
  }),

  // Proxies CRUD
  proxies: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(proxies).orderBy(desc(proxies.createdAt));
    }),
    create: protectedProcedure.input(z.object({
      address: z.string().min(1),
      port: z.number().min(1).max(65535),
      protocol: z.enum(["http", "https", "socks5"]).default("http"),
      username: z.string().optional(),
      password: z.string().optional(),
      country: z.string().optional(),
      city: z.string().optional(),
      type: z.enum(["datacenter", "residential", "mobile"]).default("datacenter"),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.insert(proxies).values(input);
      return { success: true };
    }),
    bulkCreate: protectedProcedure.input(z.object({
      proxyList: z.string().min(1),
      protocol: z.enum(["http", "https", "socks5"]).default("http"),
      type: z.enum(["datacenter", "residential", "mobile"]).default("datacenter"),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const lines = input.proxyList.split("\n").filter(l => l.trim());
      const proxyValues = lines.map(line => {
        const parts = line.trim().split(":");
        return {
          address: parts[0] || "",
          port: parseInt(parts[1] || "8080"),
          protocol: input.protocol,
          type: input.type,
          username: parts[2] || undefined,
          password: parts[3] || undefined,
        };
      }).filter(p => p.address);
      if (proxyValues.length > 0) {
        await db.insert(proxies).values(proxyValues);
      }
      return { success: true, count: proxyValues.length };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(proxies).where(eq(proxies.id, input.id));
      return { success: true };
    }),
    deleteAll: protectedProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(proxies);
      return { success: true };
    }),
    stats: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { total: 0, active: 0, failed: 0, avgLatency: 0 };
      const all = await db.select().from(proxies);
      const active = all.filter(p => p.status === "active").length;
      const failed = all.filter(p => p.status === "failed").length;
      const avgLatency = all.length > 0 ? Math.round(all.reduce((sum, p) => sum + (p.latency || 0), 0) / all.length) : 0;
      return { total: all.length, active, failed, avgLatency };
    }),
  }),

  // Behavior Profiles
  behaviorProfiles: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(behaviorProfiles).orderBy(behaviorProfiles.name);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      minDwellTime: z.number().optional(),
      maxDwellTime: z.number().optional(),
      scrollSpeed: z.enum(["very_slow", "slow", "medium", "fast", "very_fast"]).optional(),
      scrollDepth: z.number().optional(),
      bounceRate: z.number().optional(),
      returningVisitorRate: z.number().optional(),
      clickProbability: z.number().optional(),
      mouseMovementIntensity: z.enum(["low", "medium", "high"]).optional(),
      pageViewsPerSession: z.number().optional(),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...data } = input;
      await db.update(behaviorProfiles).set(data).where(eq(behaviorProfiles.id, id));
      return { success: true };
    }),
  }),

  // Anti-Detect Settings
  antiDetect: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(antiDetectSettings).where(eq(antiDetectSettings.userId, ctx.user.id)).limit(1);
      if (result.length === 0) {
        await db.insert(antiDetectSettings).values({ userId: ctx.user.id });
        const newResult = await db.select().from(antiDetectSettings).where(eq(antiDetectSettings.userId, ctx.user.id)).limit(1);
        return newResult[0] || null;
      }
      return result[0];
    }),
    update: protectedProcedure.input(z.object({
      tlsFingerprint: z.boolean().optional(),
      ja3Randomization: z.boolean().optional(),
      ja4Randomization: z.boolean().optional(),
      canvasFingerprint: z.boolean().optional(),
      webglFingerprint: z.boolean().optional(),
      audioFingerprint: z.boolean().optional(),
      vmSpoofing: z.boolean().optional(),
      headlessBypass: z.boolean().optional(),
      clientHintsSpoof: z.boolean().optional(),
      webrtcProtection: z.boolean().optional(),
      timezoneSpoof: z.boolean().optional(),
      languageSpoof: z.boolean().optional(),
      screenResolutionRandom: z.boolean().optional(),
      fontFingerprintProtection: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const existing = await db.select().from(antiDetectSettings).where(eq(antiDetectSettings.userId, ctx.user.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(antiDetectSettings).values({ ...input, userId: ctx.user.id });
      } else {
        await db.update(antiDetectSettings).set(input).where(eq(antiDetectSettings.userId, ctx.user.id));
      }
      return { success: true };
    }),
  }),

  // Analytics Config
  analytics: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(analyticsConfig).where(eq(analyticsConfig.userId, ctx.user.id)).limit(1);
      if (result.length === 0) {
        await db.insert(analyticsConfig).values({ userId: ctx.user.id });
        const newResult = await db.select().from(analyticsConfig).where(eq(analyticsConfig.userId, ctx.user.id)).limit(1);
        return newResult[0] || null;
      }
      return result[0];
    }),
    update: protectedProcedure.input(z.object({
      ga4MeasurementId: z.string().optional(),
      ga4ApiSecret: z.string().optional(),
      gtmContainerId: z.string().optional(),
      fbPixelId: z.string().optional(),
      fbAccessToken: z.string().optional(),
      triggerPageView: z.boolean().optional(),
      triggerScroll: z.boolean().optional(),
      triggerClick: z.boolean().optional(),
      triggerFormSubmit: z.boolean().optional(),
      triggerEcommerce: z.boolean().optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(analyticsConfig).set(input).where(eq(analyticsConfig.userId, ctx.user.id));
      return { success: true };
    }),
  }),

  // System Config
  systemSettings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const result = await db.select().from(systemConfig).where(eq(systemConfig.userId, ctx.user.id)).limit(1);
      if (result.length === 0) {
        await db.insert(systemConfig).values({ userId: ctx.user.id });
        const newResult = await db.select().from(systemConfig).where(eq(systemConfig.userId, ctx.user.id)).limit(1);
        return newResult[0] || null;
      }
      return result[0];
    }),
    update: protectedProcedure.input(z.object({
      maxConcurrentBrowsers: z.number().optional(),
      sessionEncryption: z.boolean().optional(),
      encryptionAlgorithm: z.string().optional(),
      dnsOverHttps: z.boolean().optional(),
      dohProvider: z.string().optional(),
      http3Quic: z.boolean().optional(),
      tcpFastOpen: z.boolean().optional(),
      cpuAffinity: z.boolean().optional(),
      numaOptimization: z.boolean().optional(),
      circuitBreakerEnabled: z.boolean().optional(),
      circuitBreakerThreshold: z.number().optional(),
      rateLimitEnabled: z.boolean().optional(),
      rateLimitPerMinute: z.number().optional(),
      logLevel: z.enum(["debug", "info", "warn", "error"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(systemConfig).set(input).where(eq(systemConfig.userId, ctx.user.id));
      return { success: true };
    }),
  }),

  // Simulation Results / Reports
  reports: router({
    list: protectedProcedure.input(z.object({
      simulationId: z.number().optional(),
      limit: z.number().min(1).max(500).default(100),
    })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      if (input.simulationId) {
        return db.select().from(simulationResults).where(eq(simulationResults.simulationId, input.simulationId)).orderBy(desc(simulationResults.createdAt)).limit(input.limit);
      }
      // Get results for user's simulations
      const userSims = await db.select({ id: simulations.id }).from(simulations).where(eq(simulations.userId, ctx.user.id));
      if (userSims.length === 0) return [];
      const simIds = userSims.map(s => s.id);
      return db.select().from(simulationResults).where(sql`${simulationResults.simulationId} IN (${sql.raw(simIds.join(","))})`)
        .orderBy(desc(simulationResults.createdAt)).limit(input.limit);
    }),
    summary: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { totalResults: 0, successCount: 0, failCount: 0, avgDwellTime: 0, avgScrollDepth: 0 };
      const userSims = await db.select({ id: simulations.id }).from(simulations).where(eq(simulations.userId, ctx.user.id));
      if (userSims.length === 0) return { totalResults: 0, successCount: 0, failCount: 0, avgDwellTime: 0, avgScrollDepth: 0 };
      const simIds = userSims.map(s => s.id);
      const results = await db.select().from(simulationResults).where(sql`${simulationResults.simulationId} IN (${sql.raw(simIds.join(","))})`);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      const avgDwellTime = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + (r.dwellTime || 0), 0) / results.length) : 0;
      const avgScrollDepth = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + (r.scrollDepth || 0), 0) / results.length) : 0;
      return { totalResults: results.length, successCount, failCount, avgDwellTime, avgScrollDepth };
    }),
  }),

  // Dashboard Stats
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return {
        totalHits: 0, successRate: 0, activeProxies: 0, avgResponse: 0,
        qualityScore: "A+", totalCost: 0, memoryUsage: 0, goroutines: 0,
        activeSimulations: 0, totalWorkers: 0,
      };
      const userSims = await db.select().from(simulations).where(eq(simulations.userId, ctx.user.id));
      const allProxies = await db.select().from(proxies);
      const allWorkers = await db.select().from(workers);
      
      const totalHits = userSims.reduce((sum, s) => sum + (s.totalHits || 0), 0);
      const successHits = userSims.reduce((sum, s) => sum + (s.successHits || 0), 0);
      const successRate = totalHits > 0 ? Math.round((successHits / totalHits) * 100 * 10) / 10 : 0;
      const activeProxies = allProxies.filter(p => p.status === "active").length;
      const avgResponse = allProxies.length > 0 ? Math.round(allProxies.reduce((sum, p) => sum + (p.latency || 0), 0) / allProxies.length) : 0;
      const activeSimulations = userSims.filter(s => s.status === "running").length;
      
      return {
        totalHits, successRate, activeProxies, avgResponse,
        qualityScore: successRate >= 95 ? "A+" : successRate >= 85 ? "A" : successRate >= 70 ? "B" : "C",
        totalCost: 0, memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        goroutines: allWorkers.filter(w => w.status === "active").length * 10,
        activeSimulations, totalWorkers: allWorkers.length,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
