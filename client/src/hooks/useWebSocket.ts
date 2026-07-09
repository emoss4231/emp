import { useState, useEffect, useRef, useCallback } from "react";

export interface LiveMetrics {
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

/**
 * useWebSocket hook - Canlı metrik akışı
 * 
 * Önce WebSocket dener, başarısız olursa otomatik olarak
 * HTTP polling'e geçer. Deploy ortamlarında (Cloudflare/serverless)
 * WebSocket genellikle desteklenmez, bu yüzden polling fallback kritiktir.
 */
export function useWebSocket() {
  const [metrics, setMetrics] = useState<LiveMetrics | null>(null);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<Array<{ time: string; level: string; message: string }>>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modeRef = useRef<"ws" | "polling" | "connecting">("connecting");
  const failCountRef = useRef(0);

  const addLog = useCallback((level: string, message: string) => {
    setLogs(prev => {
      const newLogs = [...prev, { time: new Date().toLocaleTimeString("tr-TR"), level, message }];
      return newLogs.slice(-50);
    });
  }, []);

  // HTTP Polling - her 3 saniyede bir dashboard.stats endpoint'ini çağırır
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    modeRef.current = "polling";
    setConnected(true);
    addLog("info", "Metrik akışı aktif (HTTP modu)");

    const poll = async () => {
      try {
        const res = await fetch("/api/trpc/dashboard.stats?input=%7B%7D");
        if (res.ok) {
          const json = await res.json();
          const data = json?.result?.data;
          if (data) {
            setMetrics({
              timestamp: Date.now(),
              totalHits: data.totalHits || 0,
              successRate: data.successRate || 0,
              activeProxies: data.activeProxies || 0,
              avgResponse: data.avgResponse || 0,
              activeSimulations: data.activeSimulations || 0,
              hitsPerMinute: data.hitsPerMinute || 0,
              workers: data.workers || [],
              memoryUsage: data.memoryUsage || 0,
              cpuUsage: data.cpuUsage || 0,
            });
          }
        }
      } catch {
        // Silently handle polling errors
      }
    };

    // İlk çağrıyı hemen yap
    poll();
    pollingRef.current = setInterval(poll, 3000);
  }, [addLog]);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // WebSocket denemesi - 2 başarısız denemeden sonra polling'e geç
    if (failCountRef.current >= 2) {
      startPolling();
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // 5 saniye içinde bağlanamazsa timeout
      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
        }
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        modeRef.current = "ws";
        setConnected(true);
        failCountRef.current = 0;
        addLog("info", "WebSocket bağlantısı kuruldu");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "metrics") {
            setMetrics(data.data);
          } else if (data.type === "log") {
            addLog(data.data.level, data.data.message);
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        if (modeRef.current === "polling") return; // Already switched

        failCountRef.current++;
        setConnected(false);

        if (failCountRef.current >= 2) {
          // WebSocket desteklenmiyor, polling'e geç
          startPolling();
        } else {
          // Bir kez daha dene
          reconnectRef.current = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        ws.close();
      };
    } catch {
      failCountRef.current++;
      if (failCountRef.current >= 2) {
        startPolling();
      } else {
        reconnectRef.current = setTimeout(connect, 2000);
      }
    }
  }, [addLog, startPolling]);

  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return { metrics, connected, logs };
}
