/**
 * ProductionPlans — 我的方案列表
 *
 * 功能：
 * - 查看已保存的方案列表（卡片网格）
 * - 同时展示两种来源的方案：
 *   1. planStorage 中的传统方案（ProductionPlan）
 *   2. designerTypes 中的设计器方案 — 归类为"生产方案"
 * - 设计器方案支持"编辑"按钮跳转到方案设计器并加载
 * - 收藏/取消收藏方案
 * - 复制方案
 * - 删除方案
 * - 搜索方案
 * - 显示每个方案的使用次数（根据生产模拟中加载次数计算）
 *
 * 数据来源：localStorage（通过 planStorage 和 designerTypes 服务）
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  MoreHorizontal,
  Star,
  Copy,
  Trash2,
  Clock,
  TrendingUp,
  FileText,
  Pencil,
  BarChart3,
  Play,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import React from "react";
import {
  type ProductionPlan,
  type PlanStatus,
} from "@/lib/data";
import { useConfig } from "@/lib/ConfigContext";
import {
  loadPlans,
  deletePlan,
  duplicatePlan,
  toggleStarPlan,
  formatRelativeTime,
  loadUsageStats,
  type PlanUsageStats,
} from "@/lib/planStorage";
import {
  loadDesignPlans,
  deleteDesignPlan,
  type DesignPlanConfig,
} from "@/lib/designerTypes";
import { useLocation } from "wouter";

const statusConfig: Record<PlanStatus, { label: string; className: string }> = {
  draft: { label: "草稿", className: "text-gray-600 border-gray-200 bg-gray-50" },
  optimized: { label: "已优化", className: "text-emerald-600 border-emerald-200 bg-emerald-50" },
  submitted: { label: "已提交", className: "text-blue-600 border-blue-200 bg-blue-50" },
};

/** 统一方案类型，用于列表展示 */
interface UnifiedPlan {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  starred: boolean;
  source: "legacy" | "designer";
  /** 传统方案数据 */
  legacyPlan?: ProductionPlan;
  /** 设计器方案数据 */
  designPlan?: DesignPlanConfig & { id: string; createdAt: string; updatedAt: string };
}

export function ProductionPlans() {
  const { config } = useConfig();
  const [, setLocation] = useLocation();
  const [plans, setPlans] = React.useState<ProductionPlan[]>([]);
  const [designPlans, setDesignPlans] = React.useState<(DesignPlanConfig & { id: string; createdAt: string; updatedAt: string })[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [usageStats, setUsageStats] = React.useState<PlanUsageStats>({});

  // 加载方案列表和使用次数
  const refreshPlans = React.useCallback(() => {
    setPlans(loadPlans());
    setDesignPlans(loadDesignPlans());
    setUsageStats(loadUsageStats());
  }, []);

  React.useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  // 删除方案
  const handleDelete = (id: string, source: "legacy" | "designer") => {
    if (source === "designer") {
      deleteDesignPlan(id);
    } else {
      deletePlan(id);
    }
    refreshPlans();
  };

  // 复制方案（仅传统方案支持）
  const handleDuplicate = (id: string) => {
    duplicatePlan(id);
    refreshPlans();
  };

  // 收藏方案（仅传统方案支持）
  const handleToggleStar = (id: string) => {
    toggleStarPlan(id);
    refreshPlans();
  };

  // 编辑设计器方案：将方案数据写入缓存并跳转到设计器
  const handleEditDesignPlan = (dp: DesignPlanConfig & { id: string; createdAt: string; updatedAt: string }) => {
    try {
      const planConfig: DesignPlanConfig = {
        name: dp.name,
        description: dp.description,
        periodProductions: dp.periodProductions,
        periodHiring: dp.periodHiring,
        periodMachines: dp.periodMachines,
      };
      localStorage.setItem("ibiz-designer-draft", JSON.stringify(planConfig));
      localStorage.setItem("ibiz-designer-current-plan-id", dp.id);
      localStorage.setItem("ibiz-designer-current-period", "1");
      localStorage.setItem("ibiz-designer-active-section", "production");
    } catch {
      // 写入失败
    }
    setLocation("/production/designer");
  };

  // 合并两种来源的方案为统一列表
  const unifiedPlans: UnifiedPlan[] = React.useMemo(() => {
    const result: UnifiedPlan[] = [];

    // 传统方案
    for (const p of plans) {
      result.push({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        starred: p.starred,
        source: "legacy",
        legacyPlan: p,
      });
    }

    // 设计器方案（归类为生产方案）
    for (const dp of designPlans) {
      result.push({
        id: dp.id,
        name: dp.name,
        description: dp.description,
        createdAt: dp.createdAt,
        updatedAt: dp.updatedAt,
        starred: false,
        source: "designer",
        designPlan: dp,
      });
    }

    return result;
  }, [plans, designPlans]);

  // 搜索过滤
  const filteredPlans = unifiedPlans.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 排序：收藏优先，然后按更新时间倒序
  const sortedPlans = [...filteredPlans].sort((a, b) => {
    if (a.starred !== b.starred) return a.starred ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* 控制栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="搜索方案..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Badge variant="outline" className="text-gray-500">
          {unifiedPlans.length} 个方案
        </Badge>
      </div>

      {/* 方案列表 */}
      {sortedPlans.length === 0 ? (
        <Card className="border-dashed border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="size-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">暂无方案</h3>
            <p className="text-xs text-gray-400 mb-4">
              {searchQuery
                ? "没有找到匹配的方案，请尝试其他关键词"
                : "请在「方案设计」中创建并保存方案"}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setLocation("/production/designer")}
              >
                <Pencil className="size-3.5" />
                前往方案设计
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPlans.map((up) => (
            <UnifiedPlanCard
              key={`${up.source}-${up.id}`}
              plan={up}
              usageStats={usageStats}
              onDelete={(id) => handleDelete(id, up.source)}
              onDuplicate={up.source === "legacy" ? handleDuplicate : undefined}
              onToggleStar={up.source === "legacy" ? handleToggleStar : undefined}
              onEdit={up.source === "designer" && up.designPlan ? () => handleEditDesignPlan(up.designPlan!) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UnifiedPlanCard({
  plan,
  usageStats,
  onDelete,
  onDuplicate,
  onToggleStar,
  onEdit,
}: {
  plan: UnifiedPlan;
  usageStats: PlanUsageStats;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleStar?: (id: string) => void;
  onEdit?: () => void;
}) {
  const isDesigner = plan.source === "designer";
  const usage = usageStats[plan.id];
  const loadCount = usage?.loadCount || 0;
  const lastUsedAt = usage?.lastUsedAt;

  // 计算总产量（传统方案）
  let totalProduction = 0;
  if (plan.legacyPlan) {
    totalProduction = plan.legacyPlan.periodProductions.reduce((sum, pp) => {
      return (
        sum +
        pp.shift1.A + pp.shift1.B + pp.shift1.C + pp.shift1.D +
        pp.ot1.A + pp.ot1.B + pp.ot1.C + pp.ot1.D +
        pp.shift2.A + pp.shift2.B + pp.shift2.C + pp.shift2.D +
        pp.ot2.A + pp.ot2.B + pp.ot2.C + pp.ot2.D
      );
    }, 0);
  }

  // 计算设计器方案的配置统计
  let designStats = { required: 0, optional: 0, blank: 0, fixed: 0 };
  if (plan.designPlan) {
    for (const period of plan.designPlan.periodProductions) {
      for (const shiftKey of ["shift1", "ot1", "shift2", "ot2"] as const) {
        for (const product of ["A", "B", "C", "D"] as const) {
          designStats[period[shiftKey][product].mode]++;
        }
      }
    }
  }

  // 使用频率标签
  const usageLabel = loadCount === 0
    ? "未使用"
    : loadCount <= 3
    ? "低频"
    : loadCount <= 10
    ? "中频"
    : "高频";

  const usageColor = loadCount === 0
    ? "text-gray-400 border-gray-200 bg-gray-50"
    : loadCount <= 3
    ? "text-blue-500 border-blue-200 bg-blue-50"
    : loadCount <= 10
    ? "text-amber-600 border-amber-200 bg-amber-50"
    : "text-emerald-600 border-emerald-200 bg-emerald-50";

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-gray-100">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-sm flex items-center gap-2">
              {plan.starred && <Star className="size-3.5 text-amber-400 fill-amber-400" />}
              {plan.name}
            </CardTitle>
            <p className="text-xs text-gray-400 line-clamp-1">
              {plan.description || "暂无描述"}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="size-4" />
                  编辑方案
                </DropdownMenuItem>
              )}
              {onToggleStar && (
                <DropdownMenuItem onClick={() => onToggleStar(plan.id)}>
                  <Star className="size-4" />
                  {plan.starred ? "取消收藏" : "收藏"}
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(plan.id)}>
                  <Copy className="size-4" />
                  复制
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(plan.id)}
              >
                <Trash2 className="size-4" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 标签行：方案类型 + 使用频率 + 时间 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 gap-1">
            <Play className="size-3" />
            生产方案
          </Badge>
          <Badge variant="outline" className={`gap-1 ${usageColor}`}>
            <BarChart3 className="size-3" />
            {usageLabel}{loadCount > 0 && ` (${loadCount}次)`}
          </Badge>
          <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
            <Clock className="size-3" />
            {formatRelativeTime(plan.updatedAt)}
          </span>
        </div>

        {/* 使用详情 */}
        {loadCount > 0 && lastUsedAt && (
          <div className="text-xs text-gray-400">
            最近使用：{formatRelativeTime(lastUsedAt)}
          </div>
        )}

        {/* 数据统计 */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {isDesigner ? (
            <>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{plan.designPlan?.periodProductions.length || 8} 期</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-600">必{designStats.required}</span>
                <span className="text-sky-600">选{designStats.optional}</span>
                <span className="text-emerald-600">固{designStats.fixed}</span>
                <span className="text-gray-400">空{designStats.blank}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>{plan.legacyPlan?.config.periods || 8} 期</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                <TrendingUp className="size-3.5" />
                {totalProduction.toLocaleString()} 单位
              </div>
            </>
          )}
        </div>

        {/* 设计器方案显示编辑按钮 */}
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            onClick={onEdit}
          >
            <Pencil className="size-3" />
            编辑方案
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
