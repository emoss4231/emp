import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Globe, Trash2, Upload, Activity, Wifi, WifiOff, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Proxies() {
  const utils = trpc.useUtils();
  const { data: proxyList, isLoading } = trpc.proxies.list.useQuery();
  const { data: stats } = trpc.proxies.stats.useQuery();
  const createMutation = trpc.proxies.create.useMutation({ onSuccess: () => { utils.proxies.list.invalidate(); utils.proxies.stats.invalidate(); toast.success("Proxy eklendi"); setOpen(false); } });
  const bulkCreateMutation = trpc.proxies.bulkCreate.useMutation({ onSuccess: (data) => { utils.proxies.list.invalidate(); utils.proxies.stats.invalidate(); toast.success(`${data.count} proxy eklendi`); setBulkOpen(false); } });
  const deleteMutation = trpc.proxies.delete.useMutation({ onSuccess: () => { utils.proxies.list.invalidate(); utils.proxies.stats.invalidate(); toast.success("Proxy silindi"); } });
  const deleteAllMutation = trpc.proxies.deleteAll.useMutation({ onSuccess: () => { utils.proxies.list.invalidate(); utils.proxies.stats.invalidate(); toast.success("Tüm proxy'ler silindi"); } });

  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState({ address: "", port: 8080, protocol: "http" as const, username: "", password: "", country: "", type: "datacenter" as const });
  const [bulkForm, setBulkForm] = useState({ proxyList: "", protocol: "http" as const, type: "datacenter" as const });

  const statusColors: Record<string, string> = {
    active: "text-green-400",
    inactive: "text-gray-400",
    failed: "text-red-400",
    testing: "text-yellow-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Proxy Yönetimi</h2>
          <p className="text-xs text-muted-foreground">7 rotasyon stratejisi ile profesyonel proxy yönetimi</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5"><Upload className="w-3.5 h-3.5" /> Toplu Ekle</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Toplu Proxy Ekle</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <p className="text-xs text-muted-foreground">Her satıra bir proxy yazın: ip:port veya ip:port:kullanıcı:şifre</p>
                <Textarea placeholder={"192.168.1.1:8080\n10.0.0.1:3128:user:pass"} value={bulkForm.proxyList} onChange={e => setBulkForm(p => ({ ...p, proxyList: e.target.value }))} rows={8} className="bg-background font-mono text-xs" />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={bulkForm.protocol} onValueChange={(v: any) => setBulkForm(p => ({ ...p, protocol: v }))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={bulkForm.type} onValueChange={(v: any) => setBulkForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="datacenter">Datacenter</SelectItem>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => bulkCreateMutation.mutate(bulkForm)} className="w-full bg-primary" disabled={bulkCreateMutation.isPending}>Toplu Ekle</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5"><Plus className="w-3.5 h-3.5" /> Proxy Ekle</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Proxy Ekle</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="IP Adresi" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="bg-background" />
                  <Input type="number" placeholder="Port" value={form.port} onChange={e => setForm(p => ({ ...p, port: +e.target.value }))} className="bg-background" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={form.protocol} onValueChange={(v: any) => setForm(p => ({ ...p, protocol: v }))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="https">HTTPS</SelectItem>
                      <SelectItem value="socks5">SOCKS5</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={form.type} onValueChange={(v: any) => setForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="datacenter">Datacenter</SelectItem>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="mobile">Mobile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Kullanıcı (opsiyonel)" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className="bg-background" />
                  <Input placeholder="Şifre (opsiyonel)" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="bg-background" />
                </div>
                <Input placeholder="Ülke (opsiyonel)" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} className="bg-background" />
                <Button onClick={() => createMutation.mutate(form)} className="w-full bg-primary" disabled={createMutation.isPending}>Proxy Ekle</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2 mb-1"><Globe className="w-3.5 h-3.5 text-cyan-400" /><span className="text-xs text-muted-foreground">Toplam</span></div>
          <p className="text-lg font-semibold text-cyan-400">{stats?.total || 0}</p>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2 mb-1"><Wifi className="w-3.5 h-3.5 text-green-400" /><span className="text-xs text-muted-foreground">Aktif</span></div>
          <p className="text-lg font-semibold text-green-400">{stats?.active || 0}</p>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2 mb-1"><WifiOff className="w-3.5 h-3.5 text-red-400" /><span className="text-xs text-muted-foreground">Başarısız</span></div>
          <p className="text-lg font-semibold text-red-400">{stats?.failed || 0}</p>
        </Card>
        <Card className="p-3 bg-card border-border">
          <div className="flex items-center gap-2 mb-1"><Zap className="w-3.5 h-3.5 text-yellow-400" /><span className="text-xs text-muted-foreground">Ort. Gecikme</span></div>
          <p className="text-lg font-semibold text-yellow-400">{stats?.avgLatency || 0}ms</p>
        </Card>
      </div>

      {/* Proxy List */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-xs text-muted-foreground">{proxyList?.length || 0} proxy listeleniyor</span>
          {(proxyList?.length || 0) > 0 && (
            <Button size="sm" variant="ghost" onClick={() => deleteAllMutation.mutate()} className="text-xs text-red-400 hover:text-red-300 h-6">Tümünü Sil</Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-center text-muted-foreground text-sm">Yükleniyor...</p>
          ) : !proxyList?.length ? (
            <div className="p-8 text-center">
              <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Henüz proxy eklenmedi</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="text-muted-foreground">
                  <th className="p-2 text-left">Adres</th>
                  <th className="p-2 text-left">Protokol</th>
                  <th className="p-2 text-left">Tür</th>
                  <th className="p-2 text-left">Durum</th>
                  <th className="p-2 text-left">Gecikme</th>
                  <th className="p-2 text-left">Başarı</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {proxyList.map(proxy => (
                  <tr key={proxy.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2 font-mono text-foreground">{proxy.address}:{proxy.port}</td>
                    <td className="p-2"><Badge variant="outline" className="text-xs">{proxy.protocol.toUpperCase()}</Badge></td>
                    <td className="p-2 text-muted-foreground">{proxy.type}</td>
                    <td className="p-2"><span className={statusColors[proxy.status]}>{proxy.status}</span></td>
                    <td className="p-2 text-muted-foreground">{proxy.latency || "-"}ms</td>
                    <td className="p-2 text-muted-foreground">{proxy.successRate || 100}%</td>
                    <td className="p-2">
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate({ id: proxy.id })} className="h-6 w-6 p-0 text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
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
