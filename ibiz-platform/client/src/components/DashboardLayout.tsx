/**
 * DashboardLayout — 仪表盘主布局
 * 使用 SidebarProvider 包裹侧边栏和主内容区
 */
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto bg-gray-50/50">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
