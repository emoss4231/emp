import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Play, Square, Trash2, Zap, Globe, Clock, Target, Flame, Shield, Settings2, Crosshair, Activity, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const MODE_PRESETS = {
  aggressive: {
    label: "Agresif",
    icon: Flame,
    color: "text-red-400",
    bgColor: "bg-red-500/10 border-red-500/30",
    description: "Yüksek hacim, hızlı sonuç. 2 günde sıralama hedefi.",
    hitsPerMinute: 30,
    pogoStickingEnabled: true,
    pogoStickingRate: 60,
    competitorClickCount: 3,
    competitorDwellTime: 2,
    targetDwellTime: 90,
    scrollOnTarget: true,
    clickInternalLinks: true,
    serpPageDepth: 5,
    randomizeOrder: true,
  },
  normal: {
    label: "Normal",
    icon: Activity,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    description: "Dengeli hacim, kademeli artış. 1-2 haftada sonuç.",
    hitsPerMinute: 10,
    pogoStickingEnabled: true,
    pogoStickingRate: 40,
    competitorClickCount: 2,
    competitorDwellTime: 3,
    targetDwellTime: 60,
    scrollOnTarget: true,
    clickInternalLinks: true,
    serpPageDepth: 3,
    randomizeOrder: true,
  },
  safe: {
    label: "Güvenli",
    icon: Shield,
    color: "text-green-400",
    bgColor: "bg-green-500/10 border-green-500/30",
    description: "Düşük hacim, minimum tespit riski. 3-4 haftada sonuç.",
    hitsPerMinute: 5,
    pogoStickingEnabled: true,
    pogoStickingRate: 20,
    competitorClickCount: 1,
    competitorDwellTime: 5,
    targetDwellTime: 45,
    scrollOnTarget: true,
    clickInternalLinks: false,
    serpPageDepth: 2,
    randomizeOrder: true,
  },
  custom: {
    label: "Özel",
    icon: Settings2,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    description: "Tüm parametreleri kendiniz ayarlayın.",
    hitsPerMinute: 10,
    pogoStickingEnabled: true,
    pogoStickingRate: 40,
    competitorClickCount: 2,
    competitorDwellTime: 3,
    targetDwellTime: 60,
    scrollOnTarget: true,
    clickInternalLinks: true,
    serpPageDepth: 3,
    randomizeOrder: true,
  },
};

type ModeKey = keyof typeof MODE_PRESETS;

export default function Simulations() {
  const utils = trpc.useUtils();
  const { data: simulations, isLoading } = trpc.simulations.list.useQuery(undefined, {
    refetchInterval: 3000, // Canlı güncelleme: 3 saniyede bir
  });
  const { data: profiles } = trpc.behaviorProfiles.list.useQuery();
  const createMutation = trpc.simulations.create.useMutation({ onSuccess: () => { utils.simulations.list.invalidate(); toast.success("Simülasyon oluşturuldu"); setOpen(false); } });
  const startMutation = trpc.simulations.start.useMutation({ onSuccess: () => { utils.simulations.list.invalidate(); toast.success("Simülasyon başlatıldı — Motor çalışıyor!"); } });
  const stopMutation = trpc.simulations.stop.useMutation({ onSuccess: () => { utils.simulations.list.invalidate(); toast.success("Simülasyon durduruldu"); } });
  const deleteMutation = trpc.simulations.delete.useMutation({ onSuccess: () => { utils.simulations.list.invalidate(); toast.success("Simülasyon silindi"); } });

  const [open, setOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ModeKey>("aggressive");
  const [form, setForm] = useState({
    name: "", targetUrl: "", keywords: "", durationMinutes: 60,
    hitsPerMinute: 30, maxPages: 5, proxyStrategy: "round_robin" as const,
    searchEngine: "google" as const, behaviorProfileId: undefined as number | undefined,
    simulationMode: "aggressive" as "aggressive" | "normal" | "safe" | "custom",
    pogoStickingEnabled: true,
    pogoStickingRate: 60,
    competitorClickCount: 3,
    competitorDwellTime: 2,
    targetDwellTime: 90,
    scrollOnTarget: true,
    clickInternalLinks: true,
    serpPageDepth: 5,
    randomizeOrder: true,
  });

  // When mode changes, apply preset values
  useEffect(() => {
    if (selectedMode !== "custom") {
      const preset = MODE_PRESETS[selectedMode];
      setForm(prev => ({
        ...prev,
        simulationMode: selectedMode,
        hitsPerMinute: preset.hitsPerMinute,
        pogoStickingEnabled: preset.pogoStickingEnabled,
        pogoStickingRate: preset.pogoStickingRate,
        competitorClickCount: preset.competitorClickCount,
        competitorDwellTime: preset.competitorDwellTime,
        targetDwellTime: preset.targetDwellTime,
        scrollOnTarget: preset.scrollOnTarget,
        clickInternalLinks: preset.clickInternalLinks,
        serpPageDepth: preset.serpPageDepth,
        randomizeOrder: preset.randomizeOrder,
      }));
    } else {
      setForm(prev => ({ ...prev, simulationMode: "custom" as const }));
    }
  }, [selectedMode]);

  const handleCreate = () => {
    if (!form.name || !form.targetUrl || !form.keywords) {
      toast.error("Tüm zorunlu alanları doldurun");
      return;
    }
    createMutation.mutate({
      ...form,
      keywords: form.keywords.split(",").map(k => k.trim()).filter(Boolean),
    });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    running: "bg-green-500/20 text-green-400",
    paused: "bg-blue-500/20 text-blue-400",
    completed: "bg-gray-500/20 text-gray-400",
    failed: "bg-red-500/20 text-red-400",
    cancelled: "bg-gray-500/20 text-gray-500",
  };

  const modeLabels: Record<string, { label: string; color: string }> = {
    aggressive: { label: "AGRESİF", color: "bg-red-500/20 text-red-400" },
    normal: { label: "NORMAL", color: "bg-blue-500/20 text-blue-400" },
    safe: { label: "GÜVENLİ", color: "bg-green-500/20 text-green-400" },
    custom: { label: "ÖZEL", color: "bg-purple-500/20 text-purple-400" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Simülasyon Görevleri</h2>
          <p className="text-xs text-muted-foreground">SERP tıklama manipülasyonu ile trafik simülasyonları oluşturun</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Yeni Simülasyon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-primary" />
                Yeni Simülasyon Oluştur
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="mode" className="mt-3">
              <TabsList className="grid w-full grid-cols-3 bg-background">
                <TabsTrigger value="mode">Mod Seçimi</TabsTrigger>
                <TabsTrigger value="target">Hedef & Ayarlar</TabsTrigger>
                <TabsTrigger value="advanced">Gelişmiş</TabsTrigger>
              </TabsList>

              {/* MOD SEÇİMİ */}
              <TabsContent value="mode" className="space-y-3 mt-3">
                <p className="text-xs text-muted-foreground">Simülasyon modunu seçin. Her mod farklı hız ve risk seviyesine sahiptir.</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(MODE_PRESETS) as [ModeKey, typeof MODE_PRESETS.aggressive][]).map(([key, preset]) => {
                    const Icon = preset.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedMode(key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedMode === key
                            ? `${preset.bgColor} border-2`
                            : "bg-background border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${preset.color}`} />
                          <span className={`font-semibold text-sm ${preset.color}`}>{preset.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{preset.description}</p>
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-[10px]">{preset.hitsPerMinute} hit/dk</Badge>
                          <Badge variant="outline" className="text-[10px]">Pogo: %{preset.pogoStickingRate}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Mode parameters preview */}
                <Card className="p-3 bg-background border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Mod Parametreleri</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Hit/Dakika:</span><span className="font-mono text-foreground">{form.hitsPerMinute}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Pogo Oranı:</span><span className="font-mono text-foreground">%{form.pogoStickingRate}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Rakip Tıklama:</span><span className="font-mono text-foreground">{form.competitorClickCount}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Rakip Kalma:</span><span className="font-mono text-foreground">{form.competitorDwellTime}sn</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Hedef Kalma:</span><span className="font-mono text-foreground">{form.targetDwellTime}sn</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">SERP Derinlik:</span><span className="font-mono text-foreground">{form.serpPageDepth} sayfa</span></div>
                  </div>
                </Card>
              </TabsContent>

              {/* HEDEF & AYARLAR */}
              <TabsContent value="target" className="space-y-3 mt-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Görev Adı *</label>
                  <Input placeholder="Örn: Ana Sayfa SEO Boost" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-background" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Hedef URL *</label>
                  <Input placeholder="https://example.com" value={form.targetUrl} onChange={e => setForm(p => ({ ...p, targetUrl: e.target.value }))} className="bg-background" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Anahtar Kelimeler * (virgülle ayırın)</label>
                  <Input placeholder="istanbul escort, escort istanbul" value={form.keywords} onChange={e => setForm(p => ({ ...p, keywords: e.target.value }))} className="bg-background" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Süre (dk)</label>
                    <Input type="number" value={form.durationMinutes} onChange={e => setForm(p => ({ ...p, durationMinutes: +e.target.value }))} className="bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Hit/Dakika</label>
                    <Input type="number" value={form.hitsPerMinute} onChange={e => setForm(p => ({ ...p, hitsPerMinute: +e.target.value }))} className="bg-background" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Maks Sayfa</label>
                    <Input type="number" value={form.maxPages} onChange={e => setForm(p => ({ ...p, maxPages: +e.target.value }))} className="bg-background" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Arama Motoru</label>
                    <Select value={form.searchEngine} onValueChange={(v: any) => setForm(p => ({ ...p, searchEngine: v }))}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="bing">Bing</SelectItem>
                        <SelectItem value="yahoo">Yahoo</SelectItem>
                        <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
                        <SelectItem value="all">Tümü (Karışık)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Proxy Stratejisi</label>
                    <Select value={form.proxyStrategy} onValueChange={(v: any) => setForm(p => ({ ...p, proxyStrategy: v }))}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round_robin">Round Robin</SelectItem>
                        <SelectItem value="random">Rastgele</SelectItem>
                        <SelectItem value="fastest">En Hızlı</SelectItem>
                        <SelectItem value="least_used">En Az Kullanılan</SelectItem>
                        <SelectItem value="geographic">Coğrafi</SelectItem>
                        <SelectItem value="weighted">Ağırlıklı</SelectItem>
                        <SelectItem value="sequential">Sıralı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Davranış Profili</label>
                  <Select value={form.behaviorProfileId?.toString() || "none"} onValueChange={(v) => setForm(p => ({ ...p, behaviorProfileId: v === "none" ? undefined : +v }))}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Profil seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Varsayılan</SelectItem>
                      {profiles?.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* GELİŞMİŞ AYARLAR */}
              <TabsContent value="advanced" className="space-y-4 mt-3">
                <p className="text-xs text-muted-foreground">Pogo-Sticking ve SERP manipülasyon parametrelerini özelleştirin.</p>

                {/* Pogo-Sticking */}
                <Card className="p-3 bg-background border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Pogo-Sticking</h4>
                      <p className="text-xs text-muted-foreground">Rakiplere tıklayıp hızla geri dönme</p>
                    </div>
                    <Switch checked={form.pogoStickingEnabled} onCheckedChange={(v) => setForm(p => ({ ...p, pogoStickingEnabled: v }))} />
                  </div>
                  {form.pogoStickingEnabled && (
                    <div className="space-y-3 pt-2 border-t border-border">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Pogo Oranı</span>
                          <span className="font-mono text-primary">%{form.pogoStickingRate}</span>
                        </div>
                        <Slider value={[form.pogoStickingRate]} onValueChange={([v]) => setForm(p => ({ ...p, pogoStickingRate: v }))} min={0} max={100} step={5} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Rakip Tıklama Sayısı</label>
                          <Input type="number" value={form.competitorClickCount} onChange={e => setForm(p => ({ ...p, competitorClickCount: +e.target.value }))} className="bg-card" min={0} max={10} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Rakipte Kalma (sn)</label>
                          <Input type="number" value={form.competitorDwellTime} onChange={e => setForm(p => ({ ...p, competitorDwellTime: +e.target.value }))} className="bg-card" min={1} max={30} />
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Hedef Site Davranışı */}
                <Card className="p-3 bg-background border-border space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Hedef Site Davranışı</h4>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Hedefte Kalma Süresi</span>
                      <span className="font-mono text-primary">{form.targetDwellTime}sn</span>
                    </div>
                    <Slider value={[form.targetDwellTime]} onValueChange={([v]) => setForm(p => ({ ...p, targetDwellTime: v }))} min={5} max={300} step={5} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sayfada Kaydırma</span>
                    <Switch checked={form.scrollOnTarget} onCheckedChange={(v) => setForm(p => ({ ...p, scrollOnTarget: v }))} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">İç Linklere Tıklama</span>
                    <Switch checked={form.clickInternalLinks} onCheckedChange={(v) => setForm(p => ({ ...p, clickInternalLinks: v }))} />
                  </div>
                </Card>

                {/* SERP Ayarları */}
                <Card className="p-3 bg-background border-border space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">SERP Ayarları</h4>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">SERP Sayfa Derinliği</span>
                      <span className="font-mono text-primary">{form.serpPageDepth} sayfa</span>
                    </div>
                    <Slider value={[form.serpPageDepth]} onValueChange={([v]) => setForm(p => ({ ...p, serpPageDepth: v }))} min={1} max={10} step={1} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sıra Rastgeleleştirme</span>
                    <Switch checked={form.randomizeOrder} onCheckedChange={(v) => setForm(p => ({ ...p, randomizeOrder: v }))} />
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

            <Button onClick={handleCreate} className="w-full bg-primary hover:bg-primary/90 mt-4" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Oluşturuluyor..." : "Simülasyon Oluştur"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Simulations List */}
      <div className="space-y-2">
        {isLoading ? (
          <Card className="p-8 bg-card border-border text-center text-muted-foreground">Yükleniyor...</Card>
        ) : !simulations?.length ? (
          <Card className="p-8 bg-card border-border text-center">
            <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Henüz simülasyon oluşturulmadı</p>
            <p className="text-xs text-muted-foreground mt-1">Yeni bir simülasyon oluşturarak başlayın</p>
          </Card>
        ) : (
          simulations.map(sim => (
            <Card key={sim.id} className="p-4 bg-card border-border hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-foreground text-sm">{sim.name}</h4>
                    <Badge className={`text-xs ${statusColors[sim.status] || ""}`}>{sim.status}</Badge>
                    {sim.simulationMode && (
                      <Badge className={`text-[10px] ${modeLabels[sim.simulationMode]?.color || ""}`}>
                        {modeLabels[sim.simulationMode]?.label || sim.simulationMode}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" />{typeof sim.targetUrl === 'string' ? sim.targetUrl.slice(0, 40) : ''}...</span>
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{sim.hitsPerMinute} hit/dk</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{sim.durationMinutes} dk</span>
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{sim.searchEngine}</span>
                    <span className={`flex items-center gap-1 ${sim.status === 'running' ? 'text-yellow-400 animate-pulse' : sim.successHits > 0 ? 'text-green-400' : 'text-muted-foreground'}`}>
                      <Activity className="w-3 h-3" />{sim.successHits || 0}/{sim.totalHits || 0} hit
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {sim.status === "running" ? (
                    <Button size="sm" variant="ghost" onClick={() => stopMutation.mutate({ id: sim.id })} className="h-7 w-7 p-0 text-yellow-400 hover:text-yellow-300" disabled={stopMutation.isPending} title="Durdur">
                      <Square className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startMutation.mutate({ id: sim.id })} className="h-7 w-7 p-0 text-green-400 hover:text-green-300" disabled={startMutation.isPending} title={sim.status === 'completed' || sim.status === 'failed' ? 'Tekrar Başlat' : 'Başlat'}>
                      {sim.status === 'completed' || sim.status === 'failed' ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate({ id: sim.id })} className="h-7 w-7 p-0 text-red-400 hover:text-red-300" disabled={deleteMutation.isPending} title="Sil">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
