/**
 * solver.ts — iBizSim 多算法求解器（v3 三档架构）
 *
 * 三种求解模式：
 * - greedy（快速）：系数加权贪心，按单位资源消耗排序优先填满
 * - ilp（标准/默认）：全班次联合整数线性规划，一次性求解单期16变量全局最优
 * - annealing（探索）：模拟退火，随机扰动搜索，可发现非直觉组合
 *
 * 班次求解顺序（greedy 模式）：一班 → 二班 → 一加 → 二加
 *
 * 约束公式（来自 engine.ts）：
 * C1: totalAvailableWorkers - laborShift1 - laborShift2  ≥ 0
 * C2: laborShift1 - laborOt1 × 2                        ≥ 0
 * C4: laborShift2 - laborOt2 × 2                        ≥ 0
 * C5: machines - machineShift1                           ≥ 0
 * C7: machines - machineShift2 - machineOt1 × 2         ≥ 0
 * C8: machines - machineOt2 × 2                         ≥ 0
 */

import type {
  PeriodProduction,
  PeriodDecision,
  GlobalConfig,
  PeriodResources,
  ShiftProduction,
} from "./data";
import {
  emptyPeriodProduction,
  emptyShift,
  PERIOD_COLOR_MAPS,
  getLaborCoeff,
  getMachineCoeff,
} from "./data";
import { calcPeriodResources, calcConstraints } from "./engine";
import type {
  DesignPlanConfig,
  CellConfig,
  PeriodHiringConfig,
  PeriodMachineConfig,
} from "./designerTypes";
import solver from "javascript-lp-solver";

// ============================================================
// 类型定义
// ============================================================

type ShiftKey = "shift1" | "ot1" | "shift2" | "ot2";
type ProductKey = "A" | "B" | "C" | "D";

const PRODUCTS: ProductKey[] = ["A", "B", "C", "D"];
const SHIFTS: ShiftKey[] = ["shift1", "shift2", "ot1", "ot2"];
const PRODUCT_INDEX: Record<ProductKey, number> = { A: 0, B: 1, C: 2, D: 3 };

/** 求解算法模式 */
export type SolverMode = "greedy" | "ilp" | "annealing";

/** 算法模式描述 */
export const SOLVER_MODE_INFO: Record<SolverMode, { label: string; description: string }> = {
  greedy: {
    label: "快速模式",
    description: "系数加权贪心：按资源消耗效率排序，优先填满低系数产品。速度极快，追求最大总产量，但产品均衡性较差。",
  },
  ilp: {
    label: "标准模式",
    description: "全局线性规划：对每期16个变量（4班次×4产品）建立统一LP模型，6个约束同时求解，保证单期全局最优。",
  },
  annealing: {
    label: "探索模式",
    description: "模拟退火搜索：从初始解出发随机扰动，可发现非直觉的优秀组合。结果可能每次略有不同。",
  },
};

/** 单元格求解信息 */
interface CellInfo {
  product: ProductKey;
  shift: ShiftKey;
  mode: "required" | "optional" | "blank" | "fixed";
  fixedValue: number;
  rangeMin: number;
  rangeMax: number;
  laborCoeff: number;
  machineCoeff: number;
}

/** 求解结果 */
export interface SolverResult {
  productions: PeriodProduction[];
  decisions: PeriodDecision[];
  /** 求解耗时（ms） */
  elapsed: number;
  /** 使用的算法模式 */
  mode: SolverMode;
  /** 各期约束残差 */
  residuals: Array<{
    period: number;
    c1: number; c2: number; c4: number;
    c5: number; c7: number; c8: number;
  }>;
  /** 产品均衡指标 */
  balance: {
    abDiff: number;
    cdDiff: number;
  };
}

// ============================================================
// 工具函数（共享）
// ============================================================

/** 获取单元格的求解信息 */
function getCellInfo(
  product: ProductKey,
  shift: ShiftKey,
  period: number,
  config: GlobalConfig,
  designConfig?: DesignPlanConfig | null,
): CellInfo {
  const pIdx = PRODUCT_INDEX[product];
  const spec = config.products[pIdx];
  const laborCoeff = getLaborCoeff(spec);
  const machineCoeff = getMachineCoeff(spec);

  let mode: CellInfo["mode"] = "optional";
  let fixedValue = 0;
  let rangeMin = 0;
  let rangeMax = 999;

  if (designConfig) {
    const periodConfig = designConfig.periodProductions[period - 1];
    if (periodConfig) {
      const cellCfg: CellConfig = periodConfig[shift][product];
      mode = cellCfg.mode;
      fixedValue = cellCfg.fixedValue;
      rangeMin = cellCfg.range.min;
      rangeMax = cellCfg.range.max;
    }
  } else {
    const colorMap = PERIOD_COLOR_MAPS[period] || PERIOD_COLOR_MAPS[8];
    const cellColor = colorMap[product]?.[shift];
    if (cellColor === "disabled" || cellColor === "zero") {
      mode = "blank";
    } else if (cellColor === "required") {
      mode = "required";
    } else if (cellColor === "optional") {
      mode = "optional";
    } else if (cellColor === "fixed") {
      mode = "fixed";
    } else {
      mode = "optional";
    }
  }

  return { product, shift, mode, fixedValue, rangeMin, rangeMax, laborCoeff, machineCoeff };
}

/** 收集某个班次的所有活跃单元格（非 blank） */
function getShiftCells(
  shift: ShiftKey,
  period: number,
  config: GlobalConfig,
  designConfig?: DesignPlanConfig | null,
): CellInfo[] {
  const cells: CellInfo[] = [];
  for (const product of PRODUCTS) {
    const info = getCellInfo(product, shift, period, config, designConfig);
    if (info.mode !== "blank") {
      cells.push(info);
    }
  }
  return cells;
}

/** 收集所有班次的所有活跃单元格 */
function getAllCells(
  period: number,
  config: GlobalConfig,
  designConfig?: DesignPlanConfig | null,
): CellInfo[] {
  const cells: CellInfo[] = [];
  for (const shift of SHIFTS) {
    for (const product of PRODUCTS) {
      const info = getCellInfo(product, shift, period, config, designConfig);
      if (info.mode !== "blank") {
        cells.push(info);
      }
    }
  }
  return cells;
}

/** 将 CellInfo 数组的产量结果写入 PeriodProduction */
function cellsToProduction(
  cells: CellInfo[],
  values: Record<string, number>,
): PeriodProduction {
  const production = emptyPeriodProduction();
  for (const cell of cells) {
    const key = `${cell.shift}_${cell.product}`;
    const val = values[key];
    if (val !== undefined && val > 0) {
      (production[cell.shift] as unknown as Record<string, number>)[cell.product] = Math.floor(val);
    }
  }
  return production;
}

// ============================================================
// 算法一：加权贪心（Weighted Greedy）— 快速模式
// ============================================================

/**
 * 加权贪心分配：按系数升序排列产品，优先填满低系数产品
 * 比 Round-Robin 更高效地利用资源
 */
function allocateWeightedGreedy(
  cells: CellInfo[],
  primaryCap: number,
  primaryCoeffKey: "laborCoeff" | "machineCoeff",
  primaryMul: number = 1,
  secondaryCap?: number,
  secondaryCoeffKey?: "laborCoeff" | "machineCoeff",
  secondaryMul?: number,
): Record<ProductKey, number> {
  const result: Record<ProductKey, number> = { A: 0, B: 0, C: 0, D: 0 };
  let remPrimary = primaryCap;
  let remSecondary = secondaryCap ?? Infinity;

  // 第一遍：处理 fixed 值和 required 的最小值
  for (const cell of cells) {
    let qty = 0;
    if (cell.mode === "fixed") {
      qty = cell.fixedValue;
    } else if (cell.mode === "required" && cell.rangeMin > 0) {
      qty = cell.rangeMin;
    }
    if (qty > 0) {
      result[cell.product] = qty;
      remPrimary -= qty * cell[primaryCoeffKey] * primaryMul;
      if (secondaryCoeffKey) {
        remSecondary -= qty * cell[secondaryCoeffKey] * (secondaryMul ?? 1);
      }
    }
  }

  // 过滤掉 fixed 的单元格
  const adjustable = cells.filter(c => c.mode !== "fixed");
  if (adjustable.length === 0) return result;

  // 按主约束系数升序排列（系数越小 = 单位资源产出越多）
  const sorted = [...adjustable].sort(
    (a, b) => a[primaryCoeffKey] * primaryMul - b[primaryCoeffKey] * primaryMul
  );

  // 依次填满每个产品到上限
  for (const cell of sorted) {
    const current = result[cell.product];
    const maxQty = cell.rangeMax - current;
    if (maxQty <= 0) continue;

    const pCostPer = cell[primaryCoeffKey] * primaryMul;
    const sCostPer = secondaryCoeffKey ? cell[secondaryCoeffKey] * (secondaryMul ?? 1) : 0;

    // 计算在两个约束下最多能生产多少
    let canProduce = maxQty;
    if (pCostPer > 0.001) {
      canProduce = Math.min(canProduce, Math.floor(remPrimary / pCostPer));
    }
    if (sCostPer > 0.001) {
      canProduce = Math.min(canProduce, Math.floor(remSecondary / sCostPer));
    }
    canProduce = Math.max(0, canProduce);

    if (canProduce > 0) {
      result[cell.product] = current + canProduce;
      remPrimary -= canProduce * pCostPer;
      remSecondary -= canProduce * sCostPer;
    }
  }

  return result;
}

/**
 * 加权贪心单期产量求解
 * 求解顺序：一班 → 二班 → 一加 → 二加
 */
function solveGreedyPeriod(
  resources: PeriodResources,
  config: GlobalConfig,
  period: number,
  designConfig?: DesignPlanConfig | null,
): PeriodProduction {
  const production = emptyPeriodProduction();
  const products = config.products;

  // Step 1: shift1（一班）— 主约束 C5（机器），副约束 C1（人力）
  {
    const cells = getShiftCells("shift1", period, config, designConfig);
    const allocated = allocateWeightedGreedy(
      cells, resources.machines, "machineCoeff", 1,
      resources.totalAvailableWorkers, "laborCoeff", 1,
    );
    for (const p of PRODUCTS) production.shift1[p] = allocated[p];
  }

  const shift1Labor = PRODUCTS.reduce(
    (s, p) => s + production.shift1[p] * getLaborCoeff(products[PRODUCT_INDEX[p]]), 0
  );

  // Step 2: shift2（二班）— 主约束 C1 剩余人力，副约束机器
  {
    const remainingLabor = resources.totalAvailableWorkers - shift1Labor;
    const cells = getShiftCells("shift2", period, config, designConfig);
    const allocated = allocateWeightedGreedy(
      cells, remainingLabor, "laborCoeff", 1,
      resources.machines, "machineCoeff", 1,
    );
    for (const p of PRODUCTS) production.shift2[p] = allocated[p];
  }

  const shift2Labor = PRODUCTS.reduce(
    (s, p) => s + production.shift2[p] * getLaborCoeff(products[PRODUCT_INDEX[p]]), 0
  );
  const shift2Machine = PRODUCTS.reduce(
    (s, p) => s + production.shift2[p] * getMachineCoeff(products[PRODUCT_INDEX[p]]), 0
  );

  // Step 3: ot1（一加）— 主约束 C7（机器），副约束 C2（一班人力/2）
  {
    const remainingMachineForOt1 = resources.machines - shift2Machine;
    const cells = getShiftCells("ot1", period, config, designConfig);
    const allocated = allocateWeightedGreedy(
      cells, remainingMachineForOt1, "machineCoeff", 2,
      shift1Labor, "laborCoeff", 2,
    );
    for (const p of PRODUCTS) production.ot1[p] = allocated[p];
  }

  // Step 4: ot2（二加）— 主约束 C8（机器），副约束 C4（二班人力/2）
  {
    const cells = getShiftCells("ot2", period, config, designConfig);
    const allocated = allocateWeightedGreedy(
      cells, resources.machines, "machineCoeff", 2,
      shift2Labor, "laborCoeff", 2,
    );
    for (const p of PRODUCTS) production.ot2[p] = allocated[p];
  }

  return production;
}

// ============================================================
// 算法二：全局整数线性规划（ILP）— 标准模式
// ============================================================

/**
 * ILP 单期产量求解
 *
 * 将一期内 16 个产量变量（4 班次 × 4 产品）建立统一 LP 模型，
 * 6 个约束全部纳入，一次性求出全局最优解。
 *
 * 变量命名：shift1_A, shift1_B, ..., ot2_D
 * 目标函数：max Σ所有产量（总产量最大化）
 */
function solveILPPeriod(
  resources: PeriodResources,
  config: GlobalConfig,
  period: number,
  designConfig?: DesignPlanConfig | null,
): PeriodProduction {
  const allCells = getAllCells(period, config, designConfig);

  // 如果没有活跃单元格，返回空产量
  if (allCells.length === 0) return emptyPeriodProduction();

  // 构建 LP 模型
  const variables: Record<string, Record<string, number>> = {};
  const ints: Record<string, boolean> = {};
  const constraints: Record<string, { max?: number; min?: number }> = {};

  // 定义约束
  // C1: laborShift1 + laborShift2 ≤ totalAvailableWorkers
  constraints["C1_labor"] = { max: resources.totalAvailableWorkers };
  // C5: machineShift1 ≤ machines
  constraints["C5_machine_s1"] = { max: resources.machines };
  // C7: machineShift2 + machineOt1 × 2 ≤ machines
  constraints["C7_machine_s2_ot1"] = { max: resources.machines };
  // C8: machineOt2 × 2 ≤ machines
  constraints["C8_machine_ot2"] = { max: resources.machines };
  // C2: laborOt1 × 2 ≤ laborShift1  →  laborOt1 × 2 - laborShift1 ≤ 0
  // 用辅助约束：C2_link
  constraints["C2_link"] = { max: 0 };
  // C4: laborOt2 × 2 ≤ laborShift2  →  laborOt2 × 2 - laborShift2 ≤ 0
  constraints["C4_link"] = { max: 0 };

  // 为每个活跃单元格定义变量
  for (const cell of allCells) {
    const varName = `${cell.shift}_${cell.product}`;

    if (cell.mode === "fixed") {
      // 固定值：用 min = max = fixedValue 约束
      constraints[`fix_${varName}`] = { min: cell.fixedValue, max: cell.fixedValue };
      variables[varName] = {
        output: 1,
        [`fix_${varName}`]: 1,
      };
    } else {
      // range 约束
      if (cell.rangeMin > 0) {
        constraints[`min_${varName}`] = { min: cell.rangeMin };
      }
      constraints[`max_${varName}`] = { max: cell.rangeMax };

      variables[varName] = {
        output: 1,
        ...(cell.rangeMin > 0 ? { [`min_${varName}`]: 1 } : {}),
        [`max_${varName}`]: 1,
      };
    }

    // 添加约束系数
    const v = variables[varName];

    // C1: 一班和二班的人力消耗
    if (cell.shift === "shift1" || cell.shift === "shift2") {
      v["C1_labor"] = cell.laborCoeff;
    }

    // C5: 一班机器消耗
    if (cell.shift === "shift1") {
      v["C5_machine_s1"] = cell.machineCoeff;
    }

    // C7: 二班机器 + 一加机器×2
    if (cell.shift === "shift2") {
      v["C7_machine_s2_ot1"] = cell.machineCoeff;
    }
    if (cell.shift === "ot1") {
      v["C7_machine_s2_ot1"] = cell.machineCoeff * 2;
    }

    // C8: 二加机器×2
    if (cell.shift === "ot2") {
      v["C8_machine_ot2"] = cell.machineCoeff * 2;
    }

    // C2_link: ot1人力×2 - shift1人力 ≤ 0
    if (cell.shift === "ot1") {
      v["C2_link"] = cell.laborCoeff * 2;
    }
    if (cell.shift === "shift1") {
      v["C2_link"] = -(cell.laborCoeff);
    }

    // C4_link: ot2人力×2 - shift2人力 ≤ 0
    if (cell.shift === "ot2") {
      v["C4_link"] = cell.laborCoeff * 2;
    }
    if (cell.shift === "shift2") {
      v["C4_link"] = -(cell.laborCoeff);
    }

    // 整数约束
    ints[varName] = true;
  }

  const model = {
    optimize: "output",
    opType: "max" as const,
    constraints,
    variables,
    ints,
  };

  try {
    const result = solver.Solve(model);

    const res = result as Record<string, number | boolean | undefined>;
    if (res && res.feasible) {
      const production = emptyPeriodProduction();
      for (const cell of allCells) {
        const varName = `${cell.shift}_${cell.product}`;
        const val = (result as Record<string, number | boolean | undefined>)[varName];
        if (typeof val === "number" && val > 0) {
          (production[cell.shift] as unknown as Record<string, number>)[cell.product] = Math.floor(val);
        }
      }
      return production;
    }
  } catch (e) {
    console.warn("[ILP Solver] 求解失败，回退到贪心模式:", e);
  }

  // ILP 求解失败时回退到贪心
  return solveGreedyPeriod(resources, config, period, designConfig);
}

// ============================================================
// 算法三：模拟退火（Simulated Annealing）— 探索模式
// ============================================================

/**
 * 检查产量方案是否满足所有约束
 */
function checkFeasibility(
  production: PeriodProduction,
  resources: PeriodResources,
  config: GlobalConfig,
): boolean {
  const cs = calcConstraints(production, resources, config.products);
  return (
    cs.c1_workersAfterShift1 >= -0.001 &&
    cs.c2_workersAfterOt1 >= -0.001 &&
    cs.c4_workersAfterOt2 >= -0.001 &&
    cs.c5_machinesAfterShift1 >= -0.001 &&
    cs.c7_machinesAfterShift2 >= -0.001 &&
    cs.c8_machinesAfterOt2 >= -0.001
  );
}

/**
 * 计算产量方案的目标函数值（总产量）
 */
function calcObjective(production: PeriodProduction): number {
  let total = 0;
  for (const shift of SHIFTS) {
    for (const p of PRODUCTS) {
      total += (production[shift] as unknown as Record<string, number>)[p] || 0;
    }
  }
  return total;
}

/**
 * 简单伪随机数生成器（确保可重复性）
 */
function createRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * 模拟退火单期产量求解
 *
 * 从贪心解出发，随机扰动搜索更优解
 */
function solveAnnealingPeriod(
  resources: PeriodResources,
  config: GlobalConfig,
  period: number,
  designConfig?: DesignPlanConfig | null,
): PeriodProduction {
  const allCells = getAllCells(period, config, designConfig);
  const adjustableCells = allCells.filter(c => c.mode !== "fixed");

  // 如果没有可调单元格，直接用贪心
  if (adjustableCells.length === 0) {
    return solveGreedyPeriod(resources, config, period, designConfig);
  }

  // 初始解：用 ILP 结果作为起点（比贪心更好的起点）
  let current = solveILPPeriod(resources, config, period, designConfig);
  let currentScore = calcObjective(current);
  let best = structuredClone(current);
  let bestScore = currentScore;

  // 模拟退火参数
  const T0 = 50;
  const coolingRate = 0.97;
  const iterations = 1500;
  let temperature = T0;

  // 使用期数作为种子，保证同期结果相对稳定
  const rng = createRNG(period * 12345 + 67890);

  for (let iter = 0; iter < iterations; iter++) {
    // 随机选择一个可调单元格
    const cellIdx = Math.floor(rng() * adjustableCells.length);
    const cell = adjustableCells[cellIdx];

    // 当前值
    const currentVal = (current[cell.shift] as unknown as Record<string, number>)[cell.product] || 0;

    // 随机扰动：±1 或 ±2
    const delta = rng() < 0.7 ? (rng() < 0.5 ? 1 : -1) : (rng() < 0.5 ? 2 : -2);
    const newVal = currentVal + delta;

    // 检查范围约束
    if (newVal < cell.rangeMin || newVal > cell.rangeMax || newVal < 0) continue;

    // 创建新方案
    const candidate = structuredClone(current);
    (candidate[cell.shift] as unknown as Record<string, number>)[cell.product] = newVal;

    // 检查可行性
    if (!checkFeasibility(candidate, resources, config)) continue;

    // 计算目标函数
    const candidateScore = calcObjective(candidate);
    const deltaE = candidateScore - currentScore;

    // 接受准则：更优则接受，更差则以概率接受
    if (deltaE > 0 || rng() < Math.exp(deltaE / temperature)) {
      current = candidate;
      currentScore = candidateScore;

      if (currentScore > bestScore) {
        best = structuredClone(current);
        bestScore = currentScore;
      }
    }

    // 降温
    temperature *= coolingRate;
  }

  return best;
}

// ============================================================
// 统一的单期产量求解入口
// ============================================================

/**
 * 根据模式选择对应的单期产量求解算法
 */
function solvePeriodProduction(
  resources: PeriodResources,
  config: GlobalConfig,
  period: number,
  designConfig?: DesignPlanConfig | null,
  mode: SolverMode = "ilp",
): PeriodProduction {
  switch (mode) {
    case "greedy":
      return solveGreedyPeriod(resources, config, period, designConfig);
    case "ilp":
      return solveILPPeriod(resources, config, period, designConfig);
    case "annealing":
      return solveAnnealingPeriod(resources, config, period, designConfig);
    default:
      return solveILPPeriod(resources, config, period, designConfig);
  }
}

// ============================================================
// 资源决策求解（共享，与算法模式无关）
// ============================================================

/**
 * 求解雇佣决策（非 range 模式）
 */
function solveHiringDecision(
  period: number,
  initialWorkers: number,
  config: GlobalConfig,
  hiringConfig?: PeriodHiringConfig,
): { hired: number; fired: number } {
  const minFire = Math.ceil(initialWorkers * (config.minFireRate / 100));
  const maxHire = Math.floor(initialWorkers * (config.maxHireRate / 100));
  const fired = minFire;

  if (!hiringConfig) {
    return { hired: maxHire, fired };
  }

  switch (hiringConfig.mode) {
    case "max-hire":
      return { hired: maxHire, fired };
    case "balance":
      return { hired: minFire, fired };
    case "flexible":
      return { hired: 0, fired };
    case "range": {
      const hiredMin = Math.max(0, hiringConfig.hiredRangeMin);
      const hiredMax = Math.min(maxHire, hiringConfig.hiredRangeMax);
      return { hired: Math.round((hiredMin + hiredMax) / 2), fired };
    }
    case "fixed":
      return { hired: Math.min(maxHire, Math.max(0, hiringConfig.fixedHired)), fired };
    default:
      return { hired: maxHire, fired };
  }
}

/**
 * 求解机器购买数量（非 range 模式）
 */
function solveMachinePurchase(
  machineConfig?: PeriodMachineConfig,
): number {
  if (!machineConfig) return 0;
  switch (machineConfig.mode) {
    case "none": return 0;
    case "fixed": return machineConfig.fixedCount;
    case "range":
      return Math.round((machineConfig.rangeMin + machineConfig.rangeMax) / 2);
    default: return 0;
  }
}

/**
 * 递归计算第 targetIdx 期的资源参数
 */
function calcChainedResources(
  targetIdx: number,
  config: GlobalConfig,
  decisions: PeriodDecision[],
): PeriodResources {
  if (targetIdx === 0) {
    return calcPeriodResources(1, config, decisions[0], null, 0);
  }
  const prev = calcChainedResources(targetIdx - 1, config, decisions);
  const prevPrevPurchase = targetIdx >= 2 ? decisions[targetIdx - 2].machinesPurchased : 0;
  return calcPeriodResources(targetIdx + 1, config, decisions[targetIdx], prev, prevPrevPurchase);
}

/**
 * 评估资源利用率得分（用于 range 模式的机器/雇佣搜索）
 */
function evaluateResourceScore(
  targetPeriodIdx: number,
  config: GlobalConfig,
  decisions: PeriodDecision[],
  designConfig?: DesignPlanConfig | null,
  mode: SolverMode = "ilp",
): number {
  const resources = calcChainedResources(targetPeriodIdx, config, decisions);
  const period = targetPeriodIdx + 1;

  const production = solvePeriodProduction(resources, config, period, designConfig, mode);
  const cs = calcConstraints(production, resources, config.products);

  const c1 = cs.c1_workersAfterShift1;
  const c5 = cs.c5_machinesAfterShift1;
  const c7 = cs.c7_machinesAfterShift2;
  const c8 = cs.c8_machinesAfterOt2;

  if (c1 < -0.001 || c5 < -0.001 || c7 < -0.001 || c8 < -0.001) {
    return -100000;
  }

  return -(c1 + c5 + c7 + c8);
}

/**
 * 搜索最优机器购买数量（range 模式）
 */
function searchOptimalMachinePurchase(
  purchasePeriodIdx: number,
  targetPeriodIdx: number,
  config: GlobalConfig,
  decisions: PeriodDecision[],
  machineConfig: PeriodMachineConfig,
  designConfig?: DesignPlanConfig | null,
  mode: SolverMode = "ilp",
): number {
  const { rangeMin, rangeMax } = machineConfig;

  if (targetPeriodIdx >= config.periods) {
    return Math.round((rangeMin + rangeMax) / 2);
  }

  let bestPurchase = rangeMin;
  let bestScore = -Infinity;

  const origPurchase = decisions[purchasePeriodIdx].machinesPurchased;

  for (let p = rangeMin; p <= rangeMax; p++) {
    decisions[purchasePeriodIdx].machinesPurchased = p;
    const score = evaluateResourceScore(targetPeriodIdx, config, decisions, designConfig, mode);

    if (score > bestScore) {
      bestScore = score;
      bestPurchase = p;
    }
  }

  decisions[purchasePeriodIdx].machinesPurchased = origPurchase;
  return bestPurchase;
}

/**
 * 搜索最优雇佣人数（range 模式）
 */
function searchOptimalHiring(
  periodIdx: number,
  config: GlobalConfig,
  decisions: PeriodDecision[],
  hiringConfig: PeriodHiringConfig,
  designConfig?: DesignPlanConfig | null,
  mode: SolverMode = "ilp",
): { hired: number; fired: number } {
  let currentWorkers = config.initialWorkers;
  for (let j = 0; j < periodIdx; j++) {
    currentWorkers = currentWorkers + decisions[j].hired - decisions[j].fired;
  }
  const minFire = Math.ceil(currentWorkers * (config.minFireRate / 100));
  const maxHire = Math.floor(currentWorkers * (config.maxHireRate / 100));
  const fired = minFire;

  const hiredMin = Math.max(0, hiringConfig.hiredRangeMin);
  const hiredMax = Math.min(maxHire, hiringConfig.hiredRangeMax);

  const nextPeriodIdx = periodIdx + 1;
  if (nextPeriodIdx >= config.periods) {
    return { hired: Math.round((hiredMin + hiredMax) / 2), fired };
  }

  let bestHired = hiredMin;
  let bestScore = -Infinity;

  const origHired = decisions[periodIdx].hired;
  const origFired = decisions[periodIdx].fired;

  for (let h = hiredMin; h <= hiredMax; h++) {
    decisions[periodIdx].hired = h;
    decisions[periodIdx].fired = fired;

    const score = evaluateResourceScore(nextPeriodIdx, config, decisions, designConfig, mode);

    if (score > bestScore) {
      bestScore = score;
      bestHired = h;
    }
  }

  decisions[periodIdx].hired = origHired;
  decisions[periodIdx].fired = origFired;

  return { hired: bestHired, fired };
}

// ============================================================
// 核心求解流程（v3：支持算法模式切换）
// ============================================================

/**
 * 全局最优求解（v3 三档架构）
 *
 * @param config 全局配置
 * @param designConfig 方案设计配置
 * @param mode 算法模式：greedy | ilp | annealing
 */
export function solveOptimal(
  config: GlobalConfig,
  designConfig?: DesignPlanConfig | null,
  mode: SolverMode = "ilp",
): SolverResult {
  const startTime = performance.now();

  // ================================================================
  // 第一轮：生成初始决策和产量
  // ================================================================
  const decisions: PeriodDecision[] = [];
  const productions: PeriodProduction[] = [];
  let currentInitialWorkers = config.initialWorkers;

  for (let i = 0; i < config.periods; i++) {
    const period = i + 1;
    const hiringConfig = designConfig?.periodHiring[i];
    const machineConfig = designConfig?.periodMachines[i];

    const { hired, fired } = solveHiringDecision(
      period, currentInitialWorkers, config, hiringConfig
    );
    const machinesPurchased = solveMachinePurchase(machineConfig);
    decisions.push({ machinesPurchased, hired, fired });

    const resources = calcChainedResources(i, config, decisions);
    const production = solvePeriodProduction(resources, config, period, designConfig, mode);
    productions.push(production);

    currentInitialWorkers = currentInitialWorkers + hired - fired;
  }

  // ================================================================
  // 第二轮：精确求解 range 模式的机器购买和雇佣
  // ================================================================
  for (let i = 0; i < config.periods; i++) {
    const machineConfig = designConfig?.periodMachines[i];
    const hiringConfig = designConfig?.periodHiring[i];
    let needRecalcProduction = false;

    if (machineConfig && machineConfig.mode === "range") {
      const targetPeriodIdx = i + 2;
      const bestPurchase = searchOptimalMachinePurchase(
        i, targetPeriodIdx, config, decisions, machineConfig, designConfig, mode
      );
      if (decisions[i].machinesPurchased !== bestPurchase) {
        decisions[i].machinesPurchased = bestPurchase;
        needRecalcProduction = true;
      }
    }

    if (hiringConfig && hiringConfig.mode === "range") {
      let cw = config.initialWorkers;
      for (let j = 0; j < i; j++) {
        cw = cw + decisions[j].hired - decisions[j].fired;
      }
      const minFire = Math.ceil(cw * (config.minFireRate / 100));
      decisions[i].fired = minFire;

      const bestHiring = searchOptimalHiring(
        i, config, decisions, hiringConfig, designConfig, mode
      );
      if (decisions[i].hired !== bestHiring.hired) {
        decisions[i].hired = bestHiring.hired;
        decisions[i].fired = bestHiring.fired;
        needRecalcProduction = true;
      }
    }

    if (needRecalcProduction) {
      for (let j = i; j < config.periods; j++) {
        const r = calcChainedResources(j, config, decisions);
        productions[j] = solvePeriodProduction(r, config, j + 1, designConfig, mode);
      }
    }
  }

  // ================================================================
  // 第三轮：最终重算所有期的产量（确保一致性）
  // ================================================================
  for (let i = 0; i < config.periods; i++) {
    const resources = calcChainedResources(i, config, decisions);
    productions[i] = solvePeriodProduction(resources, config, i + 1, designConfig, mode);
  }

  // ================================================================
  // 计算结果指标
  // ================================================================
  const residuals = [];
  for (let i = 0; i < config.periods; i++) {
    const resources = calcChainedResources(i, config, decisions);
    const constraints = calcConstraints(productions[i], resources, config.products);
    residuals.push({
      period: i + 1,
      c1: constraints.c1_workersAfterShift1,
      c2: constraints.c2_workersAfterOt1,
      c4: constraints.c4_workersAfterOt2,
      c5: constraints.c5_machinesAfterShift1,
      c7: constraints.c7_machinesAfterShift2,
      c8: constraints.c8_machinesAfterOt2,
    });
  }

  const totals = calcGlobalTotals(productions, 0);
  const balance = {
    abDiff: Math.abs(totals.A - totals.B),
    cdDiff: Math.abs(totals.C - totals.D),
  };

  const elapsed = performance.now() - startTime;

  return { productions, decisions, elapsed, mode, residuals, balance };
}

// ============================================================
// 辅助函数
// ============================================================

function calcGlobalTotals(
  productions: PeriodProduction[],
  startPeriod: number = 0,
): Record<ProductKey, number> {
  const totals: Record<ProductKey, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (let i = startPeriod; i < productions.length; i++) {
    const prod = productions[i];
    for (const p of PRODUCTS) {
      totals[p] += prod.shift1[p] + prod.ot1[p] + prod.shift2[p] + prod.ot2[p];
    }
  }
  return totals;
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 单期最优求解（仅产量层）
 */
export function solveSinglePeriod(
  resources: PeriodResources,
  config: GlobalConfig,
  period: number,
  designConfig?: DesignPlanConfig | null,
  mode: SolverMode = "ilp",
): PeriodProduction {
  return solvePeriodProduction(resources, config, period, designConfig, mode);
}

/**
 * 仅求解资源决策（初始决策，不含 range 精确求解）
 */
export function solveResourceDecisions(
  config: GlobalConfig,
  designConfig?: DesignPlanConfig | null,
): PeriodDecision[] {
  const decisions: PeriodDecision[] = [];
  let currentInitialWorkers = config.initialWorkers;

  for (let i = 0; i < config.periods; i++) {
    const period = i + 1;
    const hiringConfig = designConfig?.periodHiring[i];
    const machineConfig = designConfig?.periodMachines[i];

    const { hired, fired } = solveHiringDecision(
      period, currentInitialWorkers, config, hiringConfig
    );
    const machinesPurchased = solveMachinePurchase(machineConfig);

    decisions.push({ machinesPurchased, hired, fired });
    currentInitialWorkers = currentInitialWorkers + hired - fired;
  }

  return decisions;
}
