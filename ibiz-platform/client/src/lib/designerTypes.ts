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
 * 雇佣策略模式（重构版）
 *
 * 解雇策略：所有期数固定为最低解雇，不可调
 *
 * 雇佣策略 5 种模式：
 * - 'max-hire':    最大雇佣 — 雇佣上限人数
 * - 'balance':     雇佣=解雇 — 雇佣人数等于解雇人数（即最低解雇数）
 * - 'flexible':    灵活调整 — 生产模拟中可手动输入每期雇佣人数
 * - 'range':       范围求解 — 设定雇佣范围，由求解器决定最优值
 * - 'fixed':       固定值 — 用户指定固定雇佣人数
 */
export type HiringMode = "max-hire" | "balance" | "flexible" | "range" | "fixed";

/** 单期的雇佣策略配置 */
export interface PeriodHiringConfig {
  /** 雇佣策略模式 */
  mode: HiringMode;
  /** 固定雇佣人数（仅 mode='fixed' 时有效） */
  fixedHired: number;
  /** 雇佣范围最小值（仅 mode='range' 时有效） */
  hiredRangeMin: number;
  /** 雇佣范围最大值（仅 mode='range' 时有效） */
  hiredRangeMax: number;
}

/** 创建默认雇佣策略 */
export function defaultHiringConfig(): PeriodHiringConfig {
  return {
    mode: "max-hire",
    fixedHired: 0,
    hiredRangeMin: 0,
    hiredRangeMax: 50,
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
  /** 预设算法 ID（可选，设置后模拟器中锁定算法选择） */
  algorithmId?: string;
}

/** 创建默认 8 期方案设计配置 */
export function defaultDesignPlanConfig(periods: number = 8): DesignPlanConfig {
  return {
    name: "",
    description: "",
    periodProductions: Array.from({ length: periods }, () => defaultPeriodProductionConfig()),
    periodHiring: Array.from({ length: periods }, (): PeriodHiringConfig => {
      // 默认所有期都是最大雇佣
      return { ...defaultHiringConfig(), mode: "max-hire" };
    }),
    periodMachines: Array.from({ length: periods }, () => defaultMachineConfig()),
  };
}

/**
 * 兼容旧版数据迁移：将旧的 HiringMode 映射到新的
 * 旧版: 'max-hire' | 'min-fire' | 'balance' | 'no-hire' | 'custom'
 * 新版: 'max-hire' | 'balance' | 'flexible' | 'range' | 'fixed'
 */
export function migrateHiringConfig(old: any): PeriodHiringConfig {
  if (!old || typeof old !== "object") return defaultHiringConfig();

  const mode = old.mode as string;
  switch (mode) {
    case "max-hire":
      return { ...defaultHiringConfig(), mode: "max-hire" };
    case "min-fire":
    case "no-hire":
      // 旧版"最少解雇"和"不雇佣"都映射为固定值=0
      return { ...defaultHiringConfig(), mode: "fixed", fixedHired: 0 };
    case "balance":
      return { ...defaultHiringConfig(), mode: "balance" };
    case "custom":
      // 旧版自定义有雇佣范围 → 映射为范围求解
      return {
        mode: "range",
        fixedHired: 0,
        hiredRangeMin: old.hiredRangeMin ?? 0,
        hiredRangeMax: old.hiredRangeMax ?? 50,
      };
    // 新版模式直接保留
    case "flexible":
    case "range":
    case "fixed":
      return {
        mode: mode as HiringMode,
        fixedHired: old.fixedHired ?? 0,
        hiredRangeMin: old.hiredRangeMin ?? 0,
        hiredRangeMax: old.hiredRangeMax ?? 50,
      };
    default:
      return defaultHiringConfig();
  }
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

/** 加载所有方案设计配置（含旧版数据迁移） */
export function loadDesignPlans(): (DesignPlanConfig & { id: string; createdAt: string; updatedAt: string })[] {
  try {
    const saved = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (saved) {
      const plans = JSON.parse(saved);
      // 对每个方案的雇佣配置进行迁移
      return plans.map((plan: any) => ({
        ...plan,
        periodHiring: (plan.periodHiring || []).map((h: any) => migrateHiringConfig(h)),
      }));
    }
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
