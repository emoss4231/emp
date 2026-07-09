import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Fingerprint, Eye, Monitor, Lock, Globe, Cpu, Palette } from "lucide-react";
import { toast } from "sonner";

interface SettingItem {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  category: string;
}

const settings: SettingItem[] = [
  { key: "tlsFingerprint", label: "TLS Parmak İzi", description: "TLS el sıkışma parmak izini rastgeleleştirir", icon: Lock, category: "Ağ Güvenliği" },
  { key: "ja3Randomization", label: "JA3 Rastgeleleştirme", description: "JA3 hash değerini her oturumda değiştirir", icon: Shield, category: "Ağ Güvenliği" },
  { key: "ja4Randomization", label: "JA4 Rastgeleleştirme", description: "JA4+ parmak izini dinamik olarak üretir", icon: Shield, category: "Ağ Güvenliği" },
  { key: "canvasFingerprint", label: "Canvas Gizleme", description: "HTML5 Canvas parmak izini maskeleyerek tespit edilmeyi önler", icon: Palette, category: "Tarayıcı Parmak İzi" },
  { key: "webglFingerprint", label: "WebGL Gizleme", description: "WebGL render bilgilerini rastgeleleştirir", icon: Monitor, category: "Tarayıcı Parmak İzi" },
  { key: "audioFingerprint", label: "Audio Gizleme", description: "AudioContext parmak izini manipüle eder", icon: Cpu, category: "Tarayıcı Parmak İzi" },
  { key: "vmSpoofing", label: "VM Spoofing", description: "Sanal makine tespitini engeller", icon: Monitor, category: "Ortam Gizleme" },
  { key: "headlessBypass", label: "Headless Bypass", description: "Headless tarayıcı tespitini atlatır", icon: Eye, category: "Ortam Gizleme" },
  { key: "clientHintsSpoof", label: "Client Hints Spoofing", description: "User-Agent Client Hints değerlerini taklit eder", icon: Globe, category: "Ortam Gizleme" },
  { key: "webrtcProtection", label: "WebRTC Koruması", description: "WebRTC üzerinden gerçek IP sızıntısını engeller", icon: Shield, category: "Gizlilik" },
  { key: "timezoneSpoof", label: "Saat Dilimi Spoofing", description: "Proxy konumuna uygun saat dilimi ayarlar", icon: Globe, category: "Gizlilik" },
  { key: "languageSpoof", label: "Dil Spoofing", description: "Tarayıcı dilini hedef lokasyona göre ayarlar", icon: Globe, category: "Gizlilik" },
  { key: "screenResolutionRandom", label: "Ekran Çözünürlüğü", description: "Ekran boyutunu rastgele değiştirir", icon: Monitor, category: "Cihaz Bilgisi" },
  { key: "fontFingerprintProtection", label: "Font Parmak İzi", description: "Yüklü font listesini gizler", icon: Fingerprint, category: "Cihaz Bilgisi" },
];

export default function AntiDetect() {
  const utils = trpc.useUtils();
  const { data: antiDetectData, isLoading } = trpc.antiDetect.get.useQuery();
  const updateMutation = trpc.antiDetect.update.useMutation({
    onSuccess: () => { utils.antiDetect.get.invalidate(); toast.success("Ayar güncellendi"); }
  });

  const handleToggle = (key: string, value: boolean) => {
    updateMutation.mutate({ [key]: value });
  };

  const categories = Array.from(new Set(settings.map(s => s.category)));
  const enabledCount = antiDetectData ? Object.entries(antiDetectData).filter(([k, v]) => settings.some(s => s.key === k) && v === true).length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Anti-Tespit Ayarları</h2>
          <p className="text-xs text-muted-foreground">Gelişmiş parmak izi teknolojisi ile tespit edilmekten kaçının</p>
        </div>
        <Badge variant="secondary" className="text-xs gap-1">
          <Shield className="w-3 h-3 text-green-400" />
          {enabledCount}/{settings.length} Aktif
        </Badge>
      </div>

      {isLoading ? (
        <Card className="p-8 bg-card border-border text-center text-muted-foreground">Yükleniyor...</Card>
      ) : (
        categories.map(category => (
          <Card key={category} className="p-4 bg-card border-border">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {category}
            </h3>
            <div className="space-y-3">
              {settings.filter(s => s.category === category).map(setting => {
                const Icon = setting.icon;
                const isEnabled = antiDetectData ? (antiDetectData as any)[setting.key] : true;
                return (
                  <div key={setting.key} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-primary/20' : 'bg-muted'}`}>
                        <Icon className={`w-4 h-4 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{setting.label}</p>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                    </div>
                    <Switch checked={isEnabled} onCheckedChange={(v) => handleToggle(setting.key, v)} />
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
