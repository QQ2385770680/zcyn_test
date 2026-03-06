/**
 * ProductionSimulator — 生产模拟（增强版）
 *
 * 功能：
 * - 各期四班次（一班/一加/二班/二加）× 四产品（A/B/C/D）排产输入
 * - 资源参数面板（机器数、工人数、雇佣/解雇决策）
 * - 实时约束验证（6个约束检查点）+ 约束进度条
 * - 利用率概览卡片
 * - 颜色映射标识（必填/选填/自由）
 * - 财务汇总面板（收入/成本/利润）
 * - 多期总览面板
 * - 保存为方案 / 加载方案
 * - 期数快捷键（← →）
 * - Toast 提示
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Factory,
  Users,
  Package,
  Settings2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BarChart3,
  Download,
  Upload,
  Save,
  FolderOpen,
  Info,
} from "lucide-react";
import React from "react";

import {
  type PeriodProduction,
  type PeriodDecision,
  type PeriodResult,
  type CellColor,
  type ProductionPlan,
  PERIOD_COLOR_MAPS,
  emptyPeriodProduction,
  allConstraintsSatisfied,
  generateId,
} from "@/lib/data";
import { useConfig } from "@/lib/ConfigContext";

import {
  calcAllPeriods,
  generateDefaultDecisions,
  getConstraintStatus,
  calcWorkerUtilization,
  calcMachineUtilization,
  calcTotalProduction,
} from "@/lib/engine";

import {
  createPlan,
  loadPlans,
  updatePlan,
} from "@/lib/planStorage";

// ============================================================
// 工具函数
// ============================================================

/** 格式化金额 */
function formatMoney(value: number): string {
  if (Math.abs(value) >= 1e6) {
    return (value / 1e6).toFixed(2) + "M";
  }
  if (Math.abs(value) >= 1e3) {
    return (value / 1e3).toFixed(1) + "K";
  }
  return value.toFixed(0);
}

/** 格式化金额（完整） */
function formatMoneyFull(value: number): string {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

// ============================================================
// Toast 组件
// ============================================================

function useToast() {
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = React.useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const ToastComponent = React.useMemo(() => {
    if (!toast) return null;
    const bgClass = toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-600";
    return (
      <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg text-white text-sm font-medium shadow-lg ${bgClass} animate-in slide-in-from-bottom-4 fade-in duration-300`}>
        {toast.type === "success" && <CheckCircle2 className="size-4 inline mr-2 -mt-0.5" />}
        {toast.type === "error" && <XCircle className="size-4 inline mr-2 -mt-0.5" />}
        {toast.type === "info" && <Info className="size-4 inline mr-2 -mt-0.5" />}
        {toast.message}
      </div>
    );
  }, [toast]);

  return { showToast, ToastComponent };
}

// ============================================================
// 主组件
// ============================================================

export function ProductionSimulator() {
  const { config } = useConfig();
  const [currentPeriod, setCurrentPeriod] = React.useState("1");
  const [activeTab, setActiveTab] = React.useState("current");
  const { showToast, ToastComponent } = useToast();

  // 保存方案弹窗
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [savePlanName, setSavePlanName] = React.useState("");
  const [savePlanDesc, setSavePlanDesc] = React.useState("");

  // 各期排产数据
  const [productions, setProductions] = React.useState<PeriodProduction[]>(() =>
    Array.from({ length: config.periods }, () => emptyPeriodProduction())
  );

  // 各期资源决策
  const [decisions, setDecisions] = React.useState<PeriodDecision[]>(() =>
    generateDefaultDecisions(config)
  );

  // 资源面板展开/折叠
  const [resourcesExpanded, setResourcesExpanded] = React.useState(false);

  // 计算所有期数结果
  const results = React.useMemo(
    () => calcAllPeriods(config, productions, decisions),
    [config, productions, decisions]
  );

  const periodIdx = parseInt(currentPeriod) - 1;
  const currentResult = results[periodIdx];
  const currentProduction = productions[periodIdx];
  const currentDecision = decisions[periodIdx];
  const colorMap = PERIOD_COLOR_MAPS[parseInt(currentPeriod)] || PERIOD_COLOR_MAPS[8];

  const constraintsPassed = currentResult
    ? allConstraintsSatisfied(currentResult.constraints)
    : true;

  // 约束满足数量
  const constraintValues = currentResult ? [
    currentResult.constraints.c1_workersAfterShift1,
    currentResult.constraints.c2_workersAfterOt1,
    currentResult.constraints.c4_workersAfterOt2,
    currentResult.constraints.c5_machinesAfterShift1,
    currentResult.constraints.c7_machinesAfterShift2,
    currentResult.constraints.c8_machinesAfterOt2,
  ] : [];
  const constraintPassCount = constraintValues.filter(v => v >= -0.001).length;

  // 键盘快捷键：← → 切换期数
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 如果焦点在输入框中，不响应
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") {
        setCurrentPeriod(prev => {
          const p = parseInt(prev);
          return p > 1 ? String(p - 1) : prev;
        });
      } else if (e.key === "ArrowRight") {
        setCurrentPeriod(prev => {
          const p = parseInt(prev);
          return p < config.periods ? String(p + 1) : prev;
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [config.periods]);

  // 更新排产数据
  const updateProduction = (
    shift: keyof PeriodProduction,
    product: "A" | "B" | "C" | "D",
    value: number
  ) => {
    setProductions((prev) => {
      const next = [...prev];
      next[periodIdx] = {
        ...next[periodIdx],
        [shift]: {
          ...next[periodIdx][shift],
          [product]: Math.max(0, Math.floor(value) || 0),
        },
      };
      return next;
    });
  };

  // 更新资源决策
  const updateDecision = (field: keyof PeriodDecision, value: number) => {
    setDecisions((prev) => {
      const next = [...prev];
      next[periodIdx] = {
        ...next[periodIdx],
        [field]: Math.max(0, Math.floor(value) || 0),
      };
      return next;
    });
  };

  // 重置当前期
  const handleReset = () => {
    setProductions((prev) => {
      const next = [...prev];
      next[periodIdx] = emptyPeriodProduction();
      return next;
    });
    const defaultDecs = generateDefaultDecisions(config);
    setDecisions((prev) => {
      const next = [...prev];
      next[periodIdx] = defaultDecs[periodIdx];
      return next;
    });
    showToast(`第 ${currentPeriod} 期已重置`, "info");
  };

  // 重置全部
  const handleResetAll = () => {
    setProductions(Array.from({ length: config.periods }, () => emptyPeriodProduction()));
    setDecisions(generateDefaultDecisions(config));
    showToast("所有期数已重置", "info");
  };

  // 导出方案为 JSON
  const handleExport = () => {
    const plan: ProductionPlan = {
      id: generateId(),
      name: "导出方案",
      description: "从生产模拟导出的排产方案",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "draft",
      starred: false,
      config: config,
      periodProductions: productions,
      periodDecisions: decisions,
    };
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ibiz-plan-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("方案已导出为 JSON 文件");
  };

  // 导入方案
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const plan = JSON.parse(ev.target?.result as string) as ProductionPlan;
          if (plan.periodProductions && plan.periodDecisions) {
            setProductions(plan.periodProductions);
            setDecisions(plan.periodDecisions);
            showToast(`已加载方案「${plan.name || "未命名"}」`);
          }
        } catch {
          showToast("导入失败：文件格式不正确", "error");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // 保存为方案
  const handleSavePlan = () => {
    if (!savePlanName.trim()) return;
    createPlan(savePlanName.trim(), savePlanDesc.trim(), config, [...productions], [...decisions]);
    showToast(`方案「${savePlanName.trim()}」已保存`);
    setSavePlanName("");
    setSavePlanDesc("");
    setShowSaveDialog(false);
  };

  // 加载方案到生产模拟
  const handleLoadPlan = (plan: ProductionPlan) => {
    setProductions(plan.periodProductions);
    setDecisions(plan.periodDecisions);
    showToast(`已加载方案「${plan.name}」`);
  };

  // 期数导航
  const goToPrevPeriod = () => {
    const p = parseInt(currentPeriod);
    if (p > 1) setCurrentPeriod(String(p - 1));
  };
  const goToNextPeriod = () => {
    const p = parseInt(currentPeriod);
    if (p < config.periods) setCurrentPeriod(String(p + 1));
  };

  if (!currentResult) return null;

  const workerUtil = calcWorkerUtilization(currentResult);
  const machineUtil = calcMachineUtilization(currentResult);
  const totalProd = calcTotalProduction(currentResult);
  const totalOt =
    currentResult.totalOutput.A - currentResult.production.shift1.A - currentResult.production.shift2.A +
    currentResult.totalOutput.B - currentResult.production.shift1.B - currentResult.production.shift2.B +
    currentResult.totalOutput.C - currentResult.production.shift1.C - currentResult.production.shift2.C +
    currentResult.totalOutput.D - currentResult.production.shift1.D - currentResult.production.shift2.D;

  const normalTotal =
    currentResult.production.shift1.A + currentResult.production.shift1.B +
    currentResult.production.shift1.C + currentResult.production.shift1.D +
    currentResult.production.shift2.A + currentResult.production.shift2.B +
    currentResult.production.shift2.C + currentResult.production.shift2.D;

  // 多期汇总
  const allPeriodsTotal = results.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.financials.revenue.total,
      cost: acc.cost + r.financials.totalCost,
      profit: acc.profit + r.financials.netProfit,
      production: acc.production + calcTotalProduction(r),
    }),
    { revenue: 0, cost: 0, profit: 0, production: 0 }
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-6">
        {ToastComponent}

        {/* ===== 控制栏 ===== */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {/* 期数导航 */}
            <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-100">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goToPrevPeriod}
                    disabled={parseInt(currentPeriod) <= 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>上一期 (←)</TooltipContent>
              </Tooltip>
              <Select value={currentPeriod} onValueChange={setCurrentPeriod}>
                <SelectTrigger className="w-[110px] h-8 border-0 bg-white shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: config.periods }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      第 {i + 1} 期
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={goToNextPeriod}
                    disabled={parseInt(currentPeriod) >= config.periods}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>下一期 (→)</TooltipContent>
              </Tooltip>
            </div>

            {/* 约束状态 Badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`cursor-help ${
                    constraintsPassed
                      ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                      : "text-red-600 border-red-200 bg-red-50"
                  }`}
                >
                  {constraintsPassed ? (
                    <><CheckCircle2 className="size-3 mr-1" />{constraintPassCount}/6 约束满足</>
                  ) : (
                    <><XCircle className="size-3 mr-1" />{constraintPassCount}/6 约束满足</>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>当前期 {constraintPassCount} 个约束满足，{6 - constraintPassCount} 个未满足</p>
              </TooltipContent>
            </Tooltip>

            {/* 当期利润快速显示 */}
            <Badge
              variant="outline"
              className={`hidden sm:flex ${
                currentResult.financials.netProfit >= 0
                  ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                  : "text-red-600 border-red-200 bg-red-50"
              }`}
            >
              <DollarSign className="size-3 mr-0.5" />
              {formatMoney(currentResult.financials.netProfit)}
            </Badge>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleImport}>
                  <Upload className="size-3.5" />
                  <span className="hidden sm:inline">导入</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>从 JSON 文件导入方案</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">导出</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>导出为 JSON 文件</TooltipContent>
            </Tooltip>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setShowSaveDialog(true)}
            >
              <Save className="size-3.5" />
              保存方案
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
                  <RotateCcw className="size-3.5" />
                  <span className="hidden sm:inline">重置本期</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>重置第 {currentPeriod} 期数据</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleResetAll}>
                  <RotateCcw className="size-3.5" />
                  <span className="hidden sm:inline">重置全部</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>重置所有期数数据</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ===== 保存方案弹窗 ===== */}
        {showSaveDialog && (
          <Card className="border-emerald-200 bg-emerald-50/30 animate-in slide-in-from-top-2 fade-in duration-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Save className="size-4 text-emerald-600" />
                  保存当前排产为方案
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
                  <XCircle className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">方案名称 <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="例如：第3期最优排产方案"
                    value={savePlanName}
                    onChange={(e) => setSavePlanName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSavePlan()}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">方案描述（可选）</Label>
                  <Input
                    placeholder="简要描述方案策略..."
                    value={savePlanDesc}
                    onChange={(e) => setSavePlanDesc(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSavePlan()}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  将保存全部 {config.periods} 期排产数据和资源决策
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>
                    取消
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSavePlan}
                    disabled={!savePlanName.trim()}
                  >
                    保存
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== 期数进度条 ===== */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: config.periods }, (_, i) => {
            const r = results[i];
            const passed = r ? allConstraintsSatisfied(r.constraints) : true;
            const hasData = r ? calcTotalProduction(r) > 0 : false;
            const isCurrent = i + 1 === parseInt(currentPeriod);
            return (
              <Tooltip key={i}>
                <TooltipTrigger asChild>
                  <button
                    className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
                      isCurrent
                        ? "ring-2 ring-emerald-400 ring-offset-1"
                        : ""
                    } ${
                      !hasData
                        ? "bg-gray-200"
                        : passed
                          ? "bg-emerald-400"
                          : "bg-red-400"
                    }`}
                    onClick={() => setCurrentPeriod(String(i + 1))}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>第 {i + 1} 期 {!hasData ? "（未填写）" : passed ? "（约束满足）" : "（约束超限）"}</p>
                  {hasData && r && <p className="text-xs text-gray-400">产量: {calcTotalProduction(r)} · 利润: {formatMoney(r.financials.netProfit)}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* ===== 视图切换 ===== */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current" className="gap-1.5">
              <Package className="size-3.5" />
              当前期排产
            </TabsTrigger>
            <TabsTrigger value="financials" className="gap-1.5">
              <DollarSign className="size-3.5" />
              财务分析
            </TabsTrigger>
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="size-3.5" />
              多期总览
            </TabsTrigger>
          </TabsList>

          {/* ===== 当前期排产 Tab ===== */}
          <TabsContent value="current" className="space-y-6 mt-6">
            {/* 利用率概览 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <UtilizationCard
                icon={<Users className="size-4 text-blue-500" />}
                label="工人利用率"
                value={workerUtil}
                detail={`${currentResult.resources.totalAvailableWorkers.toFixed(1)} 人可用`}
                color="blue"
              />
              <UtilizationCard
                icon={<Factory className="size-4 text-emerald-500" />}
                label="机器利用率"
                value={machineUtil}
                detail={`${currentResult.resources.machines} 台可用`}
                color="emerald"
              />
              <UtilizationCard
                icon={<Package className="size-4 text-amber-500" />}
                label="正班总产量"
                value={normalTotal}
                detail="单位"
                color="amber"
                isCount
              />
              <UtilizationCard
                icon={<TrendingUp className="size-4 text-pink-500" />}
                label="加班总产量"
                value={totalOt}
                detail="单位"
                color="pink"
                isCount
              />
            </div>

            {/* 资源参数面板 */}
            <Card>
              <CardHeader
                className="cursor-pointer select-none hover:bg-gray-50/50 transition-colors rounded-t-lg"
                onClick={() => setResourcesExpanded(!resourcesExpanded)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="size-4 text-emerald-500" />
                    <CardTitle className="text-base">第 {currentPeriod} 期资源参数</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">
                      点击展开
                    </Badge>
                    {resourcesExpanded ? (
                      <ChevronUp className="size-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="size-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <CardDescription>
                  机器 {currentResult.resources.machines} 台 · 期初工人 {currentResult.resources.initialWorkers} 人 · 可用工人 {currentResult.resources.totalAvailableWorkers.toFixed(1)} 人
                </CardDescription>
              </CardHeader>
              {resourcesExpanded && (
                <CardContent className="animate-in slide-in-from-top-2 fade-in duration-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ResourceField label="本期机器" value={currentResult.resources.machines} readOnly hint={parseInt(currentPeriod) === 1 ? "初始值" : "自动计算"} />
                    <ResourceField label="本期购买机器" value={currentDecision.machinesPurchased} onChange={(v) => updateDecision("machinesPurchased", v)} hint="两期后到货" isDecision />
                    <ResourceField label="期初人数" value={currentResult.resources.initialWorkers} readOnly hint={parseInt(currentPeriod) === 1 ? "初始值" : "自动计算"} />
                    <ResourceField label="总可用人数" value={parseFloat(currentResult.resources.totalAvailableWorkers.toFixed(2))} readOnly hint="期初 - 解雇 + 雇佣×25%" />
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ResourceField label="最少解雇" value={currentResult.resources.minFire} readOnly hint={`⌈${currentResult.resources.initialWorkers} × ${config.minFireRate}%⌉`} />
                    <ResourceField label="本期解雇" value={currentDecision.fired} onChange={(v) => updateDecision("fired", v)} hint={`≥ ${currentResult.resources.minFire}`} isDecision />
                    <ResourceField label="最大雇佣" value={currentResult.resources.maxHire} readOnly hint={`⌊${currentResult.resources.initialWorkers} × ${config.maxHireRate}%⌋`} />
                    <ResourceField label="本期雇佣" value={currentDecision.hired} onChange={(v) => updateDecision("hired", v)} hint={`≤ ${currentResult.resources.maxHire}`} isDecision />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* 排产计划表格 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">第 {currentPeriod} 期排产计划</CardTitle>
                <CardDescription>
                  设置各产品在四个班次的生产数量。
                  <span className="inline-flex items-center gap-3 ml-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                      <span className="text-xs">必填</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-300" />
                      <span className="text-xs">选填</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded bg-gray-50 border border-gray-200" />
                      <span className="text-xs">自由</span>
                    </span>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2.5 px-3 font-semibold text-gray-600 w-16">产品</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-gray-600">
                          <span className="flex items-center justify-center gap-1">第一班 <span className="text-[10px] font-normal text-gray-400">正班</span></span>
                        </th>
                        <th className="text-center py-2.5 px-3 font-semibold text-gray-600">
                          <span className="flex items-center justify-center gap-1">一加 <span className="text-[10px] font-normal text-gray-400">加班</span></span>
                        </th>
                        <th className="text-center py-2.5 px-3 font-semibold text-gray-600">
                          <span className="flex items-center justify-center gap-1">第二班 <span className="text-[10px] font-normal text-gray-400">正班</span></span>
                        </th>
                        <th className="text-center py-2.5 px-3 font-semibold text-gray-600">
                          <span className="flex items-center justify-center gap-1">二加 <span className="text-[10px] font-normal text-gray-400">加班</span></span>
                        </th>
                        <th className="text-right py-2.5 px-3 font-semibold text-gray-600 w-20">合计</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(["A", "B", "C", "D"] as const).map((product) => {
                        const total =
                          currentProduction.shift1[product] +
                          currentProduction.ot1[product] +
                          currentProduction.shift2[product] +
                          currentProduction.ot2[product];
                        return (
                          <tr key={product} className="border-b border-gray-50 hover:bg-gray-50/30 transition-colors">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-gray-800 text-base">{product}</span>
                            </td>
                            {(["shift1", "ot1", "shift2", "ot2"] as const).map((shift) => {
                              const cellColor = colorMap[product]?.[shift] || "free";
                              return (
                                <td key={shift} className="py-2 px-3">
                                  <ProductionInput
                                    value={currentProduction[shift][product]}
                                    onChange={(v) => updateProduction(shift, product, v)}
                                    cellColor={cellColor}
                                  />
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-3 text-right">
                              <span className={`font-bold text-base ${total > 0 ? "text-emerald-700" : "text-gray-400"}`}>
                                {total}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                        <td className="py-2.5 px-3 font-semibold text-gray-500 text-xs">小计</td>
                        {(["shift1", "ot1", "shift2", "ot2"] as const).map((shift) => {
                          const sum =
                            currentProduction[shift].A + currentProduction[shift].B +
                            currentProduction[shift].C + currentProduction[shift].D;
                          return (
                            <td key={shift} className="py-2.5 px-3 text-center font-semibold text-gray-600">{sum}</td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 text-base">{totalProd}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 约束验证 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">约束验证</CardTitle>
                    <CardDescription>实时检查当前排产方案是否满足所有约束条件（值 ≥ 0 为通过）</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">{constraintPassCount}/6</span>
                    <div className="w-24">
                      <Progress value={(constraintPassCount / 6) * 100} className={`h-2 ${constraintsPassed ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500"}`} />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ConstraintRow label="C1: 可用人数-一班后" value={currentResult.constraints.c1_workersAfterShift1} formula="总可用人数 - 一正消耗人力 - 二正消耗人力" />
                  <ConstraintRow label="C2: 可用人数-一加后" value={currentResult.constraints.c2_workersAfterOt1} formula="一正消耗人力 - 一加消耗人力 × 2" />
                  <ConstraintRow label="C4: 可用人数-二加后" value={currentResult.constraints.c4_workersAfterOt2} formula="二正消耗人力 - 二加消耗人力 × 2" />
                  <ConstraintRow label="C5: 可用机器-一班后" value={currentResult.constraints.c5_machinesAfterShift1} formula="本期机器 - 一正消耗机器" />
                  <ConstraintRow label="C7: 可用机器-二班后" value={currentResult.constraints.c7_machinesAfterShift2} formula="本期机器 - 二正消耗机器 - 一加消耗机器 × 2" />
                  <ConstraintRow label="C8: 可用机器-二加后" value={currentResult.constraints.c8_machinesAfterOt2} formula="本期机器 - 二加消耗机器 × 2" />
                </div>
              </CardContent>
            </Card>

            {/* 资源消耗明细 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">资源消耗明细</CardTitle>
                <CardDescription>各班次的人力和机器消耗详情</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 font-medium text-gray-500">资源</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">第一班</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">一加</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">第二班</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">二加</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">合计</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 px-3 font-medium text-blue-600">
                          <span className="flex items-center gap-1.5"><Users className="size-3.5" /> 人力消耗</span>
                        </td>
                        <td className="py-2 px-3 text-center">{currentResult.laborUsed.shift1.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">{currentResult.laborUsed.ot1.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">{currentResult.laborUsed.shift2.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">{currentResult.laborUsed.ot2.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-medium">{(currentResult.laborUsed.shift1 + currentResult.laborUsed.ot1 + currentResult.laborUsed.shift2 + currentResult.laborUsed.ot2).toFixed(2)}</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 px-3 font-medium text-emerald-600">
                          <span className="flex items-center gap-1.5"><Factory className="size-3.5" /> 机器消耗</span>
                        </td>
                        <td className="py-2 px-3 text-center">{currentResult.machineUsed.shift1.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">{currentResult.machineUsed.ot1.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">{currentResult.machineUsed.shift2.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center">{currentResult.machineUsed.ot2.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-medium">{(currentResult.machineUsed.shift1 + currentResult.machineUsed.ot1 + currentResult.machineUsed.shift2 + currentResult.machineUsed.ot2).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== 财务分析 Tab ===== */}
          <TabsContent value="financials" className="space-y-6 mt-6">
            {/* 当期财务概览卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FinancialSummaryCard
                label="本期收入"
                value={currentResult.financials.revenue.total}
                icon={<TrendingUp className="size-4 text-emerald-500" />}
                color="emerald"
              />
              <FinancialSummaryCard
                label="本期成本"
                value={currentResult.financials.totalCost}
                icon={<TrendingDown className="size-4 text-red-500" />}
                color="red"
              />
              <FinancialSummaryCard
                label="本期利润"
                value={currentResult.financials.netProfit}
                icon={<DollarSign className="size-4 text-blue-500" />}
                color={currentResult.financials.netProfit >= 0 ? "emerald" : "red"}
                highlight
              />
            </div>

            {/* 收入明细 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="size-4 text-emerald-500" />
                  第 {currentPeriod} 期收入明细
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 font-medium text-gray-500">产品</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">产量</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">单价</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">收入</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(["A", "B", "C", "D"] as const).map((p, i) => (
                        <tr key={p} className="border-b border-gray-50">
                          <td className="py-2 px-3 font-semibold text-gray-700">{p}</td>
                          <td className="py-2 px-3 text-center">{currentResult.totalOutput[p]}</td>
                          <td className="py-2 px-3 text-center">{formatMoneyFull(config.productFinancials[i]?.sellingPrice || 0)}</td>
                          <td className="py-2 px-3 text-right font-medium text-emerald-600">{formatMoneyFull(currentResult.financials.revenue[p])}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-gray-200 bg-emerald-50/50">
                        <td colSpan={3} className="py-2 px-3 font-bold text-gray-700">总收入</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatMoneyFull(currentResult.financials.revenue.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 成本明细 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="size-4 text-red-500" />
                  第 {currentPeriod} 期成本明细
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <CostRow label="原材料成本" value={currentResult.financials.materialCost.total} detail={`A: ${formatMoneyFull(currentResult.financials.materialCost.A)} | B: ${formatMoneyFull(currentResult.financials.materialCost.B)} | C: ${formatMoneyFull(currentResult.financials.materialCost.C)} | D: ${formatMoneyFull(currentResult.financials.materialCost.D)}`} />
                  <CostRow label="正班人工成本" value={currentResult.financials.laborCostNormal} detail={`在岗 ${currentResult.resources.initialWorkers - currentResult.resources.fired + currentResult.resources.hired} 人 × ${formatMoneyFull(config.laborCosts.normalWage)} 元`} />
                  <CostRow label="加班人工成本" value={currentResult.financials.laborCostOvertime} detail={`加班人力 ${(currentResult.laborUsed.ot1 + currentResult.laborUsed.ot2).toFixed(1)} × ${formatMoneyFull(config.laborCosts.normalWage)} × ${config.laborCosts.overtimeMultiplier}`} />
                  <CostRow label="雇佣成本" value={currentResult.financials.hiringCost} detail={`雇佣 ${currentResult.resources.hired} 人 × ${formatMoneyFull(config.laborCosts.hiringCost)} 元`} />
                  <CostRow label="解雇成本" value={currentResult.financials.firingCost} detail={`解雇 ${currentResult.resources.fired} 人 × ${formatMoneyFull(config.laborCosts.firingCost)} 元`} />
                  <CostRow label="机器购买成本" value={currentResult.financials.machinePurchaseCost} detail={`购买 ${currentResult.resources.machinesPurchased} 台 × ${formatMoneyFull(config.machineCosts.purchasePrice)} 元`} />
                  <CostRow label="机器维护成本" value={currentResult.financials.machineMaintenanceCost} detail={`${currentResult.resources.machines} 台 × ${formatMoneyFull(config.machineCosts.maintenanceCost)} 元`} />
                  <Separator />
                  <div className="flex items-center justify-between py-2 px-4 bg-red-50 rounded-lg">
                    <span className="font-bold text-gray-700">总成本</span>
                    <span className="font-bold text-red-700">{formatMoneyFull(currentResult.financials.totalCost)} 元</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 利润汇总 */}
            <Card className={currentResult.financials.netProfit >= 0 ? "border-emerald-200" : "border-red-200"}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">第 {currentPeriod} 期净利润</p>
                    <p className={`text-3xl font-bold ${currentResult.financials.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {formatMoneyFull(currentResult.financials.netProfit)} 元
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      利润率: {currentResult.financials.revenue.total > 0
                        ? ((currentResult.financials.netProfit / currentResult.financials.revenue.total) * 100).toFixed(1)
                        : "0.0"}%
                    </p>
                  </div>
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full ${currentResult.financials.netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                    <DollarSign className={`size-8 ${currentResult.financials.netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== 多期总览 Tab ===== */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* 全期汇总 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FinancialSummaryCard label="全期总收入" value={allPeriodsTotal.revenue} icon={<TrendingUp className="size-4 text-emerald-500" />} color="emerald" />
              <FinancialSummaryCard label="全期总成本" value={allPeriodsTotal.cost} icon={<TrendingDown className="size-4 text-red-500" />} color="red" />
              <FinancialSummaryCard label="全期总利润" value={allPeriodsTotal.profit} icon={<DollarSign className="size-4 text-blue-500" />} color={allPeriodsTotal.profit >= 0 ? "emerald" : "red"} highlight />
              <FinancialSummaryCard label="全期总产量" value={allPeriodsTotal.production} icon={<Package className="size-4 text-amber-500" />} color="amber" isCount />
            </div>

            {/* 各期数据表格 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4 text-blue-500" />
                  各期数据总览
                </CardTitle>
                <CardDescription>所有期数的产量、收入、成本和利润对比（点击行跳转到对应期数）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 font-medium text-gray-500">期数</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">总产量</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">工人</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">机器</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">收入</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">成本</th>
                        <th className="text-right py-2 px-3 font-medium text-gray-500">利润</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">约束</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => {
                        const prod = calcTotalProduction(r);
                        const passed = allConstraintsSatisfied(r.constraints);
                        return (
                          <tr
                            key={r.period}
                            className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${r.period === parseInt(currentPeriod) ? "bg-emerald-50/50 border-l-2 border-l-emerald-400" : ""}`}
                            onClick={() => { setCurrentPeriod(String(r.period)); setActiveTab("current"); }}
                          >
                            <td className="py-2 px-3 font-semibold text-gray-700">P{r.period}</td>
                            <td className="py-2 px-3 text-center">{prod}</td>
                            <td className="py-2 px-3 text-center text-gray-500">{r.resources.totalAvailableWorkers.toFixed(0)}</td>
                            <td className="py-2 px-3 text-center text-gray-500">{r.resources.machines}</td>
                            <td className="py-2 px-3 text-right text-emerald-600">{formatMoney(r.financials.revenue.total)}</td>
                            <td className="py-2 px-3 text-right text-red-600">{formatMoney(r.financials.totalCost)}</td>
                            <td className={`py-2 px-3 text-right font-medium ${r.financials.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                              {formatMoney(r.financials.netProfit)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {passed ? (
                                <CheckCircle2 className="size-4 text-emerald-500 mx-auto" />
                              ) : (
                                <XCircle className="size-4 text-red-500 mx-auto" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-gray-200 bg-gray-50">
                        <td className="py-2 px-3 font-bold text-gray-700">合计</td>
                        <td className="py-2 px-3 text-center font-bold">{allPeriodsTotal.production}</td>
                        <td className="py-2 px-3 text-center text-gray-400">—</td>
                        <td className="py-2 px-3 text-center text-gray-400">—</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">{formatMoney(allPeriodsTotal.revenue)}</td>
                        <td className="py-2 px-3 text-right font-bold text-red-700">{formatMoney(allPeriodsTotal.cost)}</td>
                        <td className={`py-2 px-3 text-right font-bold ${allPeriodsTotal.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                          {formatMoney(allPeriodsTotal.profit)}
                        </td>
                        <td className="py-2 px-3 text-center text-gray-400">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* 各期资源参数表 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">各期资源参数</CardTitle>
                <CardDescription>人力和机器资源的多期变化</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 font-medium text-gray-500">期数</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">期初人数</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">解雇</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">雇佣</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">可用人数</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">机器</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-500">购买</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr key={r.period} className={`border-b border-gray-50 ${r.period === parseInt(currentPeriod) ? "bg-emerald-50/50" : ""}`}>
                          <td className="py-2 px-3 font-semibold text-gray-700">P{r.period}</td>
                          <td className="py-2 px-3 text-center">{r.resources.initialWorkers}</td>
                          <td className="py-2 px-3 text-center text-red-500">{r.resources.fired}</td>
                          <td className="py-2 px-3 text-center text-emerald-500">{r.resources.hired}</td>
                          <td className="py-2 px-3 text-center font-medium">{r.resources.totalAvailableWorkers.toFixed(1)}</td>
                          <td className="py-2 px-3 text-center">{r.resources.machines}</td>
                          <td className="py-2 px-3 text-center text-blue-500">{r.resources.machinesPurchased}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

// ============================================================
// 子组件
// ============================================================

/** 利用率卡片 */
function UtilizationCard({
  icon, label, value, detail, color, isCount,
}: {
  icon: React.ReactNode; label: string; value: number; detail: string; color: string; isCount?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500", emerald: "bg-emerald-500", amber: "bg-amber-500", pink: "bg-pink-500",
  };
  return (
    <Card className="border-gray-100">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{label}</span>
          {icon}
        </div>
        {isCount ? (
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-900">{value}%</div>
            <Progress value={value} className={`h-1.5 [&>div]:${colorMap[color]}`} />
          </>
        )}
        <div className="text-xs text-gray-400">{detail}</div>
      </CardContent>
    </Card>
  );
}

/** 财务汇总卡片 */
function FinancialSummaryCard({
  label, value, icon, color, highlight, isCount,
}: {
  label: string; value: number; icon: React.ReactNode; color: string; highlight?: boolean; isCount?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    emerald: "text-emerald-700", red: "text-red-700", blue: "text-blue-700", amber: "text-amber-700",
  };
  return (
    <Card className={highlight ? (value >= 0 ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30") : "border-gray-100"}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{label}</span>
          {icon}
        </div>
        <div className={`text-2xl font-bold ${highlight ? colorClasses[color] : colorClasses[color]}`}>
          {isCount ? value.toLocaleString() : formatMoney(value)}
        </div>
        {!isCount && <div className="text-xs text-gray-400">{formatMoneyFull(value)} 元</div>}
      </CardContent>
    </Card>
  );
}

/** 排产输入框 */
function ProductionInput({
  value, onChange, cellColor,
}: {
  value: number; onChange: (v: number) => void; cellColor: CellColor;
}) {
  const bgClass =
    cellColor === "required"
      ? "bg-amber-50 border-amber-300 focus-within:ring-amber-200"
      : cellColor === "optional"
        ? "bg-blue-50 border-blue-300 focus-within:ring-blue-200"
        : cellColor === "disabled"
          ? "bg-gray-100 border-gray-200 opacity-50"
          : "bg-white border-gray-200";
  return (
    <Input
      type="number"
      value={value || ""}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className={`w-20 mx-auto text-center h-8 text-sm ${bgClass}`}
      disabled={cellColor === "disabled"}
      min={0}
      placeholder="0"
    />
  );
}

/** 资源参数字段 */
function ResourceField({
  label, value, readOnly, onChange, hint, isDecision,
}: {
  label: string; value: number; readOnly?: boolean; onChange?: (v: number) => void; hint?: string; isDecision?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-500 flex items-center gap-1.5">
        {label}
        {isDecision && (
          <Badge className="text-[9px] px-1 py-0 bg-orange-100 text-orange-700 border-0">决策</Badge>
        )}
      </Label>
      {readOnly ? (
        <div className="h-8 flex items-center px-3 rounded-md bg-gray-50 border border-gray-100 text-sm font-medium text-gray-700">
          {typeof value === "number" && !Number.isInteger(value) ? value.toFixed(2) : value}
        </div>
      ) : (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange?.(parseInt(e.target.value) || 0)}
          className="h-8 text-sm border-orange-200 bg-orange-50/50"
          min={0}
        />
      )}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

/** 约束验证行 */
function ConstraintRow({ label, value, formula }: { label: string; value: number; formula: string }) {
  const status = getConstraintStatus(value);
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
      status === "pass" ? "border-emerald-100 bg-emerald-50/30" :
      status === "warning" ? "border-amber-100 bg-amber-50/30" :
      "border-red-100 bg-red-50/30"
    }`}>
      {status === "pass" && <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />}
      {status === "warning" && <AlertTriangle className="size-4 text-amber-500 shrink-0" />}
      {status === "fail" && <XCircle className="size-4 text-red-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <p className="text-[10px] text-gray-400 truncate">{formula}</p>
      </div>
      <span className={`text-sm font-mono font-medium ${status === "fail" ? "text-red-600" : status === "warning" ? "text-amber-600" : "text-emerald-600"}`}>
        {value.toFixed(3)}
      </span>
      <Badge
        variant="outline"
        className={status === "pass" ? "text-emerald-600 border-emerald-200 bg-emerald-50" : status === "warning" ? "text-amber-600 border-amber-200 bg-amber-50" : "text-red-600 border-red-200 bg-red-50"}
      >
        {status === "pass" ? "通过" : status === "warning" ? "警告" : "超限"}
      </Badge>
    </div>
  );
}

/** 成本明细行 */
function CostRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="flex items-center justify-between py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <p className="text-[10px] text-gray-400">{detail}</p>
      </div>
      <span className="text-sm font-mono font-medium text-red-600">{formatMoneyFull(value)} 元</span>
    </div>
  );
}
