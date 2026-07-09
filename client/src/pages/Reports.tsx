import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, CheckCircle, XCircle, Clock, ArrowDown, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function Reports() {
  const { data: summary } = trpc.reports.summary.useQuery();
  const { data: results, isLoading } = trpc.reports.list.useQuery({ limit: 100 });

  const pieData = [
    { name: "Başarılı", value: summary?.successCount || 0, color: "oklch(0.7 0.18 160)" },
    { name: "Başarısız", value: summary?.failCount || 0, color: "oklch(0.63 0.22 25)" },
  ];

  const exportCSV = () => {
    if (!results || results.length === 0) return;
    const headers = ["ID", "URL", "Keyword", "Status", "Dwell Time", "Scroll Depth", "Pages", "Proxy", "Success", "Date"];
    const rows = results.map(r => [
      r.id, r.url, r.keyword || "", r.statusCode || "", r.dwellTime || "", r.scrollDepth || "",
      r.pagesVisited || "", r.proxyUsed || "", r.success ? "Yes" : "No",
      r.createdAt ? new Date(r.createdAt).toLocaleString("tr-TR") : ""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hitbot-report-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    if (!results || results.length === 0) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `hitbot-report-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Raporlar & Geçmiş</h2>
          <p className="text-xs text-muted-foreground">Tamamlanan görevlerin sonuçlarını analiz edin</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={exportJSON} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> JSON
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2 mb-1"><FileText className="w-3.5 h-3.5 text-cyan-400" /><span className="text-xs text-muted-foreground">Toplam</span></div>
          <p className="text-lg font-semibold text-cyan-400">{summary?.totalResults || 0}</p>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-3.5 h-3.5 text-green-400" /><span className="text-xs text-muted-foreground">Başarılı</span></div>
          <p className="text-lg font-semibold text-green-400">{summary?.successCount || 0}</p>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2 mb-1"><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-xs text-muted-foreground">Başarısız</span></div>
          <p className="text-lg font-semibold text-red-400">{summary?.failCount || 0}</p>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-3.5 h-3.5 text-yellow-400" /><span className="text-xs text-muted-foreground">Ort. Kalma</span></div>
          <p className="text-lg font-semibold text-yellow-400">{summary?.avgDwellTime || 0}s</p>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2 mb-1"><ArrowDown className="w-3.5 h-3.5 text-purple-400" /><span className="text-xs text-muted-foreground">Ort. Kaydırma</span></div>
          <p className="text-lg font-semibold text-purple-400">{summary?.avgScrollDepth || 0}%</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4 bg-card border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Başarı/Hata Dağılımı
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "oklch(0.16 0.005 285)", border: "1px solid oklch(0.25 0.005 285)", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "oklch(0.7 0.18 160)" }} /> Başarılı
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "oklch(0.63 0.22 25)" }} /> Başarısız
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Kalma Süresi Dağılımı
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={results?.slice(0, 20).map((r, i) => ({ name: `#${i + 1}`, dwell: r.dwellTime || 0 })) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.005 285)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.6 0.01 250)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.6 0.01 250)" }} />
                <Tooltip contentStyle={{ backgroundColor: "oklch(0.16 0.005 285)", border: "1px solid oklch(0.25 0.005 285)", borderRadius: "8px" }} />
                <Bar dataKey="dwell" fill="oklch(0.63 0.22 25)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Results Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="p-3 border-b border-border">
          <span className="text-xs text-muted-foreground">{results?.length || 0} sonuç listeleniyor</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-center text-muted-foreground text-sm">Yükleniyor...</p>
          ) : !results?.length ? (
            <div className="p-8 text-center">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Henüz sonuç bulunmuyor</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-muted-foreground">
                  <th className="p-2 text-left">URL</th>
                  <th className="p-2 text-left">Anahtar Kelime</th>
                  <th className="p-2 text-left">Durum</th>
                  <th className="p-2 text-left">Kalma</th>
                  <th className="p-2 text-left">Kaydırma</th>
                  <th className="p-2 text-left">Sonuç</th>
                  <th className="p-2 text-left">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2 font-mono text-foreground max-w-[200px] truncate">{r.url}</td>
                    <td className="p-2 text-muted-foreground">{r.keyword || "-"}</td>
                    <td className="p-2"><Badge variant="outline" className="text-xs">{r.statusCode || "-"}</Badge></td>
                    <td className="p-2 text-muted-foreground">{r.dwellTime || 0}s</td>
                    <td className="p-2 text-muted-foreground">{r.scrollDepth || 0}%</td>
                    <td className="p-2">{r.success ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}</td>
                    <td className="p-2 text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString("tr-TR") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
