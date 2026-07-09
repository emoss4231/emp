import { useWebSocket } from "@/hooks/useWebSocket";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Zap, Globe, Clock, Star, DollarSign, Cpu, Server,
  TrendingUp, CheckCircle, XCircle, Wifi, WifiOff
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useState, useEffect, useMemo } from "react";

export default function Dashboard() {
  const { metrics, connected, logs } = useWebSocket();
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const [trafficHistory, setTrafficHistory] = useState<Array<{ time: string; hits: number; success: number }>>([]);

  useEffect(() => {
    if (metrics) {
      setTrafficHistory(prev => {
        const newEntry = {
          time: new Date(metrics.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          hits: metrics.hitsPerMinute,
          success: metrics.successRate,
        };
        const updated = [...prev, newEntry].slice(-30);
        return updated;
      });
    }
  }, [metrics]);

  const kpiCards = useMemo(() => [
    { label: "Toplam Hit", value: stats?.totalHits?.toLocaleString() || "0", icon: Zap, color: "text-green-400", bgColor: "bg-green-400/10" },
    { label: "Başarı Oranı", value: `${stats?.successRate || 0}%`, icon: CheckCircle, color: "text-orange-400", bgColor: "bg-orange-400/10" },
    { label: "Aktif Proxy", value: stats?.activeProxies?.toString() || "0", icon: Globe, color: "text-cyan-400", bgColor: "bg-cyan-400/10" },
    { label: "Ort. Yanıt", value: `${stats?.avgResponse || 0}ms`, icon: Clock, color: "text-yellow-400", bgColor: "bg-yellow-400/10" },
  ], [stats]);

  const secondaryCards = useMemo(() => [
    { label: "Kalite Skoru", value: stats?.qualityScore || "A+", icon: Star, color: "text-purple-400" },
    { label: "Toplam Maliyet", value: `$${stats?.totalCost || 0}`, icon: DollarSign, color: "text-green-400" },
    { label: "Bellek (MB)", value: `${stats?.memoryUsage || 0}`, icon: Cpu, color: "text-blue-400" },
    { label: "Aktif Worker", value: `${stats?.totalWorkers || 0}`, icon: Server, color: "text-orange-400" },
  ], [stats]);

  return (
    <div className="space-y-4">
      {/* KPI Cards - Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4 bg-card border-border hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {secondaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-3 bg-card border-border">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <p className={`text-lg font-semibold ${card.color}`}>{card.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Traffic Chart */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Trafik Grafiği</h3>
          </div>
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-xs cursor-pointer">1S</Badge>
            <Badge variant="outline" className="text-xs cursor-pointer">24S</Badge>
            <Badge variant="outline" className="text-xs cursor-pointer">7G</Badge>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trafficHistory}>
              <defs>
                <linearGradient id="hitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.63 0.22 25)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.63 0.22 25)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.005 285)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "oklch(0.6 0.01 250)" }} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.6 0.01 250)" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "oklch(0.16 0.005 285)", border: "1px solid oklch(0.25 0.005 285)", borderRadius: "8px" }}
                labelStyle={{ color: "oklch(0.9 0.01 250)" }}
              />
              <Area type="monotone" dataKey="hits" stroke="oklch(0.63 0.22 25)" fill="url(#hitGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Live Logs */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Canlı Loglar</h3>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge variant="secondary" className="text-xs gap-1">
                <Wifi className="w-3 h-3 text-green-400" /> Bağlı
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs gap-1">
                <WifiOff className="w-3 h-3" /> Bağlantı Kesildi
              </Badge>
            )}
          </div>
        </div>
        <div className="bg-background rounded-lg p-3 h-40 overflow-y-auto log-terminal">
          {logs.length === 0 ? (
            <p className="text-muted-foreground italic">Log bekleniyor...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">[{log.time}]</span>
                <span className={`log-${log.level}`}>
                  [{log.level.toUpperCase()}] {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
