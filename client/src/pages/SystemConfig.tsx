import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Shield, Cpu, Globe, Zap, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function SystemConfig() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.systemSettings.get.useQuery();
  const updateMutation = trpc.systemSettings.update.useMutation({
    onSuccess: () => { utils.systemSettings.get.invalidate(); toast.success("Sistem ayarları kaydedildi"); }
  });

  const [form, setForm] = useState({
    maxConcurrentBrowsers: 50,
    sessionEncryption: true,
    encryptionAlgorithm: "AES-256-GCM",
    dnsOverHttps: false,
    dohProvider: "https://cloudflare-dns.com/dns-query",
    http3Quic: false,
    tcpFastOpen: true,
    cpuAffinity: false,
    numaOptimization: false,
    circuitBreakerEnabled: true,
    circuitBreakerThreshold: 5,
    rateLimitEnabled: true,
    rateLimitPerMinute: 60,
    logLevel: "info" as const,
  });

  useEffect(() => {
    if (config) {
      setForm({
        maxConcurrentBrowsers: config.maxConcurrentBrowsers ?? 50,
        sessionEncryption: config.sessionEncryption ?? true,
        encryptionAlgorithm: config.encryptionAlgorithm || "AES-256-GCM",
        dnsOverHttps: config.dnsOverHttps ?? false,
        dohProvider: config.dohProvider || "https://cloudflare-dns.com/dns-query",
        http3Quic: config.http3Quic ?? false,
        tcpFastOpen: config.tcpFastOpen ?? true,
        cpuAffinity: config.cpuAffinity ?? false,
        numaOptimization: config.numaOptimization ?? false,
        circuitBreakerEnabled: config.circuitBreakerEnabled ?? true,
        circuitBreakerThreshold: config.circuitBreakerThreshold ?? 5,
        rateLimitEnabled: config.rateLimitEnabled ?? true,
        rateLimitPerMinute: config.rateLimitPerMinute ?? 60,
        logLevel: (config.logLevel as any) || "info",
      });
    }
  }, [config]);

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  if (isLoading) return <Card className="p-8 bg-card border-border text-center text-muted-foreground">Yükleniyor...</Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Sistem Konfigürasyonu</h2>
          <p className="text-xs text-muted-foreground">Kurumsal düzey güvenlik ve performans optimizasyonu</p>
        </div>
        <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90 gap-1.5" disabled={updateMutation.isPending}>
          <Save className="w-3.5 h-3.5" /> Kaydet
        </Button>
      </div>

      {/* Performance */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Performans</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Eş Zamanlı Tarayıcı Limiti</span>
              <span className="text-xs font-mono text-foreground">{form.maxConcurrentBrowsers}</span>
            </div>
            <Slider value={[form.maxConcurrentBrowsers]} min={1} max={200} step={1} onValueChange={([v]) => setForm(p => ({ ...p, maxConcurrentBrowsers: v }))} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm text-foreground">CPU Affinite</p><p className="text-xs text-muted-foreground">CPU çekirdek bağlama optimizasyonu</p></div>
            <Switch checked={form.cpuAffinity} onCheckedChange={(v) => setForm(p => ({ ...p, cpuAffinity: v }))} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm text-foreground">NUMA Optimizasyonu</p><p className="text-xs text-muted-foreground">Non-Uniform Memory Access optimizasyonu</p></div>
            <Switch checked={form.numaOptimization} onCheckedChange={(v) => setForm(p => ({ ...p, numaOptimization: v }))} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm text-foreground">TCP Fast Open</p><p className="text-xs text-muted-foreground">Bağlantı kurulum süresini azaltır</p></div>
            <Switch checked={form.tcpFastOpen} onCheckedChange={(v) => setForm(p => ({ ...p, tcpFastOpen: v }))} />
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Güvenlik</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm text-foreground">Oturum Şifreleme</p><p className="text-xs text-muted-foreground">AES-256-GCM ile oturum verilerini şifrele</p></div>
            <Switch checked={form.sessionEncryption} onCheckedChange={(v) => setForm(p => ({ ...p, sessionEncryption: v }))} />
          </div>
          {form.sessionEncryption && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Şifreleme Algoritması</label>
              <Input value={form.encryptionAlgorithm} onChange={e => setForm(p => ({ ...p, encryptionAlgorithm: e.target.value }))} className="bg-background font-mono max-w-xs" />
            </div>
          )}
        </div>
      </Card>

      {/* Network */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Globe className="w-4 h-4 text-green-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Ağ</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm text-foreground">DNS-over-HTTPS (DoH)</p><p className="text-xs text-muted-foreground">DNS sorgularını HTTPS üzerinden şifrele</p></div>
            <Switch checked={form.dnsOverHttps} onCheckedChange={(v) => setForm(p => ({ ...p, dnsOverHttps: v }))} />
          </div>
          {form.dnsOverHttps && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">DoH Sağlayıcı</label>
              <Input value={form.dohProvider} onChange={e => setForm(p => ({ ...p, dohProvider: e.target.value }))} className="bg-background font-mono" />
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm text-foreground">HTTP/3 QUIC</p><p className="text-xs text-muted-foreground">QUIC protokolü ile hızlı bağlantı</p></div>
            <Switch checked={form.http3Quic} onCheckedChange={(v) => setForm(p => ({ ...p, http3Quic: v }))} />
          </div>
        </div>
      </Card>

      {/* Rate Limiting & Circuit Breaker */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-yellow-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Hız Sınırlandırma & Devre Kesici</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm text-foreground">Hız Sınırlandırma</p><p className="text-xs text-muted-foreground">İstek hızını sınırla</p></div>
            <Switch checked={form.rateLimitEnabled} onCheckedChange={(v) => setForm(p => ({ ...p, rateLimitEnabled: v }))} />
          </div>
          {form.rateLimitEnabled && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Dakika Başına Limit</span>
                <span className="text-xs font-mono text-foreground">{form.rateLimitPerMinute}</span>
              </div>
              <Slider value={[form.rateLimitPerMinute]} min={1} max={1000} step={1} onValueChange={([v]) => setForm(p => ({ ...p, rateLimitPerMinute: v }))} />
            </div>
          )}
          <div className="flex items-center justify-between py-2">
            <div><p className="text-sm text-foreground">Devre Kesici (Circuit Breaker)</p><p className="text-xs text-muted-foreground">Ardışık hata sonrası otomatik durdurma</p></div>
            <Switch checked={form.circuitBreakerEnabled} onCheckedChange={(v) => setForm(p => ({ ...p, circuitBreakerEnabled: v }))} />
          </div>
          {form.circuitBreakerEnabled && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Hata Eşiği</span>
                <span className="text-xs font-mono text-foreground">{form.circuitBreakerThreshold}</span>
              </div>
              <Slider value={[form.circuitBreakerThreshold]} min={1} max={50} step={1} onValueChange={([v]) => setForm(p => ({ ...p, circuitBreakerThreshold: v }))} />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Log Seviyesi</label>
            <Select value={form.logLevel} onValueChange={(v: any) => setForm(p => ({ ...p, logLevel: v }))}>
              <SelectTrigger className="bg-background max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </div>
  );
}
