/**
 * App.tsx — 路由系统
 * 三层路由架构：
 * 1. 公共路由：/ (Landing), /login, /register, /admin/login
 * 2. 用户路由：/dashboard/* (需用户登录) — nest 模式，内部用相对路径
 * 3. 管理员路由：/admin/* (需管理员角色) — nest 模式，内部用相对路径
 */
import { Switch, Route } from "wouter";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConfigProvider } from "@/lib/ConfigContext";
import { DesignPlanProvider } from "@/lib/DesignPlanContext";
import { ProtectedRoute, AdminRoute, PublicOnlyRoute } from "@/components/RouteGuards";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AdminLayout } from "@/components/AdminLayout";

// Public pages
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminLogin from "@/pages/AdminLogin";
import NotFound from "@/pages/NotFound";

// User pages
import Home from "@/pages/Home";
import GlobalConfig from "@/pages/GlobalConfig";
import Production from "@/pages/Production";
import Marketplace from "@/pages/Marketplace";

// Admin pages
import AdminOverview from "@/pages/admin/Overview";
import UserManagement from "@/pages/admin/UserManagement";
import PlanManagement from "@/pages/admin/PlanManagement";
import SystemSettings from "@/pages/admin/SystemSettings";

/**
 * User dashboard routes
 * nest 模式下 wouter 会剥离 /dashboard 前缀
 * 所以内部路由用相对路径：/ = /dashboard, /config = /dashboard/config
 */
function UserDashboard() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/config" component={GlobalConfig} />
          <Route path="/production/:tab?" component={Production} />
          <Route path="/marketplace" component={Marketplace} />
          <Route component={NotFound} />
        </Switch>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

/**
 * Admin panel routes
 * nest 模式下 wouter 会剥离 /admin 前缀
 * 所以内部路由用相对路径：/ = /admin, /users = /admin/users
 */
function AdminPanel() {
  return (
    <AdminRoute>
      <AdminLayout>
        <Switch>
          <Route path="/" component={AdminOverview} />
          <Route path="/users" component={UserManagement} />
          <Route path="/plans" component={PlanManagement} />
          <Route path="/settings" component={SystemSettings} />
          <Route component={NotFound} />
        </Switch>
      </AdminLayout>
    </AdminRoute>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <ConfigProvider>
          <DesignPlanProvider>
            <AppRoutes />
          </DesignPlanProvider>
        </ConfigProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/">
        <PublicOnlyRoute>
          <Landing />
        </PublicOnlyRoute>
      </Route>
      <Route path="/login">
        <PublicOnlyRoute>
          <Login />
        </PublicOnlyRoute>
      </Route>
      <Route path="/register">
        <PublicOnlyRoute>
          <Register />
        </PublicOnlyRoute>
      </Route>
      <Route path="/admin/login">
        <PublicOnlyRoute>
          <AdminLogin />
        </PublicOnlyRoute>
      </Route>

      {/* User dashboard routes — nest strips /dashboard prefix */}
      <Route path="/dashboard" nest>
        <UserDashboard />
      </Route>

      {/* Admin routes — nest strips /admin prefix */}
      <Route path="/admin" nest>
        <AdminPanel />
      </Route>

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
