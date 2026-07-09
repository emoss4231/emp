import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Save, Activity, Tag, Facebook } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Analytics() {
  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.analytics.get.useQuery();
  const updateMutation = trpc.analytics.update.useMutation({
    onSuccess: () => { utils.analytics.get.invalidate(); toast.success("Analitik ayarları kaydedildi"); }
  });

  const [form, setForm] = useState({
    ga4MeasurementId: "", ga4ApiSecret: "", gtmContainerId: "",
    fbPixelId: "", fbAccessToken: "",
    triggerPageView: true, triggerScroll: true, triggerClick: true,
    triggerFormSubmit: false, triggerEcommerce: false,
  });

  useEffect(() => {
    if (config) {
      setForm({
        ga4MeasurementId: config.ga4MeasurementId || "",
        ga4ApiSecret: config.ga4ApiSecret || "",
        gtmContainerId: config.gtmContainerId || "",
        fbPixelId: config.fbPixelId || "",
        fbAccessToken: config.fbAccessToken || "",
        triggerPageView: config.triggerPageView ?? true,
        triggerScroll: config.triggerScroll ?? true,
        triggerClick: config.triggerClick ?? true,
        triggerFormSubmit: config.triggerFormSubmit ?? false,
        triggerEcommerce: config.triggerEcommerce ?? false,
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
          <h2 className="text-lg font-bold text-foreground">Analitik Entegrasyonu</h2>
          <p className="text-xs text-muted-foreground">GA4, GTM ve Facebook Pixel ile tam entegrasyon</p>
        </div>
        <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90 gap-1.5" disabled={updateMutation.isPending}>
          <Save className="w-3.5 h-3.5" /> Kaydet
        </Button>
      </div>

      {/* Google Analytics 4 */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Google Analytics 4</h3>
            <p className="text-xs text-muted-foreground">GA4 olay tetikleme ve ölçüm</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">{form.ga4MeasurementId ? "Yapılandırıldı" : "Yapılandırılmadı"}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Measurement ID</label>
            <Input placeholder="G-XXXXXXXXXX" value={form.ga4MeasurementId} onChange={e => setForm(p => ({ ...p, ga4MeasurementId: e.target.value }))} className="bg-background font-mono" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">API Secret</label>
            <Input placeholder="API Secret Key" type="password" value={form.ga4ApiSecret} onChange={e => setForm(p => ({ ...p, ga4ApiSecret: e.target.value }))} className="bg-background" />
          </div>
        </div>
      </Card>

      {/* Google Tag Manager */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Tag className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Google Tag Manager</h3>
            <p className="text-xs text-muted-foreground">GTM container entegrasyonu</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">{form.gtmContainerId ? "Yapılandırıldı" : "Yapılandırılmadı"}</Badge>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Container ID</label>
          <Input placeholder="GTM-XXXXXXX" value={form.gtmContainerId} onChange={e => setForm(p => ({ ...p, gtmContainerId: e.target.value }))} className="bg-background font-mono max-w-sm" />
        </div>
      </Card>

      {/* Facebook Pixel */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Facebook className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Facebook Pixel</h3>
            <p className="text-xs text-muted-foreground">Meta Pixel olay takibi</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">{form.fbPixelId ? "Yapılandırıldı" : "Yapılandırılmadı"}</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pixel ID</label>
            <Input placeholder="123456789012345" value={form.fbPixelId} onChange={e => setForm(p => ({ ...p, fbPixelId: e.target.value }))} className="bg-background font-mono" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Access Token</label>
            <Input placeholder="Access Token" type="password" value={form.fbAccessToken} onChange={e => setForm(p => ({ ...p, fbAccessToken: e.target.value }))} className="bg-background" />
          </div>
        </div>
      </Card>

      {/* Event Triggers */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Olay Tetikleyiciler</h3>
            <p className="text-xs text-muted-foreground">Hangi olayların tetikleneceğini yapılandırın</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { key: "triggerPageView", label: "Sayfa Görüntüleme", desc: "Her sayfa ziyaretinde page_view olayı tetikle" },
            { key: "triggerScroll", label: "Kaydırma", desc: "Sayfa kaydırma olaylarını tetikle" },
            { key: "triggerClick", label: "Tıklama", desc: "Element tıklama olaylarını tetikle" },
            { key: "triggerFormSubmit", label: "Form Gönderimi", desc: "Form submit olaylarını tetikle" },
            { key: "triggerEcommerce", label: "E-ticaret", desc: "E-ticaret olaylarını (add_to_cart, purchase) tetikle" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={(form as any)[item.key]} onCheckedChange={(v) => setForm(p => ({ ...p, [item.key]: v }))} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
