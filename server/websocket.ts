import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { getDb } from "./db";
import { simulations, workers, proxies } from "../drizzle/schema";
import { eq } from "drizzle-orm";

let wss: WebSocketServer | null = null;
let metricsInterval: NodeJS.Timeout | null = null;

interface LiveMetrics {
  timestamp: number;
  totalHits: number;
  successRate: number;
  activeProxies: number;
  avgResponse: number;
  activeSimulations: number;
  hitsPerMinute: number;
  workers: Array<{
    id: number;
    name: string;
    status: string;
    cpuUsage: number;
    memoryUsage: number;
    activeBrowsers: number;
    currentLoad: number;
  }>;
  memoryUsage: number;
  cpuUsage: number;
}

export function initWebSocket(server: HttpServer) {
  wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[WebSocket] Client connected");

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (e) {
        // ignore invalid messages
      }
    });

    ws.on("close", () => {
      console.log("[WebSocket] Client disconnected");
    });

    // Send initial metrics immediately
    sendMetricsToClient(ws);
  });

  // Broadcast metrics every 2 seconds
  metricsInterval = setInterval(() => {
    broadcastMetrics();
  }, 2000);

  console.log("[WebSocket] Server initialized on /api/ws");
}

async function getMetrics(): Promise<LiveMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      timestamp: Date.now(),
      totalHits: 0,
      successRate: 0,
      activeProxies: 0,
      avgResponse: 0,
      activeSimulations: 0,
      hitsPerMinute: 0,
      workers: [],
      memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cpuUsage: 0,
    };
  }

  const allSims = await db.select().from(simulations);
  const allWorkers = await db.select().from(workers);
  const allProxies = await db.select().from(proxies);

  const totalHits = allSims.reduce((sum, s) => sum + (s.totalHits || 0), 0);
  const successHits = allSims.reduce((sum, s) => sum + (s.successHits || 0), 0);
  const successRate = totalHits > 0 ? Math.round((successHits / totalHits) * 100 * 10) / 10 : 0;
  const activeProxies = allProxies.filter(p => p.status === "active").length;
  const avgResponse = allProxies.length > 0 ? Math.round(allProxies.reduce((sum, p) => sum + (p.latency || 0), 0) / allProxies.length) : 0;
  const activeSimulations = allSims.filter(s => s.status === "running").length;
  const runningHitsPerMin = allSims.filter(s => s.status === "running").reduce((sum, s) => sum + (s.hitsPerMinute || 0), 0);

  return {
    timestamp: Date.now(),
    totalHits,
    successRate,
    activeProxies,
    avgResponse,
    activeSimulations,
    hitsPerMinute: runningHitsPerMin,
    workers: allWorkers.map(w => ({
      id: w.id,
      name: w.name,
      status: w.status,
      cpuUsage: w.cpuUsage || 0,
      memoryUsage: w.memoryUsage || 0,
      activeBrowsers: w.activeBrowsers || 0,
      currentLoad: w.currentLoad || 0,
    })),
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    cpuUsage: Math.round(Math.random() * 30 + 10), // Simulated CPU usage
  };
}

async function sendMetricsToClient(ws: WebSocket) {
  try {
    const metrics = await getMetrics();
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "metrics", data: metrics }));
    }
  } catch (e) {
    console.error("[WebSocket] Error sending metrics:", e);
  }
}

async function broadcastMetrics() {
  if (!wss || wss.clients.size === 0) return;

  try {
    const metrics = await getMetrics();
    const message = JSON.stringify({ type: "metrics", data: metrics });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch (e) {
    console.error("[WebSocket] Error broadcasting metrics:", e);
  }
}

export function broadcastEvent(event: string, data: any) {
  if (!wss) return;
  const message = JSON.stringify({ type: event, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
