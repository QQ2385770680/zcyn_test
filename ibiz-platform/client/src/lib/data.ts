/**
 * data.ts — iBizSim 数据定义与初始值
 *
 * 包含：
 * - 产品规格参数（A/B/C/D）
 * - 每期排产数据结构
 * - 资源参数结构
 * - 约束检查结果结构
 * - 方案数据结构
 * - 颜色映射矩阵（来自 rule.xls）
 */

// ============================================================
// 1. 产品规格参数
// ============================================================

/** 单个产品的规格参数 */
export interface ProductSpec {
  /** 产品名称 */
  name: string;
  /** 机器需求（时/单位） */
  machineHours: number;
  /** 人力需求（时/单位） */
  laborHours: number;
  /** 原材料需求（单位） */
  rawMaterial: number;
}

/** 每个工作时间单位的小时数 */
export const HOURS_PER_UNIT = 520;

/** 默认产品规格参数（来自 rule.xls） */
export const DEFAULT_PRODUCTS: ProductSpec[] = [
  { name: "A", machineHours: 110, laborHours: 80, rawMaterial: 500 },
  { name: "B", machineHours: 150, laborHours: 100, rawMaterial: 800 },
  { name: "C", machineHours: 180, laborHours: 110, rawMaterial: 1600 },
  { name: "D", machineHours: 280, laborHours: 140, rawMaterial: 2500 },
];

/** 计算产品的机器系数 = machineHours / 520 */
export function getMachineCoeff(spec: ProductSpec): number {
  return spec.machineHours / HOURS_PER_UNIT;
}

/** 计算产品的人力系数 = laborHours / 520 */
export function getLaborCoeff(spec: ProductSpec): number {
  return spec.laborHours / HOURS_PER_UNIT;
}

// ============================================================
// 2. 排产数据结构
// ============================================================

/** 单个班次的四种产品产量 */
export interface ShiftProduction {
  A: number;
  B: number;
  C: number;
  D: number;
}

/** 创建空班次产量 */
export function emptyShift(): ShiftProduction {
  return { A: 0, B: 0, C: 0, D: 0 };
}

/** 单期的完整排产数据（四个班次） */
export interface PeriodProduction {
  /** 第一班（正班） */
  shift1: ShiftProduction;
  /** 一加班 */
  ot1: ShiftProduction;
  /** 第二班（正班） */
  shift2: ShiftProduction;
  /** 二加班 */
  ot2: ShiftProduction;
}

/** 创建空的单期排产数据 */
export function emptyPeriodProduction(): PeriodProduction {
  return {
    shift1: emptyShift(),
    ot1: emptyShift(),
    shift2: emptyShift(),
    ot2: emptyShift(),
  };
}

// ============================================================
// 3. 资源参数结构
// ============================================================

/** 单期的资源参数（右侧面板） */
export interface PeriodResources {
  /** 本期机器数 */
  machines: number;
  /** 本期购买机器数（用户决策） */
  machinesPurchased: number;
  /** 期初人数 */
  initialWorkers: number;
  /** 最少解雇 = ceil(期初人数 × 3%) */
  minFire: number;
  /** 本期解雇（用户决策，不得低于最少解雇） */
  fired: number;
  /** 最大雇佣 = floor(期初人数 × 50%) */
  maxHire: number;
  /** 本期雇佣（用户决策，不得超过最大雇佣） */
  hired: number;
  /** 总可用人数 = 期初人数 - 本期解雇 + 本期雇佣 × 0.25 */
  totalAvailableWorkers: number;
}

// ============================================================
// 4. 约束检查结果
// ============================================================

/** 6个约束检查点的结果 */
export interface ConstraintResults {
  /** C1: 可用人数-一班后 = 总可用人数 - 一正消耗人力 - 二正消耗人力 */
  c1_workersAfterShift1: number;
  /** C2: 可用人数-一加后 = 一正消耗人力 - 一加消耗人力 × 2 */
  c2_workersAfterOt1: number;
  /** C4: 可用人数-二加后 = 二正消耗人力 - 二加消耗人力 × 2 */
  c4_workersAfterOt2: number;
  /** C5: 可用机器-一班后 = 本期机器 - 一正消耗机器 */
  c5_machinesAfterShift1: number;
  /** C7: 可用机器-二班后 = 本期机器 - 二正消耗机器 - 一加消耗机器 × 2 */
  c7_machinesAfterShift2: number;
  /** C8: 可用机器-二加后 = 本期机器 - 二加消耗机器 × 2 */
  c8_machinesAfterOt2: number;
}

/** 约束是否全部满足（所有值 >= 0） */
export function allConstraintsSatisfied(c: ConstraintResults): boolean {
  return (
    c.c1_workersAfterShift1 >= -0.001 &&
    c.c2_workersAfterOt1 >= -0.001 &&
    c.c4_workersAfterOt2 >= -0.001 &&
    c.c5_machinesAfterShift1 >= -0.001 &&
    c.c7_machinesAfterShift2 >= -0.001 &&
    c.c8_machinesAfterOt2 >= -0.001
  );
}

// ============================================================
// 5. 单期计算结果
// ============================================================

/** 单期的完整计算结果 */
export interface PeriodResult {
  /** 期数（1-8） */
  period: number;
  /** 排产数据 */
  production: PeriodProduction;
  /** 资源参数 */
  resources: PeriodResources;
  /** 约束检查结果 */
  constraints: ConstraintResults;
  /** 各班次消耗的人力 */
  laborUsed: {
    shift1: number;
    ot1: number;
    shift2: number;
    ot2: number;
  };
  /** 各班次消耗的机器 */
  machineUsed: {
    shift1: number;
    ot1: number;
    shift2: number;
    ot2: number;
  };
  /** 总产量（各产品合计） */
  totalOutput: { A: number; B: number; C: number; D: number };
  /** 财务计算结果 */
  financials: PeriodFinancials;
}

// ============================================================
// 6. 颜色映射矩阵（来自 rule.xls）
// ============================================================

/**
 * 单元格颜色类型
 * - 'required': 黄色，必填
 * - 'optional': 金色，选填
 * - 'free': 无颜色，可选输入
 * - 'disabled': 暗色，禁区不可填
 * - 'zero': 无颜色且值为0
 */
export type CellColor = "required" | "optional" | "free" | "disabled" | "zero" | "fixed";

/** 单期的颜色映射矩阵 [产品][班次] */
export type PeriodColorMap = Record<string, Record<string, CellColor>>;

/**
 * 每期的颜色映射矩阵（来自 RULE_FORMULAS.md）
 * 键为期数 1-8，值为 { 产品: { 班次: 颜色 } }
 */
export const PERIOD_COLOR_MAPS: Record<number, PeriodColorMap> = {
  // 第1期
  1: {
    A: { shift1: "free", ot1: "required", shift2: "free", ot2: "free" },
    B: { shift1: "free", ot1: "free", shift2: "required", ot2: "optional" },
    C: { shift1: "required", ot1: "free", shift2: "free", ot2: "free" },
    D: { shift1: "required", ot1: "free", shift2: "free", ot2: "required" },
  },
  // 第2期
  2: {
    A: { shift1: "required", ot1: "required", shift2: "free", ot2: "free" },
    B: { shift1: "required", ot1: "free", shift2: "free", ot2: "free" },
    C: { shift1: "free", ot1: "free", shift2: "required", ot2: "optional" },
    D: { shift1: "free", ot1: "free", shift2: "required", ot2: "required" },
  },
  // 第3期
  3: {
    A: { shift1: "required", ot1: "optional", shift2: "free", ot2: "free" },
    B: { shift1: "required", ot1: "free", shift2: "free", ot2: "free" },
    C: { shift1: "optional", ot1: "free", shift2: "required", ot2: "required" },
    D: { shift1: "free", ot1: "free", shift2: "required", ot2: "required" },
  },
  // 第4期
  4: {
    A: { shift1: "required", ot1: "free", shift2: "free", ot2: "free" },
    B: { shift1: "required", ot1: "free", shift2: "free", ot2: "free" },
    C: { shift1: "free", ot1: "free", shift2: "required", ot2: "required" },
    D: { shift1: "free", ot1: "free", shift2: "required", ot2: "required" },
  },
  // 第5期（与第4期相同）
  5: {
    A: { shift1: "required", ot1: "free", shift2: "free", ot2: "free" },
    B: { shift1: "required", ot1: "free", shift2: "free", ot2: "free" },
    C: { shift1: "free", ot1: "free", shift2: "required", ot2: "required" },
    D: { shift1: "free", ot1: "free", shift2: "required", ot2: "required" },
  },
  // 第6-8期：所有单元格均无颜色标记
  6: {
    A: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
    B: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
    C: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
    D: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
  },
  7: {
    A: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
    B: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
    C: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
    D: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
  },
  8: {
    A: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
    B: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
    C: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
    D: { shift1: "free", ot1: "free", shift2: "free", ot2: "free" },
  },
};

// ============================================================
// 7. 财务参数
// ============================================================

/** 单个产品的财务参数 */
export interface ProductFinancials {
  /** 产品名称 */
  name: string;
  /** 销售单价（元） */
  sellingPrice: number;
  /** 原材料单价（元/单位原材料） */
  materialUnitCost: number;
}

/** 默认产品财务参数 */
export const DEFAULT_PRODUCT_FINANCIALS: ProductFinancials[] = [
  { name: "A", sellingPrice: 3500, materialUnitCost: 1 },
  { name: "B", sellingPrice: 5200, materialUnitCost: 1 },
  { name: "C", sellingPrice: 8500, materialUnitCost: 1 },
  { name: "D", sellingPrice: 14000, materialUnitCost: 1 },
];

/** 人力成本参数 */
export interface LaborCostParams {
  /** 正班工人工资（元/人/期） */
  normalWage: number;
  /** 加班工资倍率（如 1.5 表示正班的1.5倍） */
  overtimeMultiplier: number;
  /** 雇佣成本（元/人） */
  hiringCost: number;
  /** 解雇成本（元/人） */
  firingCost: number;
}

/** 默认人力成本参数 */
export const DEFAULT_LABOR_COSTS: LaborCostParams = {
  normalWage: 5000,
  overtimeMultiplier: 1.5,
  hiringCost: 3000,
  firingCost: 5000,
};

/** 机器成本参数 */
export interface MachineCostParams {
  /** 机器购买单价（元/台） */
  purchasePrice: number;
  /** 机器维护费用（元/台/期） */
  maintenanceCost: number;
}

/** 默认机器成本参数 */
export const DEFAULT_MACHINE_COSTS: MachineCostParams = {
  purchasePrice: 100000,
  maintenanceCost: 2000,
};

/** 库存成本参数 */
export interface InventoryCostParams {
  /** 库存持有成本（元/单位/期） */
  holdingCost: number;
}

/** 默认库存成本参数 */
export const DEFAULT_INVENTORY_COSTS: InventoryCostParams = {
  holdingCost: 500,
};

// ============================================================
// 8. 全局配置
// ============================================================

/** 全局配置参数 */
export interface GlobalConfig {
  /** 初始机器数量 */
  initialMachines: number;
  /** 初始工人数量 */
  initialWorkers: number;
  /** 模拟期数 */
  periods: number;
  /** 最少解雇比例（百分比，如 3 表示 3%） */
  minFireRate: number;
  /** 最大雇佣比例（百分比，如 50 表示 50%） */
  maxHireRate: number;
  /** 新工人效率（百分比，如 25 表示 25%） */
  newWorkerEfficiency: number;
  /** 产品规格参数 */
  products: ProductSpec[];
  /** 产品财务参数 */
  productFinancials: ProductFinancials[];
  /** 人力成本参数 */
  laborCosts: LaborCostParams;
  /** 机器成本参数 */
  machineCosts: MachineCostParams;
  /** 库存成本参数 */
  inventoryCosts: InventoryCostParams;
}

/** 默认全局配置 */
export const DEFAULT_CONFIG: GlobalConfig = {
  initialMachines: 157,
  initialWorkers: 113,
  periods: 8,
  minFireRate: 3,
  maxHireRate: 50,
  newWorkerEfficiency: 25,
  products: [...DEFAULT_PRODUCTS],
  productFinancials: DEFAULT_PRODUCT_FINANCIALS.map((p) => ({ ...p })),
  laborCosts: { ...DEFAULT_LABOR_COSTS },
  machineCosts: { ...DEFAULT_MACHINE_COSTS },
  inventoryCosts: { ...DEFAULT_INVENTORY_COSTS },
};

// ============================================================
// 9. 财务计算结果
// ============================================================

/** 单期的财务计算结果 */
export interface PeriodFinancials {
  /** 各产品销售收入 */
  revenue: { A: number; B: number; C: number; D: number; total: number };
  /** 原材料成本 */
  materialCost: { A: number; B: number; C: number; D: number; total: number };
  /** 人工成本（正班） */
  laborCostNormal: number;
  /** 人工成本（加班） */
  laborCostOvertime: number;
  /** 雇佣成本 */
  hiringCost: number;
  /** 解雇成本 */
  firingCost: number;
  /** 机器购买成本 */
  machinePurchaseCost: number;
  /** 机器维护成本 */
  machineMaintenanceCost: number;
  /** 库存持有成本 */
  inventoryHoldingCost: number;
  /** 总成本 */
  totalCost: number;
  /** 净利润 */
  netProfit: number;
}

// ============================================================
// 10. 方案数据结构
// ============================================================

/** 方案状态 */
export type PlanStatus = "draft" | "optimized" | "submitted";

/** 完整的方案数据 */
export interface ProductionPlan {
  /** 方案唯一 ID */
  id: string;
  /** 方案名称 */
  name: string;
  /** 方案描述 */
  description: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 方案状态 */
  status: PlanStatus;
  /** 是否收藏 */
  starred: boolean;
  /** 全局配置快照 */
  config: GlobalConfig;
  /** 各期排产数据 */
  periodProductions: PeriodProduction[];
  /** 各期资源决策（购买机器、雇佣、解雇） */
  periodDecisions: PeriodDecision[];
}

/** 单期的用户决策（资源方面） */
export interface PeriodDecision {
  /** 本期购买机器数 */
  machinesPurchased: number;
  /** 本期解雇人数 */
  fired: number;
  /** 本期雇佣人数 */
  hired: number;
}

/** 生成唯一 ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
