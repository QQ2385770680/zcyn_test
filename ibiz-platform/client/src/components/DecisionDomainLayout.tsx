/**
 * DecisionDomainLayout — 决策域通用布局
 * 每个决策域包含三个标签页：模拟器、方案设计器、我的方案
 * 注意：nest 模式下 useLocation 返回相对路径
 */
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import React from "react";

interface DecisionDomainLayoutProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  basePath: string;
  simulatorContent: React.ReactNode;
  designerContent: React.ReactNode;
  plansContent: React.ReactNode;
  accentColor?: string;
}

export function DecisionDomainLayout({
  title,
  description,
  icon,
  basePath,
  simulatorContent,
  designerContent,
  plansContent,
}: DecisionDomainLayoutProps) {
  const [location, setLocation] = useLocation();

  // Determine active tab from URL
  const getActiveTab = () => {
    if (location.endsWith("/designer")) return "designer";
    if (location.endsWith("/plans")) return "plans";
    return "simulator";
  };

  const handleTabChange = (value: string) => {
    if (value === "simulator") setLocation(`${basePath}/simulator`);
    else setLocation(`${basePath}/${value}`);
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

      {/* Tabs */}
      <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
        <TabsList className="bg-gray-100/80">
          <TabsTrigger value="simulator" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            模拟器
          </TabsTrigger>
          <TabsTrigger value="designer" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            方案设计器
          </TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            我的方案
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simulator" className="mt-4">
          {simulatorContent}
        </TabsContent>
        <TabsContent value="designer" className="mt-4">
          {designerContent}
        </TabsContent>
        <TabsContent value="plans" className="mt-4">
          {plansContent}
        </TabsContent>
      </Tabs>
    </div>
  );
}
