/**
 * AppHeader — 用户面板顶部状态栏
 * 注意：nest 模式下 useLocation 返回相对路径（不含 /dashboard 前缀）
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
import { Bell } from "lucide-react";
import { useLocation } from "wouter";

// nest 模式下路径是相对的
const routeLabels: Record<string, string> = {
  "/": "首页",
  "/config": "全局配置",
  "/initial-data": "初始数据",
  "/production": "生产决策",
  "/production/simulator": "模拟器",
  "/production/designer": "方案设计器",
  "/production/plans": "我的方案",
  "/marketplace": "方案市场",
};

function getBreadcrumbs(path: string) {
  if (path === "/") return [{ label: "首页", path: "/" }];
  const crumbs: { label: string; path: string }[] = [{ label: "首页", path: "/" }];

  const segments = path.split("/").filter(Boolean);
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
      </div>
    </header>
  );
}
