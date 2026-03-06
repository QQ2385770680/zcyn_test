/**
 * ProductionDesigner — 方案设计器（重构版）
 *
 * 功能：
 * - 1-8 期切换，每期每班（一班/一加/二班/二加）× 每产品（A/B/C/D）
 *   的行为模式下拉选择（必选/可选/留空/固定参数）及求解范围设置
 * - 8 期雇佣策略配置（最大雇佣/最少解雇/平衡/不雇佣/自定义）
 * - 8 期机器购买配置（不买/固定/范围）
 * - 方案保存/加载/导出
 * - 刷新保持缓存配置（localStorage 持久化当前编辑状态）
 * - 固定行为模式规则标记显示绿色"固"
 * - 已保存方案同步到我的方案
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Save,
  FolderOpen,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  Factory,
  Users,
  Package,
  Settings2,
  Sparkles,
  Copy,
  Trash2,
  Info,
  CheckCircle2,
  Grid3X3,
  Play,
} from "lucide-react";
import React from "react";

import { useConfig } from "@/lib/ConfigContext";
import { PERIOD_COLOR_MAPS, type CellColor, generateId } from "@/lib/data";
import { useDesignPlan } from "@/lib/DesignPlanContext";
import { useLocation } from "wouter";
import {
  type ProductionMode,
  type CellConfig,
  type PeriodProductionConfig,
  type PeriodHiringConfig,
  type PeriodMachineConfig,
  type HiringMode,
  type MachinePurchaseMode,
  type DesignPlanConfig,
  defaultDesignPlanConfig,
  defaultCellConfig,
  defaultHiringConfig,
  saveDesignPlan,
  loadDesignPlans,
  deleteDesignPlan,
} from "@/lib/designerTypes";

// ============================================================
// 常量
// ============================================================

const PRODUCTS = ["A", "B", "C", "D"] as const;
type ProductKey = (typeof PRODUCTS)[number];

const SHIFTS = [
  { key: "shift1" as const, label: "一班", short: "一班" },
  { key: "ot1" as const, label: "一加班", short: "一加" },
  { key: "shift2" as const, label: "二班", short: "二班" },
  { key: "ot2" as const, label: "二加班", short: "二加" },
];

const MODE_OPTIONS: { value: ProductionMode; label: string; color: string; desc: string }[] = [
  { value: "required", label: "必填", color: "bg-amber-100 text-amber-800 border-amber-300", desc: "求解器必须分配产量" },
  { value: "optional", label: "选填", color: "bg-sky-50 text-sky-700 border-sky-200", desc: "求解器可选择是否分配" },
  { value: "blank", label: "不填", color: "bg-gray-100 text-gray-500 border-gray-200", desc: "不生产，产量为 0" },
  { value: "fixed", label: "固定", color: "bg-emerald-50 text-emerald-700 border-emerald-200", desc: "用户指定固定产量" },
];

const HIRING_OPTIONS: { value: HiringMode; label: string; desc: string }[] = [
  { value: "max-hire", label: "最大雇佣", desc: "雇佣上限人数，快速扩张" },
  { value: "min-fire", label: "最少解雇", desc: "仅解雇最低要求人数" },
  { value: "balance", label: "雇佣=解雇", desc: "维持人力平衡" },
  { value: "no-hire", label: "不雇佣", desc: "仅执行最少解雇" },
  { value: "custom", label: "自定义", desc: "手动设置雇佣/解雇人数" },
];

const MACHINE_OPTIONS: { value: MachinePurchaseMode; label: string; desc: string }[] = [
  { value: "none", label: "不买", desc: "本期不购买机器" },
  { value: "fixed", label: "固定", desc: "购买固定数量机器" },
  { value: "range", label: "范围", desc: "在范围内由求解器决定" },
];

// ============================================================
// localStorage 缓存 key（当前编辑中的方案状态）
// ============================================================

const DRAFT_CACHE_KEY = "ibiz-designer-draft";
const DRAFT_PERIOD_KEY = "ibiz-designer-current-period";
const DRAFT_SECTION_KEY = "ibiz-designer-active-section";
const DRAFT_PLAN_ID_KEY = "ibiz-designer-current-plan-id";

/** 保存草稿到 localStorage */
function saveDraftToCache(plan: DesignPlanConfig, currentPlanId: string | null, currentPeriod: number, activeSection: string) {
  try {
    localStorage.setItem(DRAFT_CACHE_KEY, JSON.stringify(plan));
    localStorage.setItem(DRAFT_PERIOD_KEY, String(currentPeriod));
    localStorage.setItem(DRAFT_SECTION_KEY, activeSection);
    if (currentPlanId) {
      localStorage.setItem(DRAFT_PLAN_ID_KEY, currentPlanId);
    } else {
      localStorage.removeItem(DRAFT_PLAN_ID_KEY);
    }
  } catch {
    // 存储失败
  }
}

/** 从 localStorage 加载草稿 */
function loadDraftFromCache(periods: number): {
  plan: DesignPlanConfig | null;
  currentPlanId: string | null;
  currentPeriod: number;
  activeSection: string;
} {
  try {
    const saved = localStorage.getItem(DRAFT_CACHE_KEY);
    const period = parseInt(localStorage.getItem(DRAFT_PERIOD_KEY) || "1") || 1;
    const section = localStorage.getItem(DRAFT_SECTION_KEY) || "production";
    const planId = localStorage.getItem(DRAFT_PLAN_ID_KEY) || null;
    if (saved) {
      const parsed = JSON.parse(saved) as DesignPlanConfig;
      // 验证数据完整性
      if (parsed.periodProductions && parsed.periodHiring && parsed.periodMachines) {
        return { plan: parsed, currentPlanId: planId, currentPeriod: Math.min(period, periods), activeSection: section };
      }
    }
  } catch {
    // 解析失败
  }
  return { plan: null, currentPlanId: null, currentPeriod: 1, activeSection: "production" };
}

/** 清除草稿缓存 */
function clearDraftCache() {
  try {
    localStorage.removeItem(DRAFT_CACHE_KEY);
    localStorage.removeItem(DRAFT_PERIOD_KEY);
    localStorage.removeItem(DRAFT_SECTION_KEY);
    localStorage.removeItem(DRAFT_PLAN_ID_KEY);
  } catch {
    // 清除失败
  }
}

// ============================================================
// Toast Hook
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

export function ProductionDesigner() {
  const { config } = useConfig();
  const { showToast, ToastComponent } = useToast();
  const { applyToSimulator } = useDesignPlan();
  const [, setLocation] = useLocation();

  // 从缓存恢复草稿状态
  const cachedDraft = React.useMemo(() => loadDraftFromCache(config.periods), []);

  // 当前方案 — 优先从缓存恢复，否则初始化默认值
  const [plan, setPlan] = React.useState<DesignPlanConfig>(() => {
    if (cachedDraft.plan) return cachedDraft.plan;
    const base = defaultDesignPlanConfig(config.periods);
    // 默认所有单元格行为模式为留空
    for (let p = 0; p < config.periods; p++) {
      const period = base.periodProductions[p];
      for (const product of ["A", "B", "C", "D"] as const) {
        for (const shift of ["shift1", "ot1", "shift2", "ot2"] as const) {
          period[shift][product].mode = "blank";
        }
      }
    }
    return base;
  });
  const [currentPlanId, setCurrentPlanId] = React.useState<string | null>(cachedDraft.currentPlanId);

  // 当前选中的期数（Tab）
  const [currentPeriod, setCurrentPeriod] = React.useState(cachedDraft.currentPeriod);

  // 当前视图 Tab
  const [activeSection, setActiveSection] = React.useState(cachedDraft.activeSection);

  // 保存的方案列表
  const [savedPlans, setSavedPlans] = React.useState(() => loadDesignPlans());

  // 自动保存草稿到 localStorage（防抖）
  React.useEffect(() => {
    const timer = setTimeout(() => {
      saveDraftToCache(plan, currentPlanId, currentPeriod, activeSection);
    }, 500);
    return () => clearTimeout(timer);
  }, [plan, currentPlanId, currentPeriod, activeSection]);

  // 期数导航
  const goToPrev = () => setCurrentPeriod(p => Math.max(1, p - 1));
  const goToNext = () => setCurrentPeriod(p => Math.min(config.periods, p + 1));

  // 键盘快捷键
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 获取当前期的颜色映射（用于参考）
  const colorMap = PERIOD_COLOR_MAPS[currentPeriod] || PERIOD_COLOR_MAPS[8];

  // ============================================================
  // 产量配置更新
  // ============================================================

  const updateCellMode = (shift: keyof PeriodProductionConfig, product: ProductKey, mode: ProductionMode) => {
    setPlan(prev => {
      const next = { ...prev };
      const periods = [...next.periodProductions];
      const period = { ...periods[currentPeriod - 1] };
      const shiftConfig = { ...period[shift] };
      const cell = { ...shiftConfig[product] };
      cell.mode = mode;
      if (mode === "blank") {
        cell.fixedValue = 0;
      }
      shiftConfig[product] = cell;
      period[shift] = shiftConfig;
      periods[currentPeriod - 1] = period;
      next.periodProductions = periods;
      return next;
    });
  };

  const updateCellFixed = (shift: keyof PeriodProductionConfig, product: ProductKey, value: number) => {
    setPlan(prev => {
      const next = { ...prev };
      const periods = [...next.periodProductions];
      const period = { ...periods[currentPeriod - 1] };
      const shiftConfig = { ...period[shift] };
      const cell = { ...shiftConfig[product] };
      cell.fixedValue = Math.max(0, Math.floor(value) || 0);
      shiftConfig[product] = cell;
      period[shift] = shiftConfig;
      periods[currentPeriod - 1] = period;
      next.periodProductions = periods;
      return next;
    });
  };

  const updateCellRange = (shift: keyof PeriodProductionConfig, product: ProductKey, field: "min" | "max", value: number) => {
    setPlan(prev => {
      const next = { ...prev };
      const periods = [...next.periodProductions];
      const period = { ...periods[currentPeriod - 1] };
      const shiftConfig = { ...period[shift] };
      const cell = { ...shiftConfig[product] };
      cell.range = { ...cell.range, [field]: Math.max(0, Math.floor(value) || 0) };
      shiftConfig[product] = cell;
      period[shift] = shiftConfig;
      periods[currentPeriod - 1] = period;
      next.periodProductions = periods;
      return next;
    });
  };

  // ============================================================
  // 雇佣策略更新
  // ============================================================

  const updateHiringMode = (periodIdx: number, mode: HiringMode) => {
    setPlan(prev => {
      const next = { ...prev };
      const hiring = [...next.periodHiring];
      hiring[periodIdx] = { ...hiring[periodIdx], mode };
      next.periodHiring = hiring;
      return next;
    });
  };

  const updateHiringCustom = (periodIdx: number, field: "customHired" | "customFired", value: number) => {
    setPlan(prev => {
      const next = { ...prev };
      const hiring = [...next.periodHiring];
      hiring[periodIdx] = { ...hiring[periodIdx], [field]: Math.max(0, Math.floor(value) || 0) };
      next.periodHiring = hiring;
      return next;
    });
  };

  // ============================================================
  // 机器购买更新
  // ============================================================

  const updateMachineMode = (periodIdx: number, mode: MachinePurchaseMode) => {
    setPlan(prev => {
      const next = { ...prev };
      const machines = [...next.periodMachines];
      machines[periodIdx] = { ...machines[periodIdx], mode };
      next.periodMachines = machines;
      return next;
    });
  };

  const updateMachineValue = (periodIdx: number, field: "fixedCount" | "rangeMin" | "rangeMax", value: number) => {
    setPlan(prev => {
      const next = { ...prev };
      const machines = [...next.periodMachines];
      machines[periodIdx] = { ...machines[periodIdx], [field]: Math.max(0, Math.floor(value) || 0) };
      next.periodMachines = machines;
      return next;
    });
  };

  // ============================================================
  // 复制当前期配置到其他期
  // ============================================================

  const copyCurrentToAll = () => {
    const currentConfig = plan.periodProductions[currentPeriod - 1];
    setPlan(prev => {
      const next = { ...prev };
      next.periodProductions = prev.periodProductions.map((_, i) =>
        i === currentPeriod - 1 ? currentConfig : JSON.parse(JSON.stringify(currentConfig))
      );
      return next;
    });
    showToast(`已将第 ${currentPeriod} 期产量配置复制到所有期`);
  };

  // ============================================================
  // 根据颜色映射自动初始化
  // ============================================================

  const initFromColorMap = () => {
    setPlan(prev => {
      const next = { ...prev };
      const periods = [...next.periodProductions];
      for (let p = 0; p < config.periods; p++) {
        const period = JSON.parse(JSON.stringify(periods[p])) as PeriodProductionConfig;
        for (const product of PRODUCTS) {
          for (const shift of SHIFTS) {
            const cell = period[shift.key][product];
            cell.mode = "blank";
            cell.fixedValue = 0;
            cell.range = { min: 0, max: 999 };
          }
        }
        periods[p] = period;
      }
      next.periodProductions = periods;
      return next;
    });
    showToast("已恢复为初始值（所有期行为模式设为留空）", "info");
  };

  // ============================================================
  // 保存 / 加载 / 导出
  // ============================================================

  const handleSave = () => {
    if (!plan.name.trim()) {
      showToast("请输入方案名称", "error");
      return;
    }
    const now = new Date().toISOString();
    const trimmedName = plan.name.trim();
    // 根据方案名称判断：同名覆盖，不同名新建
    const existingByName = savedPlans.find(p => p.name === trimmedName);
    let id: string;
    let createdAt: string;
    if (existingByName && currentPlanId === existingByName.id) {
      // 当前正在编辑的方案，同名覆盖
      id = existingByName.id;
      createdAt = existingByName.createdAt;
    } else if (existingByName && !currentPlanId) {
      // 无关联 ID 但同名已存在，覆盖
      id = existingByName.id;
      createdAt = existingByName.createdAt;
    } else if (currentPlanId && existingByName && currentPlanId !== existingByName.id) {
      // 改了名字且新名字已存在于另一个方案 → 覆盖那个同名方案
      id = existingByName.id;
      createdAt = existingByName.createdAt;
    } else if (currentPlanId && !existingByName) {
      // 改了名字且新名字不存在 → 创建新方案（保留旧方案）
      id = generateId();
      createdAt = now;
    } else {
      // 全新方案
      id = generateId();
      createdAt = now;
    }
    saveDesignPlan({
      ...plan,
      id,
      createdAt,
      updatedAt: now,
    });
    setCurrentPlanId(id);
    setSavedPlans(loadDesignPlans());
    const isNew = !existingByName || (currentPlanId && currentPlanId !== existingByName.id && !existingByName);
    showToast(isNew ? `方案「${trimmedName}」已新建保存` : `方案「${trimmedName}」已更新`);
  };

  const handleLoad = (saved: ReturnType<typeof loadDesignPlans>[0]) => {
    setPlan({
      name: saved.name,
      description: saved.description,
      periodProductions: saved.periodProductions,
      periodHiring: saved.periodHiring,
      periodMachines: saved.periodMachines,
    });
    setCurrentPlanId(saved.id);
    showToast(`已加载方案「${saved.name}」`);
  };

  const handleDelete = (id: string) => {
    deleteDesignPlan(id);
    setSavedPlans(loadDesignPlans());
    if (currentPlanId === id) setCurrentPlanId(null);
    showToast("方案已删除", "info");
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ibiz-design-${plan.name || "plan"}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("方案已导出为 JSON 文件");
  };

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
          const imported = JSON.parse(ev.target?.result as string) as DesignPlanConfig;
          if (imported.periodProductions && imported.periodHiring && imported.periodMachines) {
            setPlan(imported);
            setCurrentPlanId(null);
            showToast(`已导入方案「${imported.name || "未命名"}」`);
          }
        } catch {
          showToast("导入失败：文件格式不正确", "error");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // 统计当前期各模式数量
  const currentProdConfig = plan.periodProductions[currentPeriod - 1];
  const modeStats = { required: 0, optional: 0, blank: 0, fixed: 0 };
  for (const shift of SHIFTS) {
    for (const product of PRODUCTS) {
      modeStats[currentProdConfig[shift.key][product].mode]++;
    }
  }

  return (
    <div className="space-y-5">
      {/* Actions Bar — 顶部仅保留恢复/导入/导出和进入模拟验证 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={initFromColorMap}>
            <Grid3X3 className="size-3.5" />
            恢复初始值
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleImport}>
            <Upload className="size-3.5" />
            导入
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="size-3.5" />
            导出
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
            onClick={() => {
              applyToSimulator(plan, config);
              setLocation("/production/simulator");
              showToast("正在跳转到模拟器...");
            }}
          >
            <Play className="size-3.5" />
            进入模拟验证
          </Button>
        </div>
      </div>

      {/* Basic Info — 紧凑行内布局 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Sparkles className="size-4 text-emerald-500 shrink-0" />
          <Input
            placeholder="方案名称（必填）"
            value={plan.name}
            onChange={(e) => setPlan(prev => ({ ...prev, name: e.target.value }))}
            className="h-9 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="方案描述（选填）"
            value={plan.description}
            onChange={(e) => setPlan(prev => ({ ...prev, description: e.target.value }))}
            className="h-9 text-sm text-gray-500"
          />
        </div>
        {currentPlanId && (
          <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 shrink-0">
            编辑中
          </Badge>
        )}
      </div>

      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="production" className="gap-1.5">
            <Package className="size-3.5" />
            产量配置
          </TabsTrigger>
          <TabsTrigger value="hiring" className="gap-1.5">
            <Users className="size-3.5" />
            雇佣策略
          </TabsTrigger>
          <TabsTrigger value="machines" className="gap-1.5">
            <Factory className="size-3.5" />
            机器购买
          </TabsTrigger>
        </TabsList>

        {/* ============================================================ */}
        {/* 产量配置 Tab */}
        {/* ============================================================ */}
        <TabsContent value="production" className="space-y-4 mt-4">
          {/* Period Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="size-8" onClick={goToPrev} disabled={currentPeriod <= 1}>
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: config.periods }, (_, i) => i + 1).map(p => (
                  <Button
                    key={p}
                    variant={p === currentPeriod ? "default" : "outline"}
                    size="sm"
                    className={`w-9 h-8 text-xs font-medium ${p === currentPeriod ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                    onClick={() => setCurrentPeriod(p)}
                  >
                    {p}期
                  </Button>
                ))}
              </div>
              <Button variant="outline" size="icon" className="size-8" onClick={goToNext} disabled={currentPeriod >= config.periods}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
                <Save className="size-3.5" />
                保存方案
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-gray-500" onClick={copyCurrentToAll}>
                <Copy className="size-3" />
                复制到所有期
              </Button>
            </div>
          </div>

          {/* Mode Legend */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-gray-500 font-medium">行为模式：</span>
            {MODE_OPTIONS.map(opt => (
              <TooltipProvider key={opt.value}>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className={`${opt.color} text-xs font-normal`}>
                      {opt.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent><p>{opt.desc}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            <span className="text-gray-400 ml-2">
              统计：必填 {modeStats.required} | 选填 {modeStats.optional} | 不填 {modeStats.blank} | 固定 {modeStats.fixed}
            </span>
          </div>

          {/* Production Config Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings2 className="size-4 text-gray-500" />
                第 {currentPeriod} 期 — 产量行为配置
              </CardTitle>
              <CardDescription className="text-xs">
                为每个班次×产品设置行为模式和求解范围。颜色参考来自规则表。
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/80">
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-20">班次</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-16">产品</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-14">规则</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-28">行为模式</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600">参数设置</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHIFTS.map((shift, shiftIdx) => (
                      <React.Fragment key={shift.key}>
                        {PRODUCTS.map((product, prodIdx) => {
                          const cell = currentProdConfig[shift.key][product];
                          // 规则标记根据当前行为模式动态变化
                          const ruleColor: CellColor = cell.mode === "required" ? "required" : cell.mode === "optional" ? "optional" : cell.mode === "blank" ? "zero" : cell.mode === "fixed" ? "fixed" : "free";
                          const isFirstInGroup = prodIdx === 0;
                          return (
                            <tr
                              key={`${shift.key}-${product}`}
                              className={`border-b last:border-b-0 hover:bg-gray-50/50 transition-colors ${isFirstInGroup && shiftIdx > 0 ? "border-t-2 border-t-gray-200" : ""}`}
                            >
                              {isFirstInGroup && (
                                <td className="px-3 py-2 font-medium text-gray-700 align-top" rowSpan={4}>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-8 rounded-full ${shift.key.startsWith("ot") ? "bg-orange-300" : "bg-emerald-400"}`} />
                                    <span className="text-xs">{shift.label}</span>
                                  </div>
                                </td>
                              )}
                              <td className="px-3 py-2">
                                <Badge variant="outline" className="text-xs font-semibold w-7 justify-center">
                                  {product}
                                </Badge>
                              </td>
                              <td className="px-3 py-2">
                                <RuleColorBadge color={ruleColor} />
                              </td>
                              <td className="px-3 py-2">
                                <Select
                                  value={cell.mode}
                                  onValueChange={(v) => updateCellMode(shift.key, product, v as ProductionMode)}
                                >
                                  <SelectTrigger className="h-8 text-xs w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MODE_OPTIONS.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        <span className="flex items-center gap-1.5">
                                          <span className={`w-2 h-2 rounded-full ${opt.value === "required" ? "bg-amber-500" : opt.value === "optional" ? "bg-sky-400" : opt.value === "blank" ? "bg-gray-300" : "bg-emerald-500"}`} />
                                          {opt.label}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-3 py-2">
                                <CellParamEditor
                                  cell={cell}
                                  onFixedChange={(v) => updateCellFixed(shift.key, product, v)}
                                  onRangeChange={(f, v) => updateCellRange(shift.key, product, f, v)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================ */}
        {/* 雇佣策略 Tab */}
        {/* ============================================================ */}
        <TabsContent value="hiring" className="space-y-4 mt-4">
          {/* 保存方案按钮 */}
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
              <Save className="size-3.5" />
              保存方案
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="size-4 text-blue-500" />
                1-8 期雇佣策略
              </CardTitle>
              <CardDescription className="text-xs">
                为每期设置雇佣/解雇策略。最少解雇率：{config.minFireRate}%，最大雇佣率：{config.maxHireRate}%
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/80">
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-16">期数</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-36">策略模式</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600">参数设置</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-28">说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: config.periods }, (_, i) => {
                      const h = plan.periodHiring[i];
                      const opt = HIRING_OPTIONS.find(o => o.value === h.mode);
                      return (
                        <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className="text-xs font-semibold w-10 justify-center">
                              {i + 1}期
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <Select
                              value={h.mode}
                              onValueChange={(v) => updateHiringMode(i, v as HiringMode)}
                            >
                              <SelectTrigger className="h-8 text-xs w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {HIRING_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2.5">
                            {h.mode === "custom" ? (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-500 w-8 shrink-0">雇佣</span>
                                  <Input
                                    type="number"
                                    className="h-7 w-16 text-xs text-center"
                                    value={h.hiredRangeMin ?? 0}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setPlan(prev => {
                                        const next = { ...prev };
                                        const hiring = [...next.periodHiring];
                                        hiring[i] = { ...hiring[i], hiredRangeMin: val };
                                        next.periodHiring = hiring;
                                        return next;
                                      });
                                    }}
                                    placeholder="0"
                                    min={0}
                                  />
                                  <span className="text-xs text-gray-400">~</span>
                                  <Input
                                    type="number"
                                    className="h-7 w-16 text-xs text-center"
                                    value={h.hiredRangeMax ?? 50}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setPlan(prev => {
                                        const next = { ...prev };
                                        const hiring = [...next.periodHiring];
                                        hiring[i] = { ...hiring[i], hiredRangeMax: val };
                                        next.periodHiring = hiring;
                                        return next;
                                      });
                                    }}
                                    placeholder="50"
                                    min={0}
                                  />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-500 w-8 shrink-0">解雇</span>
                                  <Input
                                    type="number"
                                    className="h-7 w-16 text-xs text-center"
                                    value={h.firedRangeMin ?? 0}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setPlan(prev => {
                                        const next = { ...prev };
                                        const hiring = [...next.periodHiring];
                                        hiring[i] = { ...hiring[i], firedRangeMin: val };
                                        next.periodHiring = hiring;
                                        return next;
                                      });
                                    }}
                                    placeholder="0"
                                    min={0}
                                  />
                                  <span className="text-xs text-gray-400">~</span>
                                  <Input
                                    type="number"
                                    className="h-7 w-16 text-xs text-center"
                                    value={h.firedRangeMax ?? 20}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setPlan(prev => {
                                        const next = { ...prev };
                                        const hiring = [...next.periodHiring];
                                        hiring[i] = { ...hiring[i], firedRangeMax: val };
                                        next.periodHiring = hiring;
                                        return next;
                                      });
                                    }}
                                    placeholder="20"
                                    min={0}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs text-gray-400">{opt?.desc}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Batch Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
              setPlan(prev => ({
                ...prev,
                periodHiring: prev.periodHiring.map(() => ({ ...defaultHiringConfig(), mode: "max-hire" as HiringMode })),
              }));
              showToast("已将所有期设为「最大雇佣」", "info");
            }}>
              全部最大雇佣
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
              setPlan(prev => ({
                ...prev,
                periodHiring: prev.periodHiring.map(() => ({ ...defaultHiringConfig(), mode: "balance" as HiringMode })),
              }));
              showToast("已将所有期设为「雇佣=解雇」", "info");
            }}>
              全部平衡
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
              setPlan(prev => ({
                ...prev,
                periodHiring: defaultDesignPlanConfig(config.periods).periodHiring,
              }));
              showToast("已恢复默认雇佣策略（P1-3 最大雇佣，P4 不雇佣，P5-8 平衡）", "info");
            }}>
              恢复默认
            </Button>
          </div>
        </TabsContent>

        {/* ============================================================ */}
        {/* 机器购买 Tab */}
        {/* ============================================================ */}
        <TabsContent value="machines" className="space-y-4 mt-4">
          {/* 保存方案按钮 */}
          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
              <Save className="size-3.5" />
              保存方案
            </Button>
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Factory className="size-4 text-purple-500" />
                1-8 期机器购买策略
              </CardTitle>
              <CardDescription className="text-xs">
                为每期设置机器购买策略。购买后两期到货。
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/80">
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-16">期数</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-28">购买模式</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600">参数设置</th>
                      <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-28">到货期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: config.periods }, (_, i) => {
                      const m = plan.periodMachines[i];
                      const arrivalPeriod = i + 3; // 两期后到货
                      return (
                        <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-2.5">
                            <Badge variant="outline" className="text-xs font-semibold w-10 justify-center">
                              {i + 1}期
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <Select
                              value={m.mode}
                              onValueChange={(v) => updateMachineMode(i, v as MachinePurchaseMode)}
                            >
                              <SelectTrigger className="h-8 text-xs w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MACHINE_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2.5">
                            {m.mode === "fixed" ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500">数量</span>
                                <Input
                                  type="number"
                                  className="h-7 w-20 text-xs"
                                  value={m.fixedCount || ""}
                                  onChange={(e) => updateMachineValue(i, "fixedCount", parseInt(e.target.value))}
                                  placeholder="0"
                                  min={0}
                                />
                                <span className="text-xs text-gray-400">台</span>
                              </div>
                            ) : m.mode === "range" ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-500">范围</span>
                                <Input
                                  type="number"
                                  className="h-7 w-16 text-xs"
                                  value={m.rangeMin || ""}
                                  onChange={(e) => updateMachineValue(i, "rangeMin", parseInt(e.target.value))}
                                  placeholder="0"
                                  min={0}
                                />
                                <span className="text-xs text-gray-400">~</span>
                                <Input
                                  type="number"
                                  className="h-7 w-16 text-xs"
                                  value={m.rangeMax || ""}
                                  onChange={(e) => updateMachineValue(i, "rangeMax", parseInt(e.target.value))}
                                  placeholder="50"
                                  min={0}
                                />
                                <span className="text-xs text-gray-400">台</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {m.mode !== "none" && arrivalPeriod <= config.periods ? (
                              <span className="text-xs text-emerald-600 font-medium">→ 第 {arrivalPeriod} 期到货</span>
                            ) : m.mode !== "none" && arrivalPeriod > config.periods ? (
                              <span className="text-xs text-orange-500">超出模拟期</span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
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

          {/* Batch Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
              setPlan(prev => ({
                ...prev,
                periodMachines: prev.periodMachines.map(() => ({ mode: "none" as MachinePurchaseMode, fixedCount: 0, rangeMin: 0, rangeMax: 50 })),
              }));
              showToast("已将所有期设为「不买」", "info");
            }}>
              全部不买
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Saved Plans */}
      {savedPlans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FolderOpen className="size-4 text-gray-500" />
              已保存的方案 ({savedPlans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedPlans.map(sp => (
                <div
                  key={sp.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${currentPlanId === sp.id ? "border-emerald-300 bg-emerald-50/50" : "border-gray-100 hover:bg-gray-50/50"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">{sp.name}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(sp.updatedAt).toLocaleString("zh-CN")}
                      {sp.description && ` · ${sp.description}`}
                    </div>
                  </div>
                  <div className="flex gap-1.5 ml-3">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleLoad(sp)}>
                      加载
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600" onClick={() => handleDelete(sp.id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {ToastComponent}
    </div>
  );
}

// ============================================================
// 子组件：规则颜色标记（新增 fixed 类型：绿色"固"）
// ============================================================

function RuleColorBadge({ color }: { color: CellColor }) {
  const styles: Record<CellColor, { bg: string; label: string }> = {
    required: { bg: "bg-amber-400", label: "必" },
    optional: { bg: "bg-sky-400", label: "选" },
    free: { bg: "bg-white border border-gray-300", label: "自" },
    disabled: { bg: "bg-gray-400", label: "禁" },
    zero: { bg: "bg-gray-200", label: "0" },
    fixed: { bg: "bg-emerald-500", label: "固" },
  };
  const s = styles[color] || styles.free;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white ${s.bg}`}>
            {s.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">规则表标记：{color === "fixed" ? "固定值" : color}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================
// 子组件：单元格参数编辑器
// ============================================================

function CellParamEditor({
  cell,
  onFixedChange,
  onRangeChange,
}: {
  cell: CellConfig;
  onFixedChange: (v: number) => void;
  onRangeChange: (field: "min" | "max", v: number) => void;
}) {
  if (cell.mode === "blank") {
    return <span className="text-xs text-gray-300">产量 = 0</span>;
  }

  if (cell.mode === "fixed") {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">固定值</span>
        <Input
          type="number"
          className="h-7 w-20 text-xs"
          value={cell.fixedValue || ""}
          onChange={(e) => onFixedChange(parseInt(e.target.value))}
          placeholder="0"
          min={0}
        />
      </div>
    );
  }

  // required / optional: 显示范围
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-500">范围</span>
      <Input
        type="number"
        className="h-7 w-16 text-xs"
        value={cell.range.min || ""}
        onChange={(e) => onRangeChange("min", parseInt(e.target.value))}
        placeholder="0"
        min={0}
      />
      <span className="text-xs text-gray-400">~</span>
      <Input
        type="number"
        className="h-7 w-16 text-xs"
        value={cell.range.max || ""}
        onChange={(e) => onRangeChange("max", parseInt(e.target.value))}
        placeholder="999"
        min={0}
      />
    </div>
  );
}
