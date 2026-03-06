/**
 * AdminLayout — 管理员后台布局
 * 注意：nest 模式下 useLocation 返回相对路径（不含 /admin 前缀）
 */
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Shield,
  Users,
  FileText,
  Settings,
  LayoutDashboard,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";

// nest 模式下使用相对路径
const adminRouteLabels: Record<string, string> = {
  "/": "概览",
  "/users": "用户管理",
  "/plans": "方案管理",
  "/settings": "系统设置",
};

function getAdminBreadcrumbs(path: string) {
  const crumbs: { label: string; path: string }[] = [{ label: "管理后台", path: "/" }];
  if (path !== "/") {
    const label = adminRouteLabels[path] || path.split("/").pop() || "";
    crumbs.push({ label, path });
  }
  return crumbs;
}

function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-gray-200">
      <SidebarHeader className="px-4 py-4">
        <div
          className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center cursor-pointer"
          onClick={() => setLocation("/")}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-sm">
            iB
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-foreground">iBizSim</span>
            <span className="text-xs text-muted-foreground">管理后台</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            管理
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/"}
                  tooltip="概览"
                  onClick={() => setLocation("/")}
                >
                  <LayoutDashboard className="size-4" />
                  <span>概览</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/users"}
                  tooltip="用户管理"
                  onClick={() => setLocation("/users")}
                >
                  <Users className="size-4" />
                  <span>用户管理</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/plans"}
                  tooltip="方案管理"
                  onClick={() => setLocation("/plans")}
                >
                  <FileText className="size-4" />
                  <span>方案管理</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/settings"}
                  tooltip="系统设置"
                  onClick={() => setLocation("/settings")}
                >
                  <Settings className="size-4" />
                  <span>系统设置</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="返回前台"
              onClick={() => { window.location.href = "/"; }}
            >
              <ArrowLeft className="size-4" />
              <span className="text-sm">返回前台</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="管理员" className="gap-2">
              <Avatar className="size-5">
                <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                  {user?.name?.[0] || "A"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{user?.name || "管理员"}</span>
              <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-200 bg-emerald-50 group-data-[collapsible=icon]:hidden">
                Admin
              </Badge>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="退出登录"
              onClick={() => { logout(); window.location.href = "/"; }}
            >
              <LogOut className="size-4 text-red-500" />
              <span className="text-sm text-red-500">退出登录</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminHeader() {
  const [location, setLocation] = useLocation();
  const crumbs = getAdminBreadcrumbs(location);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-white/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />

      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="cursor-pointer"
                    onClick={() => setLocation(crumb.path)}
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs gap-1">
          <Shield className="size-3" />
          管理模式
        </Badge>
      </div>
    </header>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader />
        <main className="flex-1 overflow-auto bg-gray-50/50">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
