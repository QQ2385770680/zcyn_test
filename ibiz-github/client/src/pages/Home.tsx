/**
 * Home — 用户仪表盘首页
 * 设计风格：延续清新明亮风格，Hero 区域居中展示
 * 移除动态参数统计卡片，用装饰性视觉元素替代
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Factory,
  Settings2,
  ShoppingCart,
  ArrowRight,
  FileText,
  Zap,
  TrendingUp,
  Target,
  Lightbulb,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-6 space-y-8">
      {/* Hero Section — 居中布局，无统计卡片 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 border border-emerald-100/50 p-10">
        {/* Decorative bubbles */}
        <div className="bubble w-40 h-40 bg-emerald-200 top-[-30px] right-[8%]" />
        <div className="bubble w-28 h-28 bg-amber-200 bottom-[-15px] right-[25%]" />
        <div className="bubble w-20 h-20 bg-pink-200 top-[15%] right-[3%]" />
        <div className="bubble w-16 h-16 bg-blue-200 bottom-[15%] left-[55%]" />
        <div className="bubble w-12 h-12 bg-emerald-300 top-[60%] right-[45%]" />

        <div className="relative z-10 max-w-2xl space-y-5">
          <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
            无双 · iBizSim 企业竞争模拟
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            智能决策系统
            <span className="text-emerald-600 ml-2 text-lg font-normal align-middle">「测试版」</span>
          </h1>
          <p className="text-gray-500 text-sm sm:text-base leading-relaxed">
            覆盖生产决策的智能参数模拟与最优方案求解，支持多班次产能分析、约束验证与一键优化，助力参赛团队快速制定最优决策。
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setLocation("/production/simulator")}
            >
              <Zap className="size-4" />
              开始模拟
            </Button>
            <Button
              variant="outline"
              className="border-gray-200"
              onClick={() => setLocation("/config")}
            >
              <Settings2 className="size-4" />
              配置参数
            </Button>
          </div>
        </div>
      </div>

      {/* Feature Highlights — 替代统计卡片，展示核心能力 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FeatureHighlight
          icon={<TrendingUp className="size-5" />}
          title="智能排产"
          description="基于约束条件自动求解最优产量分配，支持 8 期多班次联动计算"
          color="emerald"
        />
        <FeatureHighlight
          icon={<Target className="size-5" />}
          title="方案对比"
          description="创建多套决策方案，通过模拟验证快速找到最优策略组合"
          color="blue"
        />
        <FeatureHighlight
          icon={<Lightbulb className="size-5" />}
          title="实时验证"
          description="排产参数即时校验，人力与机器约束一目了然，避免无效决策"
          color="amber"
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">快速入口</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            icon={<Factory className="size-5" />}
            title="生产模拟"
            description="调整参数和各期班次排产，实时验证约束条件"
            color="emerald"
            onClick={() => setLocation("/production/simulator")}
          />
          <QuickAction
            icon={<FileText className="size-5" />}
            title="方案设计"
            description="创建和编辑生产决策方案，配置计算规则"
            color="blue"
            onClick={() => setLocation("/production/designer")}
          />
          <QuickAction
            icon={<Settings2 className="size-5" />}
            title="全局配置"
            description="设置产品规格参数，影响所有排产计算"
            color="amber"
            onClick={() => setLocation("/config")}
          />
          <QuickAction
            icon={<ShoppingCart className="size-5" />}
            title="方案市场"
            description="浏览和购买其他用户分享的优质决策方案"
            color="pink"
            onClick={() => setLocation("/marketplace")}
          />
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">最近活动</h2>
        <Card className="border-dashed border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="size-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mb-1">暂无最近活动</p>
            <p className="text-xs text-gray-400">开始使用生产模拟后，您的操作记录将显示在这里</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** 核心能力高亮卡片 */
function FeatureHighlight({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const styles: Record<string, { bg: string; iconBg: string; border: string }> = {
    emerald: { bg: "bg-emerald-50/60", iconBg: "bg-emerald-100 text-emerald-600", border: "border-emerald-100/60" },
    blue: { bg: "bg-blue-50/60", iconBg: "bg-blue-100 text-blue-600", border: "border-blue-100/60" },
    amber: { bg: "bg-amber-50/60", iconBg: "bg-amber-100 text-amber-600", border: "border-amber-100/60" },
  };
  const s = styles[color] || styles.emerald;

  return (
    <div className={`rounded-xl ${s.bg} border ${s.border} p-5 flex gap-4 items-start`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.iconBg}`}>
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    pink: "bg-pink-50 text-pink-600 group-hover:bg-pink-100",
  };

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-gray-100"
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${colorMap[color]}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1">
            {title}
            <ArrowRight className="size-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
