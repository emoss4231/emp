import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, float } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const simulations = mysqlTable("simulations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  targetUrl: text("targetUrl").notNull(),
  keywords: json("keywords").$type<string[]>().notNull(),
  durationMinutes: int("durationMinutes").notNull().default(60),
  hitsPerMinute: int("hitsPerMinute").notNull().default(10),
  maxPages: int("maxPages").notNull().default(5),
  behaviorProfileId: int("behaviorProfileId"),
  proxyStrategy: mysqlEnum("proxyStrategy", [
    "round_robin", "random", "fastest", "least_used", "geographic", "weighted", "sequential"
  ]).default("round_robin").notNull(),
  status: mysqlEnum("status", ["pending", "running", "paused", "completed", "failed", "cancelled"]).default("pending").notNull(),
  searchEngine: mysqlEnum("searchEngine", ["google", "bing", "yahoo", "duckduckgo", "all"]).default("google").notNull(),
  simulationMode: mysqlEnum("simulationMode", ["aggressive", "normal", "safe", "custom"]).default("normal").notNull(),
  pogoStickingEnabled: boolean("pogoStickingEnabled").default(true).notNull(),
  pogoStickingRate: int("pogoStickingRate").default(40).notNull(),
  competitorClickCount: int("competitorClickCount").default(2).notNull(),
  competitorDwellTime: int("competitorDwellTime").default(3).notNull(),
  targetDwellTime: int("targetDwellTime").default(60).notNull(),
  scrollOnTarget: boolean("scrollOnTarget").default(true).notNull(),
  clickInternalLinks: boolean("clickInternalLinks").default(true).notNull(),
  serpPageDepth: int("serpPageDepth").default(3).notNull(),
  randomizeOrder: boolean("randomizeOrder").default(true).notNull(),
  totalHits: int("totalHits").default(0).notNull(),
  successHits: int("successHits").default(0).notNull(),
  failedHits: int("failedHits").default(0).notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Simulation = typeof simulations.$inferSelect;
export type InsertSimulation = typeof simulations.$inferInsert;

export const workers = mysqlTable("workers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
  port: int("port").notNull().default(8080),
  status: mysqlEnum("status", ["active", "idle", "offline", "error"]).default("idle").notNull(),
  cpuUsage: float("cpuUsage").default(0),
  memoryUsage: float("memoryUsage").default(0),
  activeBrowsers: int("activeBrowsers").default(0),
  maxBrowsers: int("maxBrowsers").default(10),
  totalTasksCompleted: int("totalTasksCompleted").default(0),
  currentLoad: float("currentLoad").default(0),
  lastHeartbeat: timestamp("lastHeartbeat"),
  region: varchar("region", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Worker = typeof workers.$inferSelect;
export type InsertWorker = typeof workers.$inferInsert;

export const proxies = mysqlTable("proxies", {
  id: int("id").autoincrement().primaryKey(),
  address: varchar("address", { length: 255 }).notNull(),
  port: int("port").notNull(),
  protocol: mysqlEnum("protocol", ["http", "https", "socks5"]).default("http").notNull(),
  username: varchar("username", { length: 128 }),
  password: varchar("password", { length: 128 }),
  country: varchar("country", { length: 64 }),
  city: varchar("city", { length: 128 }),
  type: mysqlEnum("type", ["datacenter", "residential", "mobile"]).default("datacenter").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "failed", "testing"]).default("testing").notNull(),
  latency: int("latency"),
  successRate: float("successRate").default(100),
  totalRequests: int("totalRequests").default(0),
  failedRequests: int("failedRequests").default(0),
  lastChecked: timestamp("lastChecked"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Proxy = typeof proxies.$inferSelect;
export type InsertProxy = typeof proxies.$inferInsert;

export const behaviorProfiles = mysqlTable("behavior_profiles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  description: text("description"),
  minDwellTime: int("minDwellTime").notNull().default(5),
  maxDwellTime: int("maxDwellTime").notNull().default(120),
  scrollSpeed: mysqlEnum("scrollSpeed", ["very_slow", "slow", "medium", "fast", "very_fast"]).default("medium").notNull(),
  scrollDepth: int("scrollDepth").notNull().default(70),
  bounceRate: int("bounceRate").notNull().default(30),
  returningVisitorRate: int("returningVisitorRate").notNull().default(20),
  clickProbability: int("clickProbability").notNull().default(50),
  mouseMovementIntensity: mysqlEnum("mouseMovementIntensity", ["low", "medium", "high"]).default("medium").notNull(),
  pageViewsPerSession: int("pageViewsPerSession").notNull().default(3),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BehaviorProfile = typeof behaviorProfiles.$inferSelect;
export type InsertBehaviorProfile = typeof behaviorProfiles.$inferInsert;

export const antiDetectSettings = mysqlTable("anti_detect_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tlsFingerprint: boolean("tlsFingerprint").default(true).notNull(),
  ja3Randomization: boolean("ja3Randomization").default(true).notNull(),
  ja4Randomization: boolean("ja4Randomization").default(true).notNull(),
  canvasFingerprint: boolean("canvasFingerprint").default(true).notNull(),
  webglFingerprint: boolean("webglFingerprint").default(true).notNull(),
  audioFingerprint: boolean("audioFingerprint").default(true).notNull(),
  vmSpoofing: boolean("vmSpoofing").default(true).notNull(),
  headlessBypass: boolean("headlessBypass").default(true).notNull(),
  clientHintsSpoof: boolean("clientHintsSpoof").default(true).notNull(),
  webrtcProtection: boolean("webrtcProtection").default(true).notNull(),
  timezoneSpoof: boolean("timezoneSpoof").default(true).notNull(),
  languageSpoof: boolean("languageSpoof").default(true).notNull(),
  screenResolutionRandom: boolean("screenResolutionRandom").default(true).notNull(),
  fontFingerprintProtection: boolean("fontFingerprintProtection").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AntiDetectSetting = typeof antiDetectSettings.$inferSelect;
export type InsertAntiDetectSetting = typeof antiDetectSettings.$inferInsert;

export const analyticsConfig = mysqlTable("analytics_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ga4MeasurementId: varchar("ga4MeasurementId", { length: 64 }),
  ga4ApiSecret: varchar("ga4ApiSecret", { length: 128 }),
  gtmContainerId: varchar("gtmContainerId", { length: 64 }),
  fbPixelId: varchar("fbPixelId", { length: 64 }),
  fbAccessToken: varchar("fbAccessToken", { length: 255 }),
  triggerPageView: boolean("triggerPageView").default(true).notNull(),
  triggerScroll: boolean("triggerScroll").default(true).notNull(),
  triggerClick: boolean("triggerClick").default(true).notNull(),
  triggerFormSubmit: boolean("triggerFormSubmit").default(false).notNull(),
  triggerEcommerce: boolean("triggerEcommerce").default(false).notNull(),
  customEvents: json("customEvents").$type<Array<{ name: string; params: Record<string, string> }>>(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AnalyticsConfigRow = typeof analyticsConfig.$inferSelect;
export type InsertAnalyticsConfig = typeof analyticsConfig.$inferInsert;

export const systemConfig = mysqlTable("system_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  maxConcurrentBrowsers: int("maxConcurrentBrowsers").default(50).notNull(),
  sessionEncryption: boolean("sessionEncryption").default(true).notNull(),
  encryptionAlgorithm: varchar("encryptionAlgorithm", { length: 32 }).default("AES-256-GCM"),
  dnsOverHttps: boolean("dnsOverHttps").default(false).notNull(),
  dohProvider: varchar("dohProvider", { length: 128 }).default("https://cloudflare-dns.com/dns-query"),
  http3Quic: boolean("http3Quic").default(false).notNull(),
  tcpFastOpen: boolean("tcpFastOpen").default(true).notNull(),
  cpuAffinity: boolean("cpuAffinity").default(false).notNull(),
  numaOptimization: boolean("numaOptimization").default(false).notNull(),
  circuitBreakerEnabled: boolean("circuitBreakerEnabled").default(true).notNull(),
  circuitBreakerThreshold: int("circuitBreakerThreshold").default(5),
  rateLimitEnabled: boolean("rateLimitEnabled").default(true).notNull(),
  rateLimitPerMinute: int("rateLimitPerMinute").default(60),
  logLevel: mysqlEnum("logLevel", ["debug", "info", "warn", "error"]).default("info").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemConfigRow = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

export const simulationResults = mysqlTable("simulation_results", {
  id: int("id").autoincrement().primaryKey(),
  simulationId: int("simulationId").notNull(),
  workerId: int("workerId"),
  url: text("url").notNull(),
  keyword: varchar("keyword", { length: 255 }),
  statusCode: int("statusCode"),
  dwellTime: int("dwellTime"),
  scrollDepth: int("scrollDepth"),
  pagesVisited: int("pagesVisited").default(1),
  proxyUsed: varchar("proxyUsed", { length: 255 }),
  userAgent: text("userAgent"),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SimulationResult = typeof simulationResults.$inferSelect;
export type InsertSimulationResult = typeof simulationResults.$inferInsert;
