/**
 * ProductionPlans — 我的方案列表
 * 设计风格：清新简洁，卡片网格展示方案
 * 功能：查看、管理、对比已保存的生产方案
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  MoreHorizontal,
  Star,
  Copy,
  Trash2,
  Clock,
  TrendingUp,
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Plan {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  status: "draft" | "optimized" | "submitted";
  profit: number;
  periods: number;
  starred: boolean;
}

const mockPlans: Plan[] = [
  {
    id: "1",
    name: "第3期最优排产方案",
    description: "基于利润最大化目标的全期排产优化",
    updatedAt: "2 小时前",
    status: "optimized",
    profit: 285000,
    periods: 8,
    starred: true,
  },
  {
    id: "2",
    name: "保守策略 - 低风险方案",
    description: "降低加班比例，控制库存成本",
    updatedAt: "1 天前",
    status: "draft",
    profit: 210000,
    periods: 8,
    starred: false,
  },
  {
    id: "3",
    name: "激进扩产方案",
    description: "最大化产能利用，高加班策略",
    updatedAt: "3 天前",
    status: "submitted",
    profit: 320000,
    periods: 8,
    starred: false,
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "草稿", className: "text-gray-600 border-gray-200 bg-gray-50" },
  optimized: { label: "已优化", className: "text-emerald-600 border-emerald-200 bg-emerald-50" },
  submitted: { label: "已提交", className: "text-blue-600 border-blue-200 bg-blue-50" },
};

export function ProductionPlans() {
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input placeholder="搜索方案..." className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowUpDown className="size-3.5" />
            排序
          </Button>
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="size-3.5" />
            新建方案
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockPlans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}

        {/* New Plan Card */}
        <Card className="border-dashed border-gray-200 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Plus className="size-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">创建新方案</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const sc = statusConfig[plan.status];

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-sm flex items-center gap-2">
              {plan.starred && <Star className="size-3.5 text-amber-400 fill-amber-400" />}
              {plan.name}
            </CardTitle>
            <p className="text-xs text-gray-400 line-clamp-1">{plan.description}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Star className="size-4" />
                收藏
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="size-4" />
                复制
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <Trash2 className="size-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={sc.className}>
            {sc.label}
          </Badge>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="size-3" />
            {plan.updatedAt}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{plan.periods} 期</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <TrendingUp className="size-3.5" />
            {plan.profit.toLocaleString()} 元
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
