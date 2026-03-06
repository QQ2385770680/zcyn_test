/**
 * ProductionPlans — 我的方案列表
 *
 * 功能：
 * - 查看已保存的方案列表（卡片网格）
 * - 创建新方案（弹窗输入名称和描述）
 * - 收藏/取消收藏方案
 * - 复制方案
 * - 删除方案
 * - 搜索方案
 *
 * 数据来源：localStorage（通过 planStorage 服务）
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FileText,
  X,
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
  createPlan,
  deletePlan,
  duplicatePlan,
  toggleStarPlan,
  formatRelativeTime,
} from "@/lib/planStorage";

const statusConfig: Record<PlanStatus, { label: string; className: string }> = {
  draft: { label: "草稿", className: "text-gray-600 border-gray-200 bg-gray-50" },
  optimized: { label: "已优化", className: "text-emerald-600 border-emerald-200 bg-emerald-50" },
  submitted: { label: "已提交", className: "text-blue-600 border-blue-200 bg-blue-50" },
};

export function ProductionPlans() {
  const { config } = useConfig();
  const [plans, setPlans] = React.useState<ProductionPlan[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [newPlanName, setNewPlanName] = React.useState("");
  const [newPlanDesc, setNewPlanDesc] = React.useState("");

  // 加载方案列表
  const refreshPlans = React.useCallback(() => {
    setPlans(loadPlans());
  }, []);

  React.useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  // 创建方案
  const handleCreate = () => {
    if (!newPlanName.trim()) return;
    createPlan(newPlanName.trim(), newPlanDesc.trim(), config);
    setNewPlanName("");
    setNewPlanDesc("");
    setShowCreateDialog(false);
    refreshPlans();
  };

  // 删除方案
  const handleDelete = (id: string) => {
    deletePlan(id);
    refreshPlans();
  };

  // 复制方案
  const handleDuplicate = (id: string) => {
    duplicatePlan(id);
    refreshPlans();
  };

  // 收藏方案
  const handleToggleStar = (id: string) => {
    toggleStarPlan(id);
    refreshPlans();
  };

  // 搜索过滤
  const filteredPlans = plans.filter(
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
        <div className="flex gap-2">
          <Badge variant="outline" className="text-gray-500">
            {plans.length} 个方案
          </Badge>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="size-3.5" />
            新建方案
          </Button>
        </div>
      </div>

      {/* 创建方案弹窗（简易内联版） */}
      {showCreateDialog && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">创建新方案</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowCreateDialog(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">方案名称</Label>
                <Input
                  placeholder="例如：第3期最优排产方案"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">方案描述（可选）</Label>
                <Input
                  placeholder="简要描述方案策略..."
                  value={newPlanDesc}
                  onChange={(e) => setNewPlanDesc(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateDialog(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleCreate}
                disabled={!newPlanName.trim()}
              >
                创建
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 方案列表 */}
      {sortedPlans.length === 0 && !showCreateDialog ? (
        <Card className="border-dashed border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <FileText className="size-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">暂无方案</h3>
            <p className="text-xs text-gray-400 mb-4">
              {searchQuery
                ? "没有找到匹配的方案，请尝试其他关键词"
                : "点击「新建方案」开始创建您的第一个生产决策方案"}
            </p>
            {!searchQuery && (
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="size-3.5" />
                新建方案
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onToggleStar={handleToggleStar}
            />
          ))}

          {/* 快速新建卡片 */}
          <Card
            className="border-dashed border-gray-200 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
            onClick={() => setShowCreateDialog(true)}
          >
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Plus className="size-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">创建新方案</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onDelete,
  onDuplicate,
  onToggleStar,
}: {
  plan: ProductionPlan;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleStar: (id: string) => void;
}) {
  const sc = statusConfig[plan.status];
  const totalProduction = plan.periodProductions.reduce((sum, pp) => {
    return (
      sum +
      pp.shift1.A + pp.shift1.B + pp.shift1.C + pp.shift1.D +
      pp.ot1.A + pp.ot1.B + pp.ot1.C + pp.ot1.D +
      pp.shift2.A + pp.shift2.B + pp.shift2.C + pp.shift2.D +
      pp.ot2.A + pp.ot2.B + pp.ot2.C + pp.ot2.D
    );
  }, 0);

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
              <DropdownMenuItem onClick={() => onToggleStar(plan.id)}>
                <Star className="size-4" />
                {plan.starred ? "取消收藏" : "收藏"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(plan.id)}>
                <Copy className="size-4" />
                复制
              </DropdownMenuItem>
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={sc.className}>
            {sc.label}
          </Badge>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="size-3" />
            {formatRelativeTime(plan.updatedAt)}
          </span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{plan.config.periods} 期</span>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <TrendingUp className="size-3.5" />
            {totalProduction.toLocaleString()} 单位
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
