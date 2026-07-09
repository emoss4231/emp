import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Clock, ArrowDown, MousePointer, Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export default function BehaviorProfiles() {
  const utils = trpc.useUtils();
  const { data: profiles, isLoading } = trpc.behaviorProfiles.list.useQuery();
  const updateMutation = trpc.behaviorProfiles.update.useMutation({
    onSuccess: () => { utils.behaviorProfiles.list.invalidate(); toast.success("Profil güncellendi"); }
  });

  const handleUpdate = (id: number, field: string, value: any) => {
    updateMutation.mutate({ id, [field]: value });
  };

  const profileIcons: Record<string, string> = {
    fast_reader: "bg-blue-500/20 text-blue-400",
    shopper: "bg-green-500/20 text-green-400",
    researcher: "bg-purple-500/20 text-purple-400",
    casual_browser: "bg-orange-500/20 text-orange-400",
    social_visitor: "bg-pink-500/20 text-pink-400",
    mobile_user: "bg-cyan-500/20 text-cyan-400",
    returning_loyal: "bg-yellow-500/20 text-yellow-400",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Davranış Profilleri</h2>
          <p className="text-xs text-muted-foreground">Gerçek kullanıcı davranışlarını birebir taklit edin</p>
        </div>
        <Badge variant="secondary" className="text-xs gap-1">
          <Users className="w-3 h-3" /> {profiles?.length || 0} Profil
        </Badge>
      </div>

      {isLoading ? (
        <Card className="p-8 bg-card border-border text-center text-muted-foreground">Yükleniyor...</Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {profiles?.map(profile => (
            <Card key={profile.id} className="p-4 bg-card border-border hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${profileIcons[profile.slug] || 'bg-muted'}`}>
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground text-sm">{profile.name}</h4>
                  <p className="text-xs text-muted-foreground">{profile.description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Dwell Time */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Kalma Süresi</span>
                    <span className="text-xs font-mono text-foreground">{profile.minDwellTime}s - {profile.maxDwellTime}s</span>
                  </div>
                  <Slider
                    value={[profile.minDwellTime, profile.maxDwellTime]}
                    min={1} max={600} step={1}
                    onValueChange={([min, max]) => { handleUpdate(profile.id, "minDwellTime", min); handleUpdate(profile.id, "maxDwellTime", max); }}
                    className="w-full"
                  />
                </div>

                {/* Scroll Depth */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><ArrowDown className="w-3 h-3" />Kaydırma Derinliği</span>
                    <span className="text-xs font-mono text-foreground">{profile.scrollDepth}%</span>
                  </div>
                  <Slider value={[profile.scrollDepth]} min={0} max={100} step={1} onValueChange={([v]) => handleUpdate(profile.id, "scrollDepth", v)} />
                </div>

                {/* Bounce Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="w-3 h-3" />Hemen Çıkma Oranı</span>
                    <span className="text-xs font-mono text-foreground">{profile.bounceRate}%</span>
                  </div>
                  <Slider value={[profile.bounceRate]} min={0} max={100} step={1} onValueChange={([v]) => handleUpdate(profile.id, "bounceRate", v)} />
                </div>

                {/* Returning Visitor Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><RotateCcw className="w-3 h-3" />Geri Dönen Ziyaretçi</span>
                    <span className="text-xs font-mono text-foreground">{profile.returningVisitorRate}%</span>
                  </div>
                  <Slider value={[profile.returningVisitorRate]} min={0} max={100} step={1} onValueChange={([v]) => handleUpdate(profile.id, "returningVisitorRate", v)} />
                </div>

                {/* Click Probability */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><MousePointer className="w-3 h-3" />Tıklama Olasılığı</span>
                    <span className="text-xs font-mono text-foreground">{profile.clickProbability}%</span>
                  </div>
                  <Slider value={[profile.clickProbability]} min={0} max={100} step={1} onValueChange={([v]) => handleUpdate(profile.id, "clickProbability", v)} />
                </div>

                {/* Scroll Speed & Mouse Movement */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground mb-1 block">Kaydırma Hızı</span>
                    <Select value={profile.scrollSpeed} onValueChange={(v: any) => handleUpdate(profile.id, "scrollSpeed", v)}>
                      <SelectTrigger className="bg-background h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very_slow">Çok Yavaş</SelectItem>
                        <SelectItem value="slow">Yavaş</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="fast">Hızlı</SelectItem>
                        <SelectItem value="very_fast">Çok Hızlı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground mb-1 block">Fare Yoğunluğu</span>
                    <Select value={profile.mouseMovementIntensity} onValueChange={(v: any) => handleUpdate(profile.id, "mouseMovementIntensity", v)}>
                      <SelectTrigger className="bg-background h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Düşük</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="high">Yüksek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
