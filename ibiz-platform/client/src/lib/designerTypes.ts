/**
 * designerTypes.ts — 方案设计器数据类型定义
 *
 * 定义方案设计器中每期每班每产品的行为模式、求解范围、
 * 雇佣策略和机器购买策略的数据结构。
 */

// ============================================================
// 1. 产量行为模式
// ============================================================

/**
 * 产量行为模式
 * - 'required': 必填 — 求解器必须为此单元格分配产量
 * - 'optional': 选填 — 求解器可以选择是否分配产量
 * - 'blank':    不填 — 此单元格不生产（产量固定为 0）
 * - 'fixed':    固定 — 用户指定固定产量值
 */
export type ProductionMode = "required" | "optional" | "blank" | "fixed";

/** 产量求解范围 */
export interface ProductionRange {
  min: number;
  max: number;
}

/** 单个单元格（产品×班次）的配置 */
export interface CellConfig {
  /** 行为模式 */
  mode: ProductionMode;
  /** 固定值（仅 mode='fixed' 时有效） */
  fixedValue: number;
  /** 求解范围（仅 mode='required' 或 'optional' 时有效） */
  range: ProductionRange;
}

/** 创建默认单元格配置 */
export function defaultCellConfig(): CellConfig {
  return {
    mode: "optional",
    fixedValue: 0,
    range: { min: 0, max: 999 },
  };
}

/** 单个班次的四种产品配置 */
export interface ShiftConfig {
  A: CellConfig;
  B: CellConfig;
  C: CellConfig;
  D: CellConfig;
}

/** 创建默认班次配置 */
export function defaultShiftConfig(): ShiftConfig {
  return {
    A: defaultCellConfig(),
    B: defaultCellConfig(),
    C: defaultCellConfig(),
    D: defaultCellConfig(),
  };
}

/** 单期的完整产量配置（四个班次） */
export interface PeriodProductionConfig {
  /** 第一班（正班） */
  shift1: ShiftConfig;
  /** 一加班 */
  ot1: ShiftConfig;
  /** 第二班（正班） */
  shift2: ShiftConfig;
  /** 二加班 */
  ot2: ShiftConfig;
}

/** 创建默认单期产量配置 */
export function defaultPeriodProductionConfig(): PeriodProductionConfig {
  return {
    shift1: defaultShiftConfig(),
    ot1: defaultShiftConfig(),
    shift2: defaultShiftConfig(),
    ot2: defaultShiftConfig(),
  };
}

// ============================================================
// 2. 雇佣策略
// ============================================================

/**
 * 雇佣策略模式
 * - 'max-hire':    最大雇佣（快速扩张）
 * - 'min-fire':    最少解雇（维持人力）
 * - 'balance':     雇佣 = 解雇（人力平衡）
 * - 'no-hire':     不雇佣（仅解雇最少）
 * - 'custom':      自定义雇佣/解雇人数
 */
export type HiringMode = "max-hire" | "min-fire" | "balance" | "no-hire" | "custom";

/** 单期的雇佣策略配置 */
export interface PeriodHiringConfig {
  /** 雇佣策略模式 */
  mode: HiringMode;
  /** 自定义雇佣人数（仅 mode='custom' 时有效） */
  customHired: number;
  /** 自定义解雇人数（仅 mode='custom' 时有效） */
  customFired: number;
}

/** 创建默认雇佣策略 */
export function defaultHiringConfig(): PeriodHiringConfig {
  return {
    mode: "max-hire",
    customHired: 0,
    customFired: 0,
  };
}

// ============================================================
// 3. 机器购买策略
// ============================================================

/**
 * 机器购买模式
 * - 'none':   不买
 * - 'fixed':  固定数量
 * - 'range':  范围（求解器决定）
 */
export type MachinePurchaseMode = "none" | "fixed" | "range";

/** 单期的机器购买配置 */
export interface PeriodMachineConfig {
  /** 购买模式 */
  mode: MachinePurchaseMode;
  /** 固定购买数量（仅 mode='fixed' 时有效） */
  fixedCount: number;
  /** 购买范围（仅 mode='range' 时有效） */
  rangeMin: number;
  rangeMax: number;
}

/** 创建默认机器购买配置 */
export function defaultMachineConfig(): PeriodMachineConfig {
  return {
    mode: "none",
    fixedCount: 0,
    rangeMin: 0,
    rangeMax: 50,
  };
}

// ============================================================
// 4. 完整方案设计配置
// ============================================================

/** 完整的方案设计配置（8期） */
export interface DesignPlanConfig {
  /** 方案名称 */
  name: string;
  /** 方案描述 */
  description: string;
  /** 各期产量配置 */
  periodProductions: PeriodProductionConfig[];
  /** 各期雇佣策略 */
  periodHiring: PeriodHiringConfig[];
  /** 各期机器购买配置 */
  periodMachines: PeriodMachineConfig[];
}

/** 创建默认 8 期方案设计配置 */
export function defaultDesignPlanConfig(periods: number = 8): DesignPlanConfig {
  return {
    name: "",
    description: "",
    periodProductions: Array.from({ length: periods }, () => defaultPeriodProductionConfig()),
    periodHiring: Array.from({ length: periods }, (_, i) => {
      // 默认雇佣策略：P1-P3 最大雇佣，P4 不雇佣，P5-P8 平衡
      if (i < 3) return { ...defaultHiringConfig(), mode: "max-hire" as HiringMode };
      if (i === 3) return { ...defaultHiringConfig(), mode: "no-hire" as HiringMode };
      return { ...defaultHiringConfig(), mode: "balance" as HiringMode };
    }),
    periodMachines: Array.from({ length: periods }, () => defaultMachineConfig()),
  };
}

// ============================================================
// 5. 方案设计存储
// ============================================================

const DESIGN_STORAGE_KEY = "ibiz-design-plans";

/** 保存方案设计配置 */
export function saveDesignPlan(plan: DesignPlanConfig & { id: string; createdAt: string; updatedAt: string }): void {
  try {
    const plans = loadDesignPlans();
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx >= 0) {
      plans[idx] = plan;
    } else {
      plans.unshift(plan);
    }
    localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // 存储失败
  }
}

/** 加载所有方案设计配置 */
export function loadDesignPlans(): (DesignPlanConfig & { id: string; createdAt: string; updatedAt: string })[] {
  try {
    const saved = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // 解析失败
  }
  return [];
}

/** 删除方案设计配置 */
export function deleteDesignPlan(id: string): void {
  try {
    const plans = loadDesignPlans().filter(p => p.id !== id);
    localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // 存储失败
  }
}
