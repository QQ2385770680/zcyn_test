/**
 * DecisionDomainLayout — 决策域通用布局
 * 四个标签页：全局总览、生产模拟、方案设计、我的方案
 * 设计风格：方案B — 胶囊按钮组 + 图标
 * 选中项为翠绿色填充胶囊（白色文字+图标），未选中项为透明底+灰色文字
 */
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import React, { useTransition } from "react";
import { LayoutDashboard, Factory, Target, FolderOpen } from "lucide-react";

interface DecisionDomainLayoutProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  basePath: string;
  overviewContent: React.ReactNode;
  simulatorContent: React.ReactNode;
  designerContent: React.ReactNode;
  plansContent: React.ReactNode;
  accentColor?: string;
}

const tabItems = [
  { value: "overview", label: "全局总览", icon: LayoutDashboard },
  { value: "simulator", label: "生产模拟", icon: Factory },
  { value: "designer", label: "方案设计", icon: Target },
  { value: "plans", label: "我的方案", icon: FolderOpen },
] as const;

export function DecisionDomainLayout({
  title,
  description,
  icon,
  basePath,
  overviewContent,
  simulatorContent,
  designerContent,
  plansContent,
}: DecisionDomainLayoutProps) {
  const [location, setLocation] = useLocation();

  const getActiveTab = () => {
    if (location.endsWith("/overview")) return "overview";
    if (location.endsWith("/designer")) return "designer";
    if (location.endsWith("/plans")) return "plans";
    if (location.endsWith("/simulator")) return "simulator";
    // 默认显示全局总览
    return "overview";
  };

  const activeTab = getActiveTab();
  const [isPending, startTransition] = useTransition();

  const handleTabChange = (value: string) => {
    startTransition(() => {
      setLocation(`${basePath}/${value}`);
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          {icon}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {/* Pill Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center gap-1.5 rounded-xl border border-gray-200/80 bg-gray-50/60 p-1.5 w-fit">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={`
                  relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
                  transition-all duration-200 ease-out
                  ${isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/80"
                  }
                `}
              >
                <Icon className={`size-4 ${isActive ? "text-white" : "text-gray-400"} transition-colors duration-200`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className={`mt-4 transition-opacity duration-150 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
          <TabsContent value="overview" className="mt-0">
            {overviewContent}
          </TabsContent>
          <TabsContent value="simulator" className="mt-0">
            {simulatorContent}
          </TabsContent>
          <TabsContent value="designer" className="mt-0">
            {designerContent}
          </TabsContent>
          <TabsContent value="plans" className="mt-0">
            {plansContent}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
