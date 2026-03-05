/**
 * AppHeader — 顶部状态栏
 * 设计风格：简洁白色，左侧面包屑，右侧用户操作
 */
import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Shield } from "lucide-react";
import { useLocation } from "wouter";

const routeLabels: Record<string, string> = {
  "/": "首页",
  "/config": "全局配置",
  "/initial-data": "初始数据",
  "/production": "生产决策",
  "/production/simulator": "模拟器",
  "/production/designer": "方案设计器",
  "/production/plans": "我的方案",
  "/marketplace": "方案市场",
  "/admin": "管理后台",
  "/admin/users": "用户管理",
  "/admin/plans": "方案管理",
  "/admin/settings": "系统设置",
};

function getBreadcrumbs(path: string) {
  if (path === "/") return [{ label: "首页", path: "/" }];
  const segments = path.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [{ label: "首页", path: "/" }];
  let currentPath = "";
  for (const seg of segments) {
    currentPath += `/${seg}`;
    const label = routeLabels[currentPath] || seg;
    crumbs.push({ label, path: currentPath });
  }
  return crumbs;
}

export function AppHeader() {
  const [location, setLocation] = useLocation();
  const crumbs = getBreadcrumbs(location);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 bg-white/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />

      {/* Breadcrumb */}
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

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">
          测试版
        </Badge>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground">
          <Bell className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5"
          onClick={() => setLocation("/admin")}
        >
          <Shield className="size-3.5" />
          <span className="text-xs">管理</span>
        </Button>
      </div>
    </header>
  );
}
