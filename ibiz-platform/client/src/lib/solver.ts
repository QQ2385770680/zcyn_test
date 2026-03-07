/**
 * solver.ts — iBizSim 分层贪心 + 迭代修正求解器（v2 重构）
 *
 * 新求解架构：逐期按 产量→机器→雇佣 顺序求解
 *
 * 每期求解顺序：
 * 1. 产量求解（第二层）：
 *    - shift1 → 让 C5（一班可用机器）最小
 *    - shift2 → 让 C1（一班可用人数）最小
 *    - ot1    → 让 C7（二班可用机器）最小
 *    - ot2    → 让 C8（二加可用机器）最小
 *
 * 2. 机器购买求解（range 模式）：
 *    - 第N期购买 → 目标让第N+2期的一班可用人数和一班二班二加可用机器最小
 *    - 通过在目标期执行完整最优排产后评估约束残差
 *
 * 3. 雇佣求解（range 模式）：
 *    - 第N期雇佣 → 目标让第N+1期最优排产后一班可用人数和可用机器最小
 *    - 通过在下一期执行完整最优排产后评估约束残差
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
import { getAlgorithm, DEFAULT_ALGORITHM_ID } from "./algorithms";

// ============================================================
// 类型定义
// ============================================================

type ShiftKey = "shift1" | "ot1" | "shift2" | "ot2";
type ProductKey = "A" | "B" | "C" | "D";

const PRODUCTS: ProductKey[] = ["A", "B", "C", "D"];
const PRODUCT_INDEX: Record<ProductKey, number> = { A: 0, B: 1, C: 2, D: 3 };

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
// 工具函数
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

/**
 * 均匀分配产量（Round-Robin 轮询式）
 *
 * 核心：每次给每个产品各加 1，直到资源耗尽或所有产品达到上限。
 * 保证产品间产量尽量均匀。
 */
function allocateRoundRobin(
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

  // 过滤掉 fixed 的单元格（不再可调）
  const adjustable = cells.filter(c => c.mode !== "fixed");
  if (adjustable.length === 0) return result;

  // 第二遍：轮询式均匀分配
  let changed = true;
  while (changed && remPrimary > 0.001 && remSecondary > 0.001) {
    changed = false;
    for (const cell of adjustable) {
      const current = result[cell.product];
      if (current >= cell.rangeMax) continue;

      const pCost = cell[primaryCoeffKey] * primaryMul;
      const sCost = secondaryCoeffKey ? cell[secondaryCoeffKey] * (secondaryMul ?? 1) : 0;

      if (pCost > remPrimary + 0.001) continue;
      if (sCost > 0 && sCost > remSecondary + 0.001) continue;

      result[cell.product] = current + 1;
      remPrimary -= pCost;
      remSecondary -= sCost;
      changed = true;
    }
  }

  return result;
}

/**
 * 尾部优化：在 Round-Robin 均匀分配后，通过调整产品比例最大化 primary 资源利用率
 *
 * 核心问题：
 * Round-Robin 均匀分配后，不同产品的 primary/secondary 效率比不同。
 * 例如 D 的 machineCoeff/laborCoeff = 2.0，C 的 = 1.636。
 * 在 secondary 约束下，D 每单位 secondary 能消耗更多 primary。
 *
 * 算法：“减 N 换 M”批量交换
 * 对每对 (high, low) 产品，计算“减少 N 个 low，增加 M 个 high”的最优比例：
 * - 减少 low 释放 secondary，用释放的 secondary 加上剩余 secondary 来增加 high
 * - 只要最终 primary 消耗增加且所有约束满足，就接受
 */
function optimizeForPrimary(
  result: Record<ProductKey, number>,
  cells: CellInfo[],
  primaryCap: number,
  primaryCoeffKey: "laborCoeff" | "machineCoeff",
  primaryMul: number,
  secondaryCap: number,
  secondaryCoeffKey: "laborCoeff" | "machineCoeff",
  secondaryMul: number,
): Record<ProductKey, number> {
  const adjustable = cells.filter(c => c.mode !== "fixed" && c.mode !== "blank");
  if (adjustable.length < 2) return result;

  // 计算效率比 = primary消耗 / secondary消耗
  const efficiencyRatio = (cell: CellInfo) => {
    const pCost = cell[primaryCoeffKey] * primaryMul;
    const sCost = cell[secondaryCoeffKey] * secondaryMul;
    return sCost > 0 ? pCost / sCost : Infinity;
  };

  // 按效率比降序排列
  const sorted = [...adjustable].sort((a, b) => efficiencyRatio(b) - efficiencyRatio(a));

  // 计算当前资源消耗
  const calcUsage = () => {
    let pUsed = 0, sUsed = 0;
    for (const cell of cells) {
      const qty = result[cell.product];
      if (qty > 0) {
        pUsed += qty * cell[primaryCoeffKey] * primaryMul;
        sUsed += qty * cell[secondaryCoeffKey] * secondaryMul;
      }
    }
    return { pUsed, sUsed };
  };

  // 迭代优化：对每对 (high, low) 尝试批量交换
  let improved = true;
  let iterations = 0;
  const maxIterations = 500;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let hi = 0; hi < sorted.length; hi++) {
      const highCell = sorted[hi];
      const highPCost = highCell[primaryCoeffKey] * primaryMul;
      const highSCost = highCell[secondaryCoeffKey] * secondaryMul;

      for (let lo = sorted.length - 1; lo > hi; lo--) {
        const lowCell = sorted[lo];
        const lowPCost = lowCell[primaryCoeffKey] * primaryMul;
        const lowSCost = lowCell[secondaryCoeffKey] * secondaryMul;

        // 只有 high 的 primary 效率更高才有意义
        if (highPCost <= lowPCost + 0.0001) continue;

        const lowMin = lowCell.mode === "required" ? lowCell.rangeMin : 0;
        const maxReduce = result[lowCell.product] - lowMin;
        if (maxReduce <= 0) continue;

        const highMax = highCell.rangeMax;
        const maxIncrease = highMax - result[highCell.product];
        if (maxIncrease <= 0) continue;

        // 计算当前资源状态
        const { pUsed, sUsed } = calcUsage();
        const pSlack = primaryCap - pUsed;   // primary 剩余
        const sSlack = secondaryCap - sUsed; // secondary 剩余

        // 搜索最优的 (reduce, increase) 组合
        // 减少 reduce 个 low，增加 increase 个 high
        // 约束：
        //   pUsed - reduce*lowPCost + increase*highPCost <= primaryCap
        //   sUsed - reduce*lowSCost + increase*highSCost <= secondaryCap
        // 目标：最大化 increase*highPCost - reduce*lowPCost (即 primary 消耗增量)

        let bestDeltaP = 0;
        let bestReduce = 0;
        let bestIncrease = 0;

        // 限制搜索范围以保证性能
        const searchLimit = Math.min(maxReduce, 200);

        for (let r = 0; r <= searchLimit; r++) {
          // 减少 r 个 low 后的资源剩余
          const newPSlack = pSlack + r * lowPCost;
          const newSSlack = sSlack + r * lowSCost;

          // 能增加多少个 high
          const maxByP = Math.floor((newPSlack + 0.001) / highPCost);
          const maxByS = newSSlack >= 0 ? Math.floor((newSSlack + 0.001) / highSCost) : 0;
          const inc = Math.min(maxByP, maxByS, maxIncrease);

          if (inc <= 0 && r === 0) continue;
          if (inc < 0) continue;

          const deltaP = inc * highPCost - r * lowPCost;
          if (deltaP > bestDeltaP + 0.0001) {
            bestDeltaP = deltaP;
            bestReduce = r;
            bestIncrease = inc;
          }
        }

        if (bestDeltaP > 0.0001 && (bestReduce > 0 || bestIncrease > 0)) {
          result[lowCell.product] -= bestReduce;
          result[highCell.product] += bestIncrease;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  // 最后一步：尝试用剩余资源补充任意产品（按效率比降序）
  const { pUsed: finalP, sUsed: finalS } = calcUsage();
  let remP = primaryCap - finalP;
  let remS = secondaryCap - finalS;
  for (const cell of sorted) {
    if (result[cell.product] >= cell.rangeMax) continue;
    const pCost = cell[primaryCoeffKey] * primaryMul;
    const sCost = cell[secondaryCoeffKey] * secondaryMul;
    while (result[cell.product] < cell.rangeMax && pCost <= remP + 0.001 && sCost <= remS + 0.001) {
      result[cell.product]++;
      remP -= pCost;
      remS -= sCost;
    }
  }

  return result;
}

// ============================================================
// 产量求解（第二层）
// ============================================================

/**
 * 单期产量求解
 *
 * 严格按求解顺序：
 * 1. shift1 → 让 C5（一班可用机器）最小
 * 2. shift2 → 让 C1（一班可用人数）最小
 * 3. ot1    → 让 C7（二班可用机器）最小
 * 4. ot2    → 让 C8（二加可用机器）最小
 */
function solvePeriodProduction(
  resources: PeriodResources,
  config: GlobalConfig,
  period: number,
  designConfig?: DesignPlanConfig | null,
  algorithmId: string = DEFAULT_ALGORITHM_ID,
): PeriodProduction {
  const production = emptyPeriodProduction();
  const products = config.products;
  const algo = getAlgorithm(algorithmId);
  const useOptimize = algo.solverStrategy === "roundRobinOptimized";

  /** 根据算法策略决定是否执行尾部优化 */
  function applyStrategy(
    allocated: Record<ProductKey, number>,
    cells: CellInfo[],
    primaryCap: number,
    primaryField: "machineCoeff" | "laborCoeff",
    primaryMul: number,
    secondaryCap: number,
    secondaryField: "machineCoeff" | "laborCoeff",
    secondaryMul: number,
  ): Record<ProductKey, number> {
    if (useOptimize) {
      return optimizeForPrimary(
        allocated, cells,
        primaryCap, primaryField, primaryMul,
        secondaryCap, secondaryField, secondaryMul,
      );
    }
    return allocated;
  }

  // ---- Step 1: shift1（第一班）→ 让 C5（一班可用机器）最小 ----
  {
    const cells = getShiftCells("shift1", period, config, designConfig);
    const allocated = allocateRoundRobin(
      cells,
      resources.machines,
      "machineCoeff",
      1,
      resources.totalAvailableWorkers,
      "laborCoeff",
      1,
    );
    const final = applyStrategy(
      allocated, cells,
      resources.machines, "machineCoeff", 1,
      resources.totalAvailableWorkers, "laborCoeff", 1,
    );
    for (const p of PRODUCTS) {
      production.shift1[p] = final[p];
    }
  }

  // 计算 shift1 实际消耗
  const shift1Labor = PRODUCTS.reduce(
    (s, p) => s + production.shift1[p] * getLaborCoeff(products[PRODUCT_INDEX[p]]), 0
  );

  // ---- Step 2: shift2（第二班）→ 让 C1（一班可用人数）最小 ----
  {
    const remainingLabor = resources.totalAvailableWorkers - shift1Labor;
    const cells = getShiftCells("shift2", period, config, designConfig);
    const allocated = allocateRoundRobin(
      cells,
      remainingLabor,
      "laborCoeff",
      1,
      resources.machines,
      "machineCoeff",
      1,
    );
    const final = applyStrategy(
      allocated, cells,
      remainingLabor, "laborCoeff", 1,
      resources.machines, "machineCoeff", 1,
    );
    for (const p of PRODUCTS) {
      production.shift2[p] = final[p];
    }
  }

  // 计算 shift2 实际消耗
  const shift2Labor = PRODUCTS.reduce(
    (s, p) => s + production.shift2[p] * getLaborCoeff(products[PRODUCT_INDEX[p]]), 0
  );
  const shift2Machine = PRODUCTS.reduce(
    (s, p) => s + production.shift2[p] * getMachineCoeff(products[PRODUCT_INDEX[p]]), 0
  );

  // ---- Step 3: ot1（一加）→ 让 C7（二班可用机器）最小 ----
  {
    const remainingMachineForOt1 = resources.machines - shift2Machine;
    const cells = getShiftCells("ot1", period, config, designConfig);
    const allocated = allocateRoundRobin(
      cells,
      remainingMachineForOt1,
      "machineCoeff",
      2,
      shift1Labor,
      "laborCoeff",
      2,
    );
    const final = applyStrategy(
      allocated, cells,
      remainingMachineForOt1, "machineCoeff", 2,
      shift1Labor, "laborCoeff", 2,
    );
    for (const p of PRODUCTS) {
      production.ot1[p] = final[p];
    }
  }

  // ---- Step 4: ot2（二加）→ 让 C8（二加可用机器）最小 ----
  {
    const cells = getShiftCells("ot2", period, config, designConfig);
    const allocated = allocateRoundRobin(
      cells,
      resources.machines,
      "machineCoeff",
      2,
      shift2Labor,
      "laborCoeff",
      2,
    );
    const final = applyStrategy(
      allocated, cells,
      resources.machines, "machineCoeff", 2,
      shift2Labor, "laborCoeff", 2,
    );
    for (const p of PRODUCTS) {
      production.ot2[p] = final[p];
    }
  }

  return production;
}

// ============================================================
// 资源决策求解
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
      // range 模式在后续精确求解，这里先用中间值
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
      // range 模式在后续精确求解，这里先用中间值
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
 * 评估资源利用率得分
 *
 * 在目标期执行完整最优排产，然后计算所有约束残差之和。
 * 残差越小 = 资源利用率越高 = 得分越高
 *
 * 得分 = -(C1 + C5 + C7 + C8)
 * C1: 一班可用人数剩余
 * C5: 一班可用机器剩余
 * C7: 二班可用机器剩余
 * C8: 二加可用机器剩余
 */
function evaluateResourceScore(
  targetPeriodIdx: number,
  config: GlobalConfig,
  decisions: PeriodDecision[],
  designConfig?: DesignPlanConfig | null,
  algorithmId: string = DEFAULT_ALGORITHM_ID,
): number {
  const resources = calcChainedResources(targetPeriodIdx, config, decisions);
  const period = targetPeriodIdx + 1;

  // 在目标期执行完整最优排产
  const production = solvePeriodProduction(resources, config, period, designConfig, algorithmId);

  // 计算约束残差
  const cs = calcConstraints(production, resources, config.products);

  // 所有约束残差之和（越小越好）
  // 如果有约束超限（<0），给予巨大惩罚
  const c1 = cs.c1_workersAfterShift1;
  const c5 = cs.c5_machinesAfterShift1;
  const c7 = cs.c7_machinesAfterShift2;
  const c8 = cs.c8_machinesAfterOt2;

  if (c1 < -0.001 || c5 < -0.001 || c7 < -0.001 || c8 < -0.001) {
    return -100000; // 约束超限，严重惩罚
  }

  // 得分 = -(残差总和)，残差越小得分越高
  return -(c1 + c5 + c7 + c8);
}

/**
 * 搜索最优机器购买数量（range 模式）
 *
 * 目标：让目标期（购买期+2）执行完整最优排产后，
 * 一班可用人数（C1）和一班二班二加可用机器（C5/C7/C8）最小化
 */
function searchOptimalMachinePurchase(
  purchasePeriodIdx: number,
  targetPeriodIdx: number,
  config: GlobalConfig,
  decisions: PeriodDecision[],
  machineConfig: PeriodMachineConfig,
  designConfig?: DesignPlanConfig | null,
  algorithmId: string = DEFAULT_ALGORITHM_ID,
): number {
  const { rangeMin, rangeMax } = machineConfig;

  if (targetPeriodIdx >= config.periods) {
    // 目标期超出范围，用中间值
    return Math.round((rangeMin + rangeMax) / 2);
  }

  let bestPurchase = rangeMin;
  let bestScore = -Infinity;

  const origPurchase = decisions[purchasePeriodIdx].machinesPurchased;

  for (let p = rangeMin; p <= rangeMax; p++) {
    decisions[purchasePeriodIdx].machinesPurchased = p;
    const score = evaluateResourceScore(targetPeriodIdx, config, decisions, designConfig, algorithmId);

    if (score > bestScore) {
      bestScore = score;
      bestPurchase = p;
    }
  }

  // 恢复原值
  decisions[purchasePeriodIdx].machinesPurchased = origPurchase;
  return bestPurchase;
}

/**
 * 搜索最优雇佣人数（range 模式）
 *
 * 目标：让下一期执行完整最优排产后，
 * 一班可用人数（C1）和一班二班二加可用机器（C5/C7/C8）最小化
 */
function searchOptimalHiring(
  periodIdx: number,
  config: GlobalConfig,
  decisions: PeriodDecision[],
  hiringConfig: PeriodHiringConfig,
  designConfig?: DesignPlanConfig | null,
  algorithmId: string = DEFAULT_ALGORITHM_ID,
): { hired: number; fired: number } {
  // 计算当前期的实际期初工人数
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
    // 没有下一期，用中间值
    return { hired: Math.round((hiredMin + hiredMax) / 2), fired };
  }

  let bestHired = hiredMin;
  let bestScore = -Infinity;

  const origHired = decisions[periodIdx].hired;
  const origFired = decisions[periodIdx].fired;

  for (let h = hiredMin; h <= hiredMax; h++) {
    decisions[periodIdx].hired = h;
    decisions[periodIdx].fired = fired;

    const score = evaluateResourceScore(nextPeriodIdx, config, decisions, designConfig, algorithmId);

    if (score > bestScore) {
      bestScore = score;
      bestHired = h;
    }
  }

  // 恢复原值
  decisions[periodIdx].hired = origHired;
  decisions[periodIdx].fired = origFired;

  return { hired: bestHired, fired };
}

// ============================================================
// 核心求解流程（v2：逐期 产量→机器→雇佣）
// ============================================================

/**
 * 全局最优求解（v2 重构）
 *
 * 逐期按以下顺序求解：
 * 1. 先用初始决策计算本期资源
 * 2. 求解本期产量最佳值
 * 3. 求解本期机器购买最佳值（range 模式，目标期=本期+2）
 * 4. 求解本期雇佣最佳值（range 模式，目标期=本期+1）
 *
 * 由于机器购买和雇佣的 range 求解依赖后续期的最优排产评估，
 * 需要两轮迭代：
 * - 第一轮：生成初始决策 + 产量
 * - 第二轮：精确求解 range 模式的机器和雇佣，并重算产量
 */
export function solveOptimal(
  config: GlobalConfig,
  designConfig?: DesignPlanConfig | null,
  algorithmId: string = DEFAULT_ALGORITHM_ID,
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

    // 生成初始决策
    const { hired, fired } = solveHiringDecision(
      period, currentInitialWorkers, config, hiringConfig
    );
    const machinesPurchased = solveMachinePurchase(machineConfig);
    decisions.push({ machinesPurchased, hired, fired });

    // 计算本期资源
    const resources = calcChainedResources(i, config, decisions);

    // 求解本期产量
    const production = solvePeriodProduction(resources, config, period, designConfig, algorithmId);
    productions.push(production);

    currentInitialWorkers = currentInitialWorkers + hired - fired;
  }

  // ================================================================
  // 第二轮：精确求解 range 模式的机器购买和雇佣
  // 按期顺序：每期先求机器，再求雇佣
  // ================================================================
  for (let i = 0; i < config.periods; i++) {
    const period = i + 1;
    const machineConfig = designConfig?.periodMachines[i];
    const hiringConfig = designConfig?.periodHiring[i];
    let needRecalcProduction = false;

    // Step 1: 求解本期机器购买（range 模式）
    if (machineConfig && machineConfig.mode === "range") {
      const targetPeriodIdx = i + 2; // 机器两期后到货
      const bestPurchase = searchOptimalMachinePurchase(
        i, targetPeriodIdx, config, decisions, machineConfig, designConfig, algorithmId
      );
      if (decisions[i].machinesPurchased !== bestPurchase) {
        decisions[i].machinesPurchased = bestPurchase;
        needRecalcProduction = true;
      }
    }

    // Step 2: 求解本期雇佣（range 模式）
    if (hiringConfig && hiringConfig.mode === "range") {
      // 先更新当前期的 fired
      let cw = config.initialWorkers;
      for (let j = 0; j < i; j++) {
        cw = cw + decisions[j].hired - decisions[j].fired;
      }
      const minFire = Math.ceil(cw * (config.minFireRate / 100));
      decisions[i].fired = minFire;

      const bestHiring = searchOptimalHiring(
        i, config, decisions, hiringConfig, designConfig, algorithmId
      );
      if (decisions[i].hired !== bestHiring.hired) {
        decisions[i].hired = bestHiring.hired;
        decisions[i].fired = bestHiring.fired;
        needRecalcProduction = true;
      }
    }

    // 如果决策变化了，重算本期及后续期的产量
    if (needRecalcProduction) {
      for (let j = i; j < config.periods; j++) {
        const r = calcChainedResources(j, config, decisions);
        productions[j] = solvePeriodProduction(r, config, j + 1, designConfig, algorithmId);
      }
    }
  }

  // ================================================================
  // 第三轮：最终重算所有期的产量（确保一致性）
  // ================================================================
  for (let i = 0; i < config.periods; i++) {
    const resources = calcChainedResources(i, config, decisions);
    productions[i] = solvePeriodProduction(resources, config, i + 1, designConfig, algorithmId);
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

  return { productions, decisions, elapsed, residuals, balance };
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 计算各产品的全局总产量
 */
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
  algorithmId: string = DEFAULT_ALGORITHM_ID,
): PeriodProduction {
  return solvePeriodProduction(resources, config, period, designConfig, algorithmId);
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
