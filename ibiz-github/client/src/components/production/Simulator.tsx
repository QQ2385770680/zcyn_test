/**
 * ProductionSimulator — 生产模拟（重构版）
 *
 * 借鉴 wuushuang.com 布局风格：
 * - 顶部操作栏：加载方案 + 一键最优排产 + 重置
 * - 1-8期 Accordion 纵向排列，每期可折叠
 * - 每期头部：期数标识 + 机器/人数 + 雇佣策略 + 总产量 + 本期最优按钮
 * - 展开后：资源信息 + 排产表格（产品×班次）+ 约束验证
 * - 底部：汇总统计 + 趋势图表
 *
 * 只保留排产功能，移除财务面板和多余 Tab。
 */
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Info,
  Sparkles,
  Zap,
  Factory,
  Users,
  FolderOpen,
  AlertTriangle,
  TrendingUp,
  Link2,
} from "lucide-react";
import React from "react";

import {
  type PeriodProduction,
  type PeriodDecision,
  type PeriodResult,
  PERIOD_COLOR_MAPS,
  emptyPeriodProduction,
  allConstraintsSatisfied,
} from "@/lib/data";
import { useConfig } from "@/lib/ConfigContext";
import {
  calcAllPeriods,
  generateDefaultDecisions,
  getConstraintStatus,
  calcWorkerUtilization,
  calcMachineUtilization,
  calcTotalProduction,
  calcPeriodResources,
} from "@/lib/engine";
import { useDesignPlan, designToProductions, designToDecisions } from "@/lib/DesignPlanContext";
import { loadDesignPlans, type DesignPlanConfig } from "@/lib/designerTypes";
import { solveOptimal, solveSinglePeriod } from "@/lib/solver";
import { recordPlanUsage } from "@/lib/planStorage";

// ============================================================
// Toast
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
// 颜色映射图例
// ============================================================

const CELL_COLORS = {
  required: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", label: "必填" },
  optional: { bg: "bg-sky-50", border: "border-sky-300", text: "text-sky-700", label: "选填" },
  free: { bg: "bg-white", border: "border-gray-200", text: "text-gray-700", label: "自由" },
  disabled: { bg: "bg-gray-100", border: "border-gray-200", text: "text-gray-400", label: "禁区" },
  blank: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-400", label: "不填" },
  fixed: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700", label: "固定" },
};

type CellColorKey = keyof typeof CELL_COLORS;

// ============================================================
// 约束状态颜色
// ============================================================

function constraintColor(value: number): string {
  if (value < -0.001) return "text-red-600 font-semibold"; // 超限
  if (value <= 5) return "text-emerald-600"; // 接近0 = 达标
  return "text-amber-600"; // 偏大
}

function constraintBg(value: number): string {
  if (value < -0.001) return "bg-red-50";
  if (value <= 5) return ""; // 接近0 = 达标
  return "bg-amber-50"; // 偏大
}

// ============================================================
// 主组件
// ============================================================

// ============================================================
// 模拟器状态缓存 key
// ============================================================
const SIM_CACHE_KEY = "ibiz-sim-cache";

interface SimCacheData {
  productions: PeriodProduction[];
  decisions: PeriodDecision[];
  activeDesign: DesignPlanConfig | null;
  designSource: string | null;
  selectedPlanId: string | undefined;
  openPeriods: number[];
  initialMachines: number;
  initialWorkers: number;
}

function saveSimCache(data: SimCacheData) {
  try {
    localStorage.setItem(SIM_CACHE_KEY, JSON.stringify(data));
  } catch { /* 存储失败 */ }
}

function loadSimCache(): SimCacheData | null {
  try {
    const saved = localStorage.getItem(SIM_CACHE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as SimCacheData;
      if (parsed.productions && parsed.decisions) return parsed;
    }
  } catch { /* 解析失败 */ }
  return null;
}

export function ProductionSimulator() {
  const { config, updateConfig } = useConfig();
  const { showToast, ToastComponent } = useToast();
  const { consumeSimData } = useDesignPlan();

  // 从缓存恢复状态
  const cachedSim = React.useMemo(() => loadSimCache(), []);

  // 展开的期数集合
  const [openPeriods, setOpenPeriods] = React.useState<Set<number>>(
    () => new Set(cachedSim?.openPeriods ?? [1])
  );

  // 当前加载的设计方案
  const [activeDesign, setActiveDesign] = React.useState<DesignPlanConfig | null>(
    cachedSim?.activeDesign ?? null
  );
  const [designSource, setDesignSource] = React.useState<string | null>(
    cachedSim?.designSource ?? null
  );
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | undefined>(
    cachedSim?.selectedPlanId ?? undefined
  );

  // 各期排产数据
  const [productions, setProductions] = React.useState<PeriodProduction[]>(() =>
    cachedSim?.productions ?? Array.from({ length: config.periods }, () => emptyPeriodProduction())
  );

  // 各期资源决策
  const [decisions, setDecisions] = React.useState<PeriodDecision[]>(() =>
    cachedSim?.decisions ?? generateDefaultDecisions(config)
  );

  // 输入框字符串 state（允许删空）
  const [initMachinesStr, setInitMachinesStr] = React.useState(String(config.initialMachines));
  const [initWorkersStr, setInitWorkersStr] = React.useState(String(config.initialWorkers));

  // 联动自动求解开关
  const [autoSolveLinked, setAutoSolveLinked] = React.useState(false);

  // 恢复缓存的初始参数
  React.useEffect(() => {
    if (cachedSim && cachedSim.initialMachines !== undefined && cachedSim.initialWorkers !== undefined) {
      if (config.initialMachines !== cachedSim.initialMachines || config.initialWorkers !== cachedSim.initialWorkers) {
        updateConfig({ initialMachines: cachedSim.initialMachines, initialWorkers: cachedSim.initialWorkers });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 自动保存缓存（防抖）
  React.useEffect(() => {
    const timer = setTimeout(() => {
      saveSimCache({
        productions,
        decisions,
        activeDesign,
        designSource,
        selectedPlanId,
        openPeriods: Array.from(openPeriods),
        initialMachines: config.initialMachines,
        initialWorkers: config.initialWorkers,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [productions, decisions, activeDesign, designSource, selectedPlanId, openPeriods, config.initialMachines, config.initialWorkers]);

  // 检查是否有来自设计器/我的方案的待应用数据
  React.useEffect(() => {
    const simData = consumeSimData();
    if (simData) {
      setProductions(simData.productions);
      setDecisions(simData.decisions);
      setDesignSource(simData.designPlan.name || "未命名方案");
      setActiveDesign(simData.designPlan);
      setOpenPeriods(new Set([1]));
      // 在方案列表中查找匹配的 ID，让下拉框显示选中状态
      const matchedPlan = designPlans.find(p => p.name === simData.designPlan.name);
      if (matchedPlan) {
        setSelectedPlanId(matchedPlan.id);
        recordPlanUsage(matchedPlan.id);
      }
      showToast(`已加载方案「${simData.designPlan.name || "未命名方案"}`, "info");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 计算所有期数结果
  const results = React.useMemo(
    () => calcAllPeriods(config, productions, decisions),
    [config, productions, decisions]
  );

  // 加载方案设计列表
  const designPlans = React.useMemo(() => loadDesignPlans(), []);

  // ============================================================
  // 操作函数
  // ============================================================

  const togglePeriod = (p: number) => {
    setOpenPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  /** 联动自动求解：对 periodIdx 之后的所有期重新计算雇佣决策 + 最优排产 */
  const autoSolveAfter = React.useCallback((periodIdx: number, currentProductions: PeriodProduction[], currentDecisions: PeriodDecision[]) => {
    if (!autoSolveLinked || !activeDesign) return { productions: currentProductions, decisions: currentDecisions };
    const newProductions = [...currentProductions];
    const newDecisions = [...currentDecisions.map(d => ({ ...d }))];

    for (let i = periodIdx + 1; i < config.periods; i++) {
      const period = i + 1;

      // 1. 根据方案预设重新计算该期的雇佣决策
      const tempResults = calcAllPeriods(config, newProductions, newDecisions);
      const resources = tempResults[i]?.resources;
      if (!resources) break;

      const hiringConfig = activeDesign.periodHiring[i];
      if (hiringConfig) {
        const initialWorkers = resources.initialWorkers;
        const minFire = Math.ceil(initialWorkers * (config.minFireRate / 100));
        const maxHire = Math.floor(initialWorkers * (config.maxHireRate / 100));
        const fired = minFire;
        let hired: number;

        switch (hiringConfig.mode) {
          case "max-hire":
            hired = maxHire;
            break;
          case "balance":
            hired = minFire;
            break;
          case "flexible":
            // 灵活调整模式保留用户已输入的值
            hired = newDecisions[i].hired;
            break;
          case "range": {
            const hMin = Math.max(0, hiringConfig.hiredRangeMin);
            const hMax = Math.min(maxHire, hiringConfig.hiredRangeMax);
            hired = Math.round((hMin + hMax) / 2);
            break;
          }
          case "fixed":
            hired = Math.min(maxHire, Math.max(0, hiringConfig.fixedHired));
            break;
          default:
            hired = maxHire;
        }

        newDecisions[i] = { ...newDecisions[i], hired, fired };
      }

      // 2. 重新计算资源（雇佣决策已更新）并求解最优排产
      const updatedResults = calcAllPeriods(config, newProductions, newDecisions);
      const updatedResources = updatedResults[i]?.resources;
      if (!updatedResources) break;

      const optimized = solveSinglePeriod(updatedResources, config, period, activeDesign);
      newProductions[i] = optimized;
    }
    return { productions: newProductions, decisions: newDecisions };
  }, [autoSolveLinked, activeDesign, config]);

  const updateProduction = (
    periodIdx: number,
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
      // 联动自动求解后续期
      if (autoSolveLinked && activeDesign) {
        const { productions: solved, decisions: solvedDec } = autoSolveAfter(periodIdx, next, decisions);
        // 延迟更新 decisions 避免在 setProductions 回调中直接调用 setDecisions
        setTimeout(() => setDecisions(solvedDec), 0);
        return solved;
      }
      return next;
    });
  };

  const handleLoadDesign = (planId: string) => {
    const plan = designPlans.find((p) => p.id === planId);
    if (!plan) return;

    // 从设计方案转换为模拟器数据
    const newProductions = designToProductions(plan.periodProductions);
    const newDecisions = designToDecisions(plan.periodHiring, plan.periodMachines, config);

    setProductions(newProductions);
    setDecisions(newDecisions);
    setActiveDesign(plan);
    setDesignSource(plan.name || "未命名方案");
    setSelectedPlanId(planId);
    // 记录方案使用次数
    recordPlanUsage(plan.id);
    showToast(`已加载方案「${plan.name}」`, "success");
  };

  const handleOptimizeAll = () => {
    const result = solveOptimal(config, activeDesign);
    // 保留灵活调整模式下用户手动输入的雇佣人数
    const mergedDecisions = result.decisions.map((d, i) => {
      if (activeDesign?.periodHiring[i]?.mode === "flexible") {
        return { ...d, hired: decisions[i].hired, fired: d.fired };
      }
      return d;
    });
    setProductions(result.productions);
    setDecisions(mergedDecisions);
    showToast(`已完成全局最优排产（耗时 ${result.elapsed.toFixed(1)}ms，A-B差=${result.balance.abDiff}，C-D差=${result.balance.cdDiff}）`, "success");
  };

  const handleOptimizePeriod = (periodIdx: number) => {
    const period = periodIdx + 1;
    // 计算该期的资源
    const tempResults = calcAllPeriods(config, productions, decisions);
    const resources = tempResults[periodIdx]?.resources;
    if (!resources) return;

    const optimized = solveSinglePeriod(resources, config, period, activeDesign);
    setProductions((prev) => {
      const next = [...prev];
      next[periodIdx] = optimized;
      return next;
    });
    showToast(`第 ${period} 期已最优排产`, "success");
  };

  const handleResetAll = () => {
    // 仅重置每期产品排产数量（必填和选填格）为0，其余参数保持不变
    setProductions(Array.from({ length: config.periods }, () => emptyPeriodProduction()));
    // 清除缓存
    try { localStorage.removeItem(SIM_CACHE_KEY); } catch { /* ignore */ }
    showToast("每期排产数量已重置", "info");
  };

  /** 灵活调整模式下手动修改雇佣人数 */
  const handleUpdateHired = (periodIdx: number, hired: number) => {
    const updatedDecisions = [...decisions];
    updatedDecisions[periodIdx] = { ...updatedDecisions[periodIdx], hired };
    setDecisions(updatedDecisions);

    // 联动自动求解后续期（同时更新 productions 和 decisions）
    if (autoSolveLinked && activeDesign) {
      setTimeout(() => {
        const { productions: solved, decisions: solvedDec } = autoSolveAfter(periodIdx, productions, updatedDecisions);
        setProductions(solved);
        setDecisions(solvedDec);
      }, 0);
    }
  };

  // ============================================================
  // 汇总统计
  // ============================================================

  const totalAllPeriods = results.reduce(
    (sum, r) => sum + r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D,
    0
  );

  const lastResult = results[results.length - 1];
  const lastAvailWorkers = lastResult?.resources.totalAvailableWorkers ?? 0;
  const lastMachines = lastResult?.resources.machines ?? 0;

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="space-y-4">
      {ToastComponent}

      {/* ===== 操作栏 ===== */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 加载方案 */}
        <div className="flex items-center gap-2">
          <FolderOpen className="size-4 text-muted-foreground" />
          <Select value={selectedPlanId} onValueChange={handleLoadDesign}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder="选择方案设计..." />
            </SelectTrigger>
            <SelectContent>
              {designPlans.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">暂无方案设计</div>
              ) : (
                designPlans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name || "未命名方案"}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {designSource && (
          <Badge variant="secondary" className="bg-violet-50 text-violet-700 border-violet-200">
            <Sparkles className="size-3 mr-1" />
            来自：{designSource}
          </Badge>
        )}

        <div className="flex-1" />

        <Button
          onClick={() => {
            if (!activeDesign) {
              showToast("请先选择一个方案设计", "error");
              return;
            }
            handleOptimizeAll();
          }}
          className={`h-9 ${activeDesign ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
          size="sm"
          disabled={!activeDesign}
        >
          <Zap className="size-4 mr-1.5" />
          一键最优排产
        </Button>

        <Button variant="outline" size="sm" className="h-9" onClick={handleResetAll}>
          <RotateCcw className="size-4 mr-1.5" />
          重置参数
        </Button>
      </div>

      {/* ===== 联动自动求解开关 ===== */}
      {activeDesign && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50/40">
          <Link2 className="size-4 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">联动自动求解</span>
          <Switch
            checked={autoSolveLinked}
            onCheckedChange={setAutoSolveLinked}
            className="data-[state=checked]:bg-blue-600"
          />
          <span className="text-[11px] text-blue-500">
            {autoSolveLinked ? "开启：修改某期参数后自动排后续期最优解" : "关闭"}
          </span>
        </div>
      )}

      {/* ===== 颜色图例 ===== */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-300" />
          黄格 = 必填
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-sky-100 border border-sky-300" />
          蓝格 = 选填
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-white border border-gray-300" />
          白格 = 自由
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-100 border border-gray-300" />
          灰格 = 不填
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300" />
          绿格 = 固定
        </span>
        <span className="ml-2 flex items-center gap-2">
          <span className="text-emerald-600">⊙ 达标</span>
          <span className="text-amber-600">△ 偏大</span>
          <span className="text-red-600">⊗ 超限</span>
        </span>
      </div>

      {/* ===== 一期初始参数（紧凑单行） ===== */}
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50/40">
        <span className="text-xs font-semibold text-amber-800 whitespace-nowrap">一期初始参数</span>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-300 text-amber-700">必填</Badge>
        <div className="flex items-center gap-2">
          <label className="text-xs text-amber-700">机器数</label>
          <Input
            type="number"
            min={0}
            value={initMachinesStr}
            onChange={(e) => setInitMachinesStr(e.target.value)}
            onBlur={() => {
              const v = parseInt(initMachinesStr) || 0;
              setInitMachinesStr(String(v));
              updateConfig({ initialMachines: v });
            }}
            className="h-7 w-20 text-sm text-center bg-white border-amber-300 focus:border-amber-500"
            placeholder="0"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-amber-700">工人数</label>
          <Input
            type="number"
            min={0}
            value={initWorkersStr}
            onChange={(e) => setInitWorkersStr(e.target.value)}
            onBlur={() => {
              const v = parseInt(initWorkersStr) || 0;
              setInitWorkersStr(String(v));
              updateConfig({ initialWorkers: v });
            }}
            className="h-7 w-20 text-sm text-center bg-white border-amber-300 focus:border-amber-500"
            placeholder="0"
          />
        </div>
      </div>

      {/* ===== 1-8期 Accordion ===== */}
      <div className="space-y-2">
        {results.map((result, idx) => (
          <PeriodAccordion
            key={idx}
            periodIdx={idx}
            result={result}
            production={productions[idx]}
            config={config}
            decision={decisions[idx]}
            isOpen={openPeriods.has(idx + 1)}
            onToggle={() => togglePeriod(idx + 1)}
            onUpdateProduction={(shift, product, value) =>
              updateProduction(idx, shift, product, value)
            }
            onUpdateHired={handleUpdateHired}
            onOptimize={() => handleOptimizePeriod(idx)}
            activeDesign={activeDesign}
          />
        ))}
      </div>

      {/* ===== 底部汇总 ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">排产总量</div>
            <div className="text-2xl font-bold text-foreground">{totalAllPeriods.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">末期可用人数</div>
            <div className="text-2xl font-bold text-foreground">{lastAvailWorkers.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">第{config.periods}期</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">末期机器数</div>
            <div className="text-2xl font-bold text-foreground">{lastMachines}</div>
            <div className="text-xs text-muted-foreground">含购买生效</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">约束状态</div>
            <div className="text-2xl font-bold">
              {results.every((r) => allConstraintsSatisfied(r.constraints)) ? (
                <span className="text-emerald-600">全部通过</span>
              ) : (
                <span className="text-red-600">存在超限</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== 详细计算结果表 ===== */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" />
            详细计算结果
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">期数</th>
                  <th className="py-2 pr-3 font-medium">机器</th>
                  <th className="py-2 pr-3 font-medium">期初人数</th>
                  <th className="py-2 pr-3 font-medium">解雇</th>
                  <th className="py-2 pr-3 font-medium">雇佣</th>
                  <th className="py-2 pr-3 font-medium">可用人数</th>
                  <th className="py-2 pr-3 font-medium">总产量</th>
                  <th className="py-2 pr-3 font-medium">人力%</th>
                  <th className="py-2 pr-3 font-medium">机器%</th>
                  <th className="py-2 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const total = r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D;
                  const workerUtil = calcWorkerUtilization(r);
                  const machineUtil = calcMachineUtilization(r);
                  const passed = allConstraintsSatisfied(r.constraints);
                  return (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="py-2 pr-3 font-semibold text-emerald-700">P{r.period}</td>
                      <td className="py-2 pr-3">{r.resources.machines}</td>
                      <td className="py-2 pr-3">{Math.round(r.resources.initialWorkers)}</td>
                      <td className="py-2 pr-3 text-red-600">-{r.resources.fired}</td>
                      <td className="py-2 pr-3 text-emerald-600">+{r.resources.hired}</td>
                      <td className="py-2 pr-3">{r.resources.totalAvailableWorkers.toFixed(1)}</td>
                      <td className="py-2 pr-3 font-semibold">{total}</td>
                      <td className="py-2 pr-3">
                        <span className={workerUtil > 90 ? "text-red-600" : workerUtil > 70 ? "text-amber-600" : "text-emerald-600"}>
                          {workerUtil}%
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={machineUtil > 90 ? "text-red-600" : machineUtil > 70 ? "text-amber-600" : "text-emerald-600"}>
                          {machineUtil}%
                        </span>
                      </td>
                      <td className="py-2">
                        {passed ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : (
                          <XCircle className="size-4 text-red-500" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 单期 Accordion 组件
// ============================================================

interface PeriodAccordionProps {
  periodIdx: number;
  result: PeriodResult;
  production: PeriodProduction;
  config: { periods: number; products: { name: string; machineHours: number; laborHours: number; rawMaterial: number }[]; minFireRate: number; maxHireRate: number };
  decision: PeriodDecision;
  isOpen: boolean;
  onToggle: () => void;
  onUpdateProduction: (
    shift: keyof PeriodProduction,
    product: "A" | "B" | "C" | "D",
    value: number
  ) => void;
  onUpdateHired: (periodIdx: number, hired: number) => void;
  onOptimize: () => void;
  activeDesign: DesignPlanConfig | null;
}

function PeriodAccordion({
  periodIdx,
  result,
  production,
  config,
  decision,
  isOpen,
  onToggle,
  onUpdateProduction,
  onUpdateHired,
  onOptimize,
  activeDesign,
}: PeriodAccordionProps) {
  const period = periodIdx + 1;
  const colorMap = PERIOD_COLOR_MAPS[period] || PERIOD_COLOR_MAPS[8];

  // 根据方案设计的行为模式获取单元格颜色
  const getCellColor = (product: string, shiftKey: string): CellColorKey => {
    if (activeDesign && activeDesign.periodProductions[periodIdx]) {
      const periodConfig = activeDesign.periodProductions[periodIdx];
      const shiftConfig = periodConfig[shiftKey as keyof typeof periodConfig];
      if (shiftConfig) {
        const cellConfig = shiftConfig[product as keyof typeof shiftConfig];
        if (cellConfig) {
          // 方案设计行为模式直接映射到颜色
          const modeToColor: Record<string, CellColorKey> = {
            required: "required",
            optional: "optional",
            blank: "blank",
            fixed: "fixed",
          };
          return modeToColor[cellConfig.mode] || "free";
        }
      }
    }
    // 没有方案设计时，所有格子为白色（自由）
    return "free";
  };
  const totalOutput =
    result.totalOutput.A + result.totalOutput.B + result.totalOutput.C + result.totalOutput.D;
  const passed = allConstraintsSatisfied(result.constraints);
  const r = result.resources;

  // 雇佣策略描述
  const isFlexible = activeDesign?.periodHiring[periodIdx]?.mode === "flexible";
  const hiringDesc = (() => {
    if (isFlexible) return "灵活调整";
    if (r.hired === 0 && r.fired === r.minFire) return "不雇佣";
    if (r.hired === r.maxHire) return "最大雇佣";
    if (r.hired === r.fired) return "雇佣=解雇";
    return `雇佣${r.hired}`;
  })();

  const shifts = [
    { key: "shift1" as const, label: "第一班" },
    { key: "ot1" as const, label: "一加" },
    { key: "shift2" as const, label: "第二班" },
    { key: "ot2" as const, label: "二加" },
  ];
  const products = ["A", "B", "C", "D"] as const;

  // 各班次小计
  const shiftTotals = shifts.map((s) => {
    const p = production[s.key];
    return p.A + p.B + p.C + p.D;
  });

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      {/* 头部 */}
      <CollapsibleTrigger asChild>
        <div
          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors overflow-hidden ${
            isOpen
              ? "bg-emerald-50 border border-emerald-200"
              : passed
              ? "bg-white border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30"
              : "bg-red-50/50 border border-red-200 hover:bg-red-50"
          }`}
        >
          <ChevronDown
            className={`size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          />

          {/* 期数标识 */}
          <span className="text-base font-bold text-emerald-700 shrink-0">P{period}</span>

          {/* 关键信息 — 始终单行 */}
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            第{period}期 机器:{r.machines} | 人数:{r.totalAvailableWorkers.toFixed(1)}
            {activeDesign && (
              <> | {hiringDesc} | 解雇:{r.fired} | 雇佣:{r.hired}</>
            )}
          </span>

          {/* 弹性占位 */}
          <div className="flex-1" />

          {/* 总产量 + 约束状态 — 固定右侧 */}
          <span className="text-xs font-semibold whitespace-nowrap shrink-0 flex items-center gap-1">
            产量:<span className={totalOutput > 0 ? "text-emerald-700" : "text-muted-foreground"}>{totalOutput}</span>
            {(() => {
              const cs = result.constraints;
              const vals = [cs.c1_workersAfterShift1, cs.c2_workersAfterOt1, cs.c4_workersAfterOt2, cs.c5_machinesAfterShift1, cs.c7_machinesAfterShift2, cs.c8_machinesAfterOt2];
              const hasFail = vals.some(v => v < -0.001);
              const hasWarn = vals.some(v => v > 5);
              const allPass = !hasFail && !hasWarn;
              if (totalOutput === 0) return null;
              if (hasFail) return <span className="text-red-600 text-[10px] font-semibold">⊗超限</span>;
              if (hasWarn) return <span className="text-amber-600 text-[10px] font-semibold">△偏大</span>;
              if (allPass) return <span className="text-emerald-600 text-[10px] font-semibold">⊙达标</span>;
              return null;
            })()}
          </span>

          {/* 本期最优按钮 */}
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-2 text-[11px] shrink-0 ${activeDesign ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50" : "text-gray-400 cursor-not-allowed"}`}
            disabled={!activeDesign}
            onClick={(e) => {
              e.stopPropagation();
              if (!activeDesign) return;
              onOptimize();
            }}
          >
            <Zap className="size-3 mr-0.5" />
            本期最优
          </Button>
        </div>
      </CollapsibleTrigger>

      {/* 展开内容 */}
      <CollapsibleContent>
        <div className="mt-1 p-4 border border-gray-200 rounded-lg bg-white space-y-4">
          {/* 资源信息行 */}
          <div className="grid grid-cols-7 gap-2">
            <ResourceCell label="本期机器" value={String(r.machines)} />
            <ResourceCell
              label="购买机器"
              value={decision.machinesPurchased > 0 ? `+${decision.machinesPurchased}` : "0"}
              tag={decision.machinesPurchased > 0 ? `P${period + 2}到货` : undefined}
            />
            <ResourceCell label="期初人数" value={String(Math.round(r.initialWorkers))} />
            <ResourceCell label="可用人数" value={r.totalAvailableWorkers.toFixed(1)} />
            {isFlexible ? (
              <div className="bg-blue-50 rounded-md px-2 py-1.5 border border-blue-200">
                <div className="text-[11px] text-blue-600 whitespace-nowrap flex items-center gap-0.5">
                  解雇/雇佣
                  <span className="text-[9px] px-0.5 rounded bg-blue-100 text-blue-700">手动</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-red-500">-{r.fired}</span>
                  <span className="text-xs text-gray-400">/</span>
                  <span className="text-xs text-emerald-600">+</span>
                  <ProductionInput
                    value={decision.hired}
                    onChange={(val) => onUpdateHired(periodIdx, Math.min(r.maxHire, val))}
                    className="h-6 w-20 text-xs text-center bg-white border-blue-300 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            ) : (
              <ResourceCell
                label="解雇/雇佣"
                value={`-${r.fired} / +${r.hired}`}
              />
            )}
            <ResourceCell label="解雇范围" value={`${r.minFire}~${Math.ceil(r.initialWorkers * 0.1)}`} tag="公式" />
            <ResourceCell label="最大雇佣" value={String(r.maxHire)} tag="公式" />
          </div>

          {/* 排产表格 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-2 text-left font-medium text-muted-foreground w-12">产品</th>
                  {shifts.map((s) => (
                    <th key={s.key} className="py-2 px-1 text-center font-medium text-muted-foreground">
                      {s.label}
                    </th>
                  ))}
                  <th className="py-2 pl-2 text-center font-medium text-muted-foreground">合计</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const rowTotal = shifts.reduce(
                    (sum, s) => sum + production[s.key][product],
                    0
                  );
                  return (
                    <tr key={product} className="border-b last:border-0">
                      <td className="py-1.5 pr-2 font-semibold text-foreground">{product}</td>
                      {shifts.map((s) => {
                        const cellColor = getCellColor(product, s.key);
                        const colors = CELL_COLORS[cellColor] || CELL_COLORS.free;
                        const isDisabled = cellColor === "disabled" || cellColor === "blank";
                        return (
                          <td key={s.key} className="py-1.5 px-1">
                            <ProductionInput
                              value={production[s.key][product]}
                              onChange={(val) => onUpdateProduction(s.key, product, val)}
                              disabled={isDisabled}
                              className={`h-8 text-center text-sm w-full ${colors.bg} ${colors.border} border ${
                                isDisabled ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                              placeholder={isDisabled ? "-" : "0"}
                            />
                          </td>
                        );
                      })}
                      <td className="py-1.5 pl-2 text-center font-semibold text-foreground">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}

                {/* 小计行 */}
                <tr className="border-t-2 border-gray-300">
                  <td className="py-2 pr-2 font-medium text-muted-foreground">小计</td>
                  {shiftTotals.map((total, i) => (
                    <td key={i} className="py-2 px-1 text-center font-semibold">
                      {total}
                    </td>
                  ))}
                  <td className="py-2 pl-2 text-center font-bold text-emerald-700">
                    {totalOutput}
                  </td>
                </tr>

                {/* 可用人数行（借鉴 wuushuang 布局） */}
                <tr className="border-t border-dashed border-gray-200">
                  <td className="py-1.5 pr-2 text-xs text-muted-foreground whitespace-nowrap">可用人数</td>
                  {[
                    { value: result.constraints.c1_workersAfterShift1, label: "一班后" },
                    { value: result.constraints.c2_workersAfterOt1, label: "一加后" },
                    { value: null, label: "" },
                    { value: result.constraints.c4_workersAfterOt2, label: "二加后" },
                  ].map((item, i) => (
                    <td key={i} className="py-1.5 px-1 text-center">
                      {item.value !== null ? (
                        <ConstraintInline value={item.value} sub={item.label} />
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                  <td />
                </tr>

                {/* 可用机器行 */}
                <tr className="border-t border-dashed border-gray-200">
                  <td className="py-1.5 pr-2 text-xs text-muted-foreground whitespace-nowrap">可用机器</td>
                  {[
                    { value: result.constraints.c5_machinesAfterShift1, label: "一班后" },
                    { value: null, label: "" },
                    { value: result.constraints.c7_machinesAfterShift2, label: "二班后" },
                    { value: result.constraints.c8_machinesAfterOt2, label: "二加后" },
                  ].map((item, i) => (
                    <td key={i} className="py-1.5 px-1 text-center">
                      {item.value !== null ? (
                        <ConstraintInline value={item.value} sub={item.label} />
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================
// 辅助子组件
// ============================================================

function ResourceCell({
  label,
  value,
  tag,
}: {
  label: string;
  value: string;
  tag?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-md px-2 py-1.5">
      <div className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-0.5">
        {label}
        {tag && (
          <span className={`text-[9px] px-0.5 rounded ${
            tag === "必填" ? "bg-amber-100 text-amber-700" :
            tag === "公式" ? "bg-blue-100 text-blue-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {tag}
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-foreground mt-0.5 whitespace-nowrap">{value}</div>
    </div>
  );
}

/** 可删空的数字输入框（解决输入 0 无法删除的问题） */
function ProductionInput({
  value,
  onChange,
  disabled,
  className,
  placeholder,
}: {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [str, setStr] = React.useState(value === 0 ? "" : String(value));
  // 同步外部 value 变化（如最优求解后）
  React.useEffect(() => {
    setStr(value === 0 ? "" : String(value));
  }, [value]);
  return (
    <Input
      type="number"
      min={0}
      value={str}
      onChange={(e) => {
        setStr(e.target.value);
        const parsed = parseInt(e.target.value);
        if (!isNaN(parsed)) onChange(Math.max(0, parsed));
        else if (e.target.value === "") onChange(0);
      }}
      onBlur={() => {
        const v = parseInt(str) || 0;
        setStr(v === 0 ? "" : String(v));
        onChange(v);
      }}
      disabled={disabled}
      className={className}
      placeholder={placeholder}
    />
  );
}

/** 内联约束值显示（嵌入表格单元格，借鉴 wuushuang 风格） */
function ConstraintInline({ value, sub }: { value: number; sub?: string }) {
  const status = getConstraintStatus(value);
  const icon = status === "fail" ? "⊗" : status === "warning" ? "△" : "⊙"; // 达标=⊙, 偏大=△, 超限=⊗
  const colorCls = constraintColor(value);
  return (
    <div className="flex flex-col items-center leading-tight">
      <span className={`text-xs font-mono font-semibold ${colorCls}`}>
        {icon} {value.toFixed(3)}
      </span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}
