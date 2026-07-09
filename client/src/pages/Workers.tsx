import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Server, Trash2, Cpu, HardDrive, Globe } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Workers() {
  const utils = trpc.useUtils();
  const { data: workersList, isLoading } = trpc.workers.list.useQuery();
  const createMutation = trpc.workers.create.useMutation({ onSuccess: () => { utils.workers.list.invalidate(); toast.success("Worker eklendi"); setOpen(false); } });
  const deleteMutation = trpc.workers.delete.useMutation({ onSuccess: () => { utils.workers.list.invalidate(); toast.success("Worker silindi"); } });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", ipAddress: "", port: 8080, maxBrowsers: 10, region: "" });

  const statusColors: Record<string, string> = {
    active: "bg-green-500/20 text-green-400",
    idle: "bg-blue-500/20 text-blue-400",
    offline: "bg-gray-500/20 text-gray-400",
    error: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Worker Yönetimi</h2>
          <p className="text-xs text-muted-foreground">Dağıtık mimari worker düğümlerini yönetin</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Worker Ekle
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>Yeni Worker Ekle</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <Input placeholder="Worker Adı" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-background" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="IP Adresi" value={form.ipAddress} onChange={e => setForm(p => ({ ...p, ipAddress: e.target.value }))} className="bg-background" />
                <Input type="number" placeholder="Port" value={form.port} onChange={e => setForm(p => ({ ...p, port: +e.target.value }))} className="bg-background" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Maks Tarayıcı" value={form.maxBrowsers} onChange={e => setForm(p => ({ ...p, maxBrowsers: +e.target.value }))} className="bg-background" />
                <Input placeholder="Bölge (opsiyonel)" value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} className="bg-background" />
              </div>
              <Button onClick={() => createMutation.mutate(form)} className="w-full bg-primary" disabled={createMutation.isPending}>Worker Ekle</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading ? (
          <Card className="p-8 bg-card border-border text-center text-muted-foreground col-span-full">Yükleniyor...</Card>
        ) : !workersList?.length ? (
          <Card className="p-8 bg-card border-border text-center col-span-full">
            <Server className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Henüz worker eklenmedi</p>
          </Card>
        ) : (
          workersList.map(w => (
            <Card key={w.id} className="p-4 bg-card border-border hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm text-foreground">{w.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={`text-xs ${statusColors[w.status] || ""}`}>{w.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate({ id: w.id })} className="h-6 w-6 p-0 text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{w.ipAddress}:{w.port}</span>
                  {w.region && <span>{w.region}</span>}
                </div>
                <div>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span className="flex items-center gap-1"><Cpu className="w-3 h-3" />CPU</span>
                    <span>{w.cpuUsage || 0}%</span>
                  </div>
                  <Progress value={w.cpuUsage || 0} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-muted-foreground mb-1">
                    <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />Bellek</span>
                    <span>{w.memoryUsage || 0}%</span>
                  </div>
                  <Progress value={w.memoryUsage || 0} className="h-1.5" />
                </div>
                <div className="flex justify-between text-muted-foreground pt-1 border-t border-border">
                  <span>Tarayıcı: {w.activeBrowsers}/{w.maxBrowsers}</span>
                  <span>Görev: {w.totalTasksCompleted}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
