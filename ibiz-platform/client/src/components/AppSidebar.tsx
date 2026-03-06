/**
 * AppSidebar — iBizSim 用户侧边栏导航
 * 设计风格：清新简洁，白色背景，翠绿强调色
 * 注意：在 nest 模式下，useLocation 返回相对路径（不含 /dashboard 前缀）
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Settings2,
  Factory,
  ShoppingCart,
  ChevronDown,
  Zap,
  Crown,
  LogOut,
} from "lucide-react";
import { useLocation } from "wouter";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import React from "react";

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  // nest 模式下 location 是相对路径，如 "/" "/config" "/production/simulator"
  const isProductionActive = location.startsWith("/production");
  const [productionOpen, setProductionOpen] = React.useState(isProductionActive);

  const handleLogout = () => {
    logout();
    // 需要跳出 nest 范围，使用 window.location
    window.location.href = "/";
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      {/* Header: Brand */}
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
            <span className="text-xs text-muted-foreground">智能决策辅助系统</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* 系统配置 */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            系统配置
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/config"}
                  tooltip="全局配置"
                  onClick={() => setLocation("/config")}
                >
                  <Settings2 className="size-4" />
                  <span>全局配置</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 决策域 — 仅生产决策 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            决策域
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible open={productionOpen} onOpenChange={setProductionOpen}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      isActive={isProductionActive}
                      tooltip="生产决策"
                      onClick={() => {
                        // 侧边栏缩进时点击直接跳转到生产模拟页
                        const sidebar = document.querySelector('[data-state]');
                        const isCollapsed = sidebar?.getAttribute('data-state') === 'collapsed';
                        if (isCollapsed) {
                          setLocation("/production/simulator");
                        }
                      }}
                    >
                      <Factory className="size-4" />
                      <span>生产决策</span>
                      <ChevronDown
                        className={`ml-auto size-3.5 transition-transform duration-200 ${productionOpen ? "rotate-180" : ""}`}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={location === "/production/simulator"}
                          onClick={() => setLocation("/production/simulator")}
                        >
                          <span>生产模拟</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={location === "/production/designer"}
                          onClick={() => setLocation("/production/designer")}
                        >
                          <span>方案设计</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          isActive={location === "/production/plans"}
                          onClick={() => setLocation("/production/plans")}
                        >
                          <span>我的方案</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* 方案市场 */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            市场
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === "/marketplace"}
                  tooltip="方案市场"
                  onClick={() => setLocation("/marketplace")}
                >
                  <ShoppingCart className="size-4" />
                  <span>方案市场</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">
                    热门
                  </Badge>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      {/* Footer: User info + Logout */}
      <SidebarFooter className="px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="bg-gradient-to-r from-amber-50 to-emerald-50 hover:from-amber-100 hover:to-emerald-100 border border-amber-200/50 group-data-[collapsible=icon]:p-2"
              tooltip="升级 Pro"
            >
              <Crown className="size-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">升级 Pro</span>
              <Zap className="ml-auto size-3.5 text-amber-500" />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="用户">
              <Avatar className="size-5">
                <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                  {user?.name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{user?.name || "用户"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="退出登录"
              onClick={handleLogout}
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
