/**
 * Home — 用户仪表盘首页
 * 设计风格：延续 wuushuang.com 的清新明亮风格
 * 注意：nest 模式下 setLocation 使用相对路径
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Factory,
  Settings2,
  Database,
  ShoppingCart,
  ArrowRight,
  BarChart3,
  Users,
  FileText,
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="p-6 space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-amber-50 border border-emerald-100/50 p-8">
        {/* Decorative bubbles */}
        <div className="bubble w-32 h-32 bg-emerald-200 top-[-20px] right-[10%]" />
        <div className="bubble w-24 h-24 bg-amber-200 bottom-[-10px] right-[30%]" />
        <div className="bubble w-20 h-20 bg-pink-200 top-[20%] right-[5%]" />
        <div className="bubble w-16 h-16 bg-blue-200 bottom-[10%] left-[60%]" />

        <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start">
          {/* Left: Title */}
          <div className="flex-1 space-y-4">
            <Badge className="bg-emerald-100 text-emerald-700 border-0 hover:bg-emerald-100">
              iBizSim 企业竞争模拟
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900">
              智能决策辅助系统
              <span className="text-emerald-600 ml-2 text-lg font-normal">「测试版」</span>
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
              覆盖生产决策的智能参数模拟与最优方案求解，支持多班次产能分析、约束验证与一键优化，助力参赛团队快速制定最优决策。
            </p>
            <div className="flex gap-3 pt-2">
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

          {/* Right: Stats Cards */}
          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[280px]">
            <StatCard icon={<BarChart3 className="size-5 text-emerald-500" />} value="8期" label="模拟期数" />
            <StatCard icon={<Factory className="size-5 text-blue-500" />} value="4种" label="产品线" />
            <StatCard icon={<Settings2 className="size-5 text-amber-500" />} value="157台" label="初始机器" />
            <StatCard icon={<Users className="size-5 text-pink-500" />} value="113人" label="初始工人" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">快速入口</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            icon={<Factory className="size-5" />}
            title="生产模拟器"
            description="调整参数和各期班次排产，实时验证约束条件"
            color="emerald"
            onClick={() => setLocation("/production/simulator")}
          />
          <QuickAction
            icon={<FileText className="size-5" />}
            title="方案设计器"
            description="创建和编辑生产决策方案，配置计算规则"
            color="blue"
            onClick={() => setLocation("/production/designer")}
          />
          <QuickAction
            icon={<Database className="size-5" />}
            title="初始数据"
            description="设置企业初始状态参数和竞争环境数据"
            color="amber"
            onClick={() => setLocation("/initial-data")}
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
            <p className="text-xs text-gray-400">开始使用模拟器后，您的操作记录将显示在这里</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-1">
      <div className="mb-1">{icon}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
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
