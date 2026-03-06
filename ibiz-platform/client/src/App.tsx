/**
 * App.tsx — 路由系统
 * 三层路由架构：
 * 1. 公共路由：/ (Landing), /login, /register, /admin/login
 * 2. 用户路由：/dashboard/* (需用户登录) — nest 模式，内部用相对路径
 * 3. 管理员路由：/admin/* (需管理员角色) — nest 模式，内部用相对路径
 */
import React, { Suspense } from "react";
import { Switch, Route } from "wouter";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConfigProvider } from "@/lib/ConfigContext";
import { DesignPlanProvider } from "@/lib/DesignPlanContext";
import { ProtectedRoute, AdminRoute, PublicOnlyRoute } from "@/components/RouteGuards";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AdminLayout } from "@/components/AdminLayout";
import NotFound from "@/pages/NotFound";

// Lazy-loaded pages for smoother navigation
const Landing = React.lazy(() => import("@/pages/Landing"));
const Login = React.lazy(() => import("@/pages/Login"));
const Register = React.lazy(() => import("@/pages/Register"));
const AdminLogin = React.lazy(() => import("@/pages/AdminLogin"));
const Home = React.lazy(() => import("@/pages/Home"));
const GlobalConfig = React.lazy(() => import("@/pages/GlobalConfig"));
const Production = React.lazy(() => import("@/pages/Production"));
const Marketplace = React.lazy(() => import("@/pages/Marketplace"));
const AdminOverview = React.lazy(() => import("@/pages/admin/Overview"));
const UserManagement = React.lazy(() => import("@/pages/admin/UserManagement"));
const PlanManagement = React.lazy(() => import("@/pages/admin/PlanManagement"));
const SystemSettings = React.lazy(() => import("@/pages/admin/SystemSettings"));

/** Minimal loading fallback — keeps layout stable during lazy load */
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="size-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );
}

/**
 * User dashboard routes
 * nest 模式下 wouter 会剥离 /dashboard 前缀
 * 所以内部路由用相对路径：/ = /dashboard, /config = /dashboard/config
 */
function UserDashboard() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/config" component={GlobalConfig} />
            <Route path="/production/:tab?" component={Production} />
            <Route path="/marketplace" component={Marketplace} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
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
        <Suspense fallback={<PageLoader />}>
          <Switch>
            <Route path="/" component={AdminOverview} />
            <Route path="/users" component={UserManagement} />
            <Route path="/plans" component={PlanManagement} />
            <Route path="/settings" component={SystemSettings} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
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
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  );
}

export default App;
