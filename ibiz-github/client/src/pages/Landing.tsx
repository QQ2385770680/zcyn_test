/**
 * Landing — 网站主页
 * 设计风格：清新简洁，延续 wuushuang.com 的白色背景 + 翠绿强调色
 * 结构：导航栏 + Hero + 功能特性 + 使用流程 + CTA + 页脚
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Factory,
  Zap,
  BarChart3,
  Shield,
  ArrowRight,
  CheckCircle2,
  Users,
  Target,
  Lightbulb,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-sm">
              iB
            </div>
            <span className="font-semibold text-gray-900">无双 · iBizSim决策</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">功能特性</a>
            <a href="#workflow" className="hover:text-emerald-600 transition-colors">使用流程</a>
            <a href="#about" className="hover:text-emerald-600 transition-colors">关于</a>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600"
              onClick={() => setLocation("/login")}
            >
              登录
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setLocation("/register")}
            >
              免费注册
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28">
        {/* Decorative bubbles */}
        <div className="bubble w-64 h-64 bg-emerald-200 top-[5%] right-[5%]" />
        <div className="bubble w-48 h-48 bg-amber-200 bottom-[10%] left-[8%]" />
        <div className="bubble w-36 h-36 bg-pink-200 top-[40%] right-[25%]" />
        <div className="bubble w-24 h-24 bg-blue-200 bottom-[30%] left-[35%]" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <Badge className="bg-emerald-100 text-emerald-700 border-0 py-1.5 px-4 text-sm mb-6">
            iBizSim 企业竞争模拟大赛辅助工具
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6 max-w-3xl mx-auto">
            让每一次决策
            <br />
            <span className="text-emerald-600">都有数据支撑</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            覆盖生产决策的智能参数模拟与最优方案求解，支持多班次产能分析、约束验证与一键优化，助力参赛团队快速制定最优决策。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 h-12 text-base"
              onClick={() => setLocation("/register")}
            >
              <Zap className="size-5" />
              免费开始使用
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2 px-8 h-12 text-base border-gray-200"
              onClick={() => setLocation("/login")}
            >
              已有账号，登录
              <ArrowRight className="size-4" />
            </Button>
          </div>


        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50/80">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="bg-emerald-100 text-emerald-700 border-0 mb-4">核心功能</Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">为竞赛团队量身打造</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              从参数配置到方案优化，一站式解决 iBizSim 竞赛中的生产决策难题
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Factory className="size-6" />}
              color="emerald"
              title="生产模拟"
              description="调整排产参数，模拟各期产能分配，实时验证工人、机器、加班等约束条件，直观展示利用率和成本。"
            />
            <FeatureCard
              icon={<Target className="size-6" />}
              color="blue"
              title="方案设计"
              description="配置优化目标（利润最大化/成本最小化），设置约束条件，一键求解最优排产方案。"
            />
            <FeatureCard
              icon={<BarChart3 className="size-6" />}
              color="amber"
              title="数据可视化"
              description="产能、利润、成本趋势图表一目了然，帮助团队快速理解决策影响和优化方向。"
            />
            <FeatureCard
              icon={<Lightbulb className="size-6" />}
              color="purple"
              title="智能建议"
              description="基于约束分析自动识别瓶颈，提供针对性的优化建议，降低决策门槛。"
            />
            <FeatureCard
              icon={<Users className="size-6" />}
              color="pink"
              title="方案市场"
              description="浏览和获取其他用户分享的优质决策方案，学习不同策略思路，快速提升竞赛水平。"
            />
            <FeatureCard
              icon={<Shield className="size-6" />}
              color="gray"
              title="安全可靠"
              description="方案数据安全存储，支持导入导出，团队协作无忧。管理员后台全面掌控系统状态。"
            />
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <Badge className="bg-blue-100 text-blue-700 border-0 mb-4">使用流程</Badge>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">三步完成最优决策</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              简单直观的操作流程，让团队快速上手
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              step="01"
              title="配置参数"
              description="设置产品规格参数，影响所有排产计算。"
            />
            <StepCard
              step="02"
              title="模拟排产"
              description="在生产模拟中调整各期各产品的班次排产，实时查看约束验证和利用率。"
            />
            <StepCard
              step="03"
              title="优化决策"
              description="使用方案设计一键求解最优方案，对比不同策略，选择最佳决策。"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="bubble w-48 h-48 bg-emerald-200 top-[10%] left-[5%]" />
        <div className="bubble w-36 h-36 bg-amber-200 bottom-[10%] right-[10%]" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            准备好提升竞赛成绩了吗？
          </h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            免费注册即可使用全部基础功能，无需门槛，立即开始。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 h-12"
              onClick={() => setLocation("/register")}
            >
              免费注册
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="border-t border-gray-100 py-12 bg-gray-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white font-bold text-sm">
                iB
              </div>
              <div>
                <span className="font-semibold text-gray-900">无双 · iBizSim决策</span>
                <span className="text-gray-400 text-sm ml-2">智能决策系统</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <button
                className="hover:text-emerald-600 transition-colors"
                onClick={() => setLocation("/admin/login")}
              >
                管理员入口
              </button>
              <span className="text-gray-300">|</span>
              <span>无双工作室 © 2026</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  color,
  title,
  description,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    pink: "bg-pink-50 text-pink-600",
    gray: "bg-gray-100 text-gray-600",
  };

  return (
    <Card className="border-gray-100 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="p-6 space-y-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
        <span className="text-2xl font-bold text-emerald-600">{step}</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}
