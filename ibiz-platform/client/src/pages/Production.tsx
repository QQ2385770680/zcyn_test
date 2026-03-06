/**
 * Production — 生产决策域
 * 设计风格：清新简洁，延续 wuushuang.com
 * 包含三个标签页：生产模拟、方案设计、我的方案
 */
import { DecisionDomainLayout } from "@/components/DecisionDomainLayout";
import { Factory } from "lucide-react";
import { ProductionSimulator } from "@/components/production/Simulator";
import { ProductionDesigner } from "@/components/production/Designer";
import { ProductionPlans } from "@/components/production/Plans";

export default function Production() {
  return (
    <DecisionDomainLayout
      title="生产决策"
      description="调整排产参数，模拟各期产能分配，求解最优生产方案"
      icon={<Factory className="size-5" />}
      basePath="/production"
      simulatorContent={<ProductionSimulator />}
      designerContent={<ProductionDesigner />}
      plansContent={<ProductionPlans />}
    />
  );
}
