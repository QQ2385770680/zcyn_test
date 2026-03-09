/**
 * RouteGuards — 路由守卫组件
 * ProtectedRoute: 需要用户登录才能访问
 * AdminRoute: 需要管理员角色才能访问
 * PublicOnlyRoute: 已登录用户自动跳转到对应面板
 */
import { useAuth } from "@/contexts/AuthContext";
import { Redirect } from "wouter";
import { Spinner } from "@/components/ui/spinner";

/** 需要登录（任意角色）才能访问的路由 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8 text-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

/** 需要管理员角色才能访问的路由 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8 text-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/admin/login" />;
  }

  if (!isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

/** 已登录用户访问公共页面（登录/注册）时自动跳转 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="size-8 text-emerald-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to={isAdmin ? "/admin" : "/dashboard"} />;
  }

  return <>{children}</>;
}
