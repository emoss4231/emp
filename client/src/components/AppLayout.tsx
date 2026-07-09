import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Zap, Server, Shield, Globe, Users,
  BarChart3, Settings, FileText, LogOut, Activity, Loader2
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/simulations", label: "Simülasyon", icon: Zap },
  { path: "/workers", label: "Workers", icon: Server },
  { path: "/proxies", label: "Proxy", icon: Globe },
  { path: "/anti-detect", label: "Anti-Tespit", icon: Shield },
  { path: "/behavior-profiles", label: "Davranış", icon: Users },
  { path: "/analytics", label: "Analitik", icon: BarChart3 },
  { path: "/system", label: "Sistem", icon: Settings },
  { path: "/reports", label: "Raporlar", icon: FileText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 p-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Advanced HitBot</h1>
          </div>
          <p className="text-muted-foreground text-center max-w-md">
            Gelişmiş SEO trafik simülasyon yönetim paneline erişmek için giriş yapın.
          </p>
          <Button onClick={() => startLogin()} size="lg" className="bg-primary hover:bg-primary/90">
            Giriş Yap
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Header */}
      <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3 mr-8">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-foreground text-lg tracking-tight">HitBot</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">v3.1.0</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto flex-1">
          {navItems.map(item => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 ml-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Aktif</span>
          </div>
          <div className="h-5 w-px bg-border" />
          <span className="text-xs text-muted-foreground">{user?.name || "Admin"}</span>
          <Button variant="ghost" size="sm" onClick={() => logout()} className="h-7 w-7 p-0">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
