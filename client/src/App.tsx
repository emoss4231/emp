import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Simulations from "./pages/Simulations";
import Workers from "./pages/Workers";
import Proxies from "./pages/Proxies";
import AntiDetect from "./pages/AntiDetect";
import BehaviorProfiles from "./pages/BehaviorProfiles";
import Analytics from "./pages/Analytics";
import SystemConfig from "./pages/SystemConfig";
import Reports from "./pages/Reports";
import AppLayout from "./components/AppLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/simulations" component={Simulations} />
      <Route path="/workers" component={Workers} />
      <Route path="/proxies" component={Proxies} />
      <Route path="/anti-detect" component={AntiDetect} />
      <Route path="/behavior-profiles" component={BehaviorProfiles} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/system" component={SystemConfig} />
      <Route path="/reports" component={Reports} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AppLayout>
            <Router />
          </AppLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
