import { Switch, Route } from "wouter";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import Home from "@/pages/Home";
import GlobalConfig from "@/pages/GlobalConfig";
import InitialData from "@/pages/InitialData";
import Production from "@/pages/Production";
import Marketplace from "@/pages/Marketplace";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/config" component={GlobalConfig} />
          <Route path="/initial-data" component={InitialData} />
          <Route path="/production/:tab?" component={Production} />
          <Route path="/marketplace" component={Marketplace} />
          <Route path="/admin" component={Admin} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </ThemeProvider>
  );
}

export default App;
