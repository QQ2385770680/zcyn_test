/**
 * solver.ts — iBizSim 分层贪心 + 迭代修正求解器
 *
 * 方案 C：Layered Greedy with Iterative Refinement
 *
 * 三层求解架构：
 * ┌─────────────────────────────────────────────────────┐
 * │ 第一层：资源规划层（跨期）                           │
 * │  - 反向推导机器购买数量（P1→P3, P2→P4, P3→P5）     │
 * │  - 确定雇佣策略（custom 模式下求解最优雇佣人数）    │
 * ├─────────────────────────────────────────────────────┤
 * │ 第二层：产量分配层（期内）                           │
 * │  - 按约束顺序逐班次求解：                           │
 * │    shift1 → C5 接近 0（一班可用机器）               │
 * │    shift2 → C1 接近 0（一班可用人数）               │
 * │    ot1    → C7 接近 0（二班可用机器）               │
 * │    ot2    → C8 最小化（二加可用机器）               │
 * ├─────────────────────────────────────────────────────┤
 * │ 第三层：均衡修正层（全局）                           │
 * │  - P2 起：最小化 |A总-B总| 和 |C总-D总|            │
 * │  - 在不违反约束的前提下微调产量                     │
 * └─────────────────────────────────────────────────────┘
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
    abDiff: number; // |A总-B总|
    cdDiff: number; // |C总-D总|
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
      mode = "optional"; // free → optional
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
 * 核心改进：不再按 A→B→C→D 贪心填满，而是每次给每个产品各加 1，
 * 直到资源耗尽或所有产品达到上限。这样保证产品间产量尽量均匀。
 *
 * @param cells 待分配的单元格列表
 * @param primaryCap 主约束容量
 * @param primaryCoeffKey 主约束系数
 * @param primaryMul 主约束乘数（加班=2，正班=1）
 * @param secondaryCap 次约束容量（可选）
 * @param secondaryCoeffKey 次约束系数
 * @param secondaryMul 次约束乘数
 * @returns 分配结果 { [product]: qty }
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
  // 按系数从小到大排序（系数小的产品单位资源消耗少，优先分配可以产出更多）
  // 但为了均衡，我们用轮询而非贪心
  let changed = true;
  while (changed && remPrimary > 0.001 && remSecondary > 0.001) {
    changed = false;
    for (const cell of adjustable) {
      const current = result[cell.product];
      if (current >= cell.rangeMax) continue; // 已达上限

      const pCost = cell[primaryCoeffKey] * primaryMul;
      const sCost = secondaryCoeffKey ? cell[secondaryCoeffKey] * (secondaryMul ?? 1) : 0;

      if (pCost > remPrimary + 0.001) continue; // 主约束不够
      if (sCost > 0 && sCost > remSecondary + 0.001) continue; // 次约束不够

      result[cell.product] = current + 1;
      remPrimary -= pCost;
      remSecondary -= sCost;
      changed = true;
    }
  }

  return result;
}

// ============================================================
// 第一层：资源规划层
// ============================================================

/**
 * 求解雇佣决策
 */
function solveHiringDecision(
  period: number,
  initialWorkers: number,
  config: GlobalConfig,
  hiringConfig?: PeriodHiringConfig,
): { hired: number; fired: number } {
  const minFire = Math.ceil(initialWorkers * (config.minFireRate / 100));
  const maxHire = Math.floor(initialWorkers * (config.maxHireRate / 100));

  // 解雇固定为最低解雇
  const fired = minFire;

  if (!hiringConfig) {
    // 默认：最大雇佣
    return { hired: maxHire, fired };
  }

  switch (hiringConfig.mode) {
    case "max-hire":
      return { hired: maxHire, fired };
    case "balance":
      return { hired: minFire, fired }; // 雇佣=解雇=最低解雇
    case "flexible":
      return { hired: 0, fired }; // 模拟器中手动输入，求解器默认0
    case "range": {
      const hiredMin = Math.max(0, hiringConfig.hiredRangeMin);
      const hiredMax = Math.min(maxHire, hiringConfig.hiredRangeMax);
      return {
        hired: Math.min(maxHire, Math.max(0, Math.round((hiredMin + hiredMax) / 2))),
        fired,
      };
    }
    case "fixed":
      return {
        hired: Math.min(maxHire, Math.max(0, hiringConfig.fixedHired)),
        fired,
      };
    default:
      return { hired: maxHire, fired };
  }
}

/**
 * 求解机器购买数量
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
 * 搜索最优机器购买数量
 *
 * 目标：让目标期（购买期+2）的一班可用人数和一班二班二加可用机器数最小化
 * 即资源利用率最大化，人力和机器刚好匹配
 */
function searchOptimalMachinePurchase(
  purchasePeriodIdx: number,
  targetPeriodIdx: number,
  config: GlobalConfig,
  decisions: PeriodDecision[],
  machineConfig: PeriodMachineConfig,
): number {
  const { rangeMin, rangeMax } = machineConfig;
  let bestPurchase = rangeMin;
  let bestScore = -Infinity;

  for (let p = rangeMin; p <= rangeMax; p++) {
    const origPurchase = decisions[purchasePeriodIdx].machinesPurchased;
    decisions[purchasePeriodIdx].machinesPurchased = p;
    const resources = calcChainedResources(targetPeriodIdx, config, decisions);
    decisions[purchasePeriodIdx].machinesPurchased = origPurchase;

    const machines = resources.machines;
    const workers = resources.totalAvailableWorkers;

    const avgMachineCoeff = config.products.reduce((s, pr) => s + getMachineCoeff(pr), 0) / 4;
    const avgLaborCoeff = config.products.reduce((s, pr) => s + getLaborCoeff(pr), 0) / 4;

    // 机器能支撑的最大人力需求
    const machineCapInLabor = avgMachineCoeff > 0 ? (machines / avgMachineCoeff) * avgLaborCoeff : 999;
    // 人力能支撑的最大机器需求
    const laborCapInMachine = avgLaborCoeff > 0 ? (workers / avgLaborCoeff) * avgMachineCoeff : 999;

    // 资源剩余最小化：人力剩余 + 机器剩余 越小越好
    const workerSurplus = Math.max(0, workers - machineCapInLabor);
    const machineSurplus = Math.max(0, machines - laborCapInMachine);
    // 总分 = -(剩余总量)，越大越好
    const score = -(workerSurplus + machineSurplus * 10);

    if (score > bestScore) {
      bestScore = score;
      bestPurchase = p;
    }
  }

  return bestPurchase;
}

/**
 * 搜索最优雇佣人数（range 模式）
 *
 * 目标：让下一期的一班可用人数（C1）和一班二班二加可用机器数（C5/C7/C8）最小化
 * 即让下一期资源利用率最大化
 */
function searchOptimalHiring(
  periodIdx: number,
  config: GlobalConfig,
  decisions: PeriodDecision[],
  hiringConfig: PeriodHiringConfig,
): { hired: number; fired: number } {
  // 计算当前期的实际期初工人数（基于前面期的已更新决策）
  let currentWorkers = config.initialWorkers;
  for (let j = 0; j < periodIdx; j++) {
    currentWorkers = currentWorkers + decisions[j].hired - decisions[j].fired;
  }
  const minFire = Math.ceil(currentWorkers * (config.minFireRate / 100));
  const maxHire = Math.floor(currentWorkers * (config.maxHireRate / 100));

  // 解雇固定为最低解雇
  const hiredMin = Math.max(0, hiringConfig.hiredRangeMin);
  const hiredMax = Math.min(maxHire, hiringConfig.hiredRangeMax);

  const fired = minFire;
  let bestHired = hiredMin;
  let bestScore = -Infinity;

  for (let h = hiredMin; h <= hiredMax; h++) {
    const origHired = decisions[periodIdx].hired;
    const origFired = decisions[periodIdx].fired;
    decisions[periodIdx].hired = h;
    decisions[periodIdx].fired = fired;

    const nextPeriodIdx = periodIdx + 1;
    if (nextPeriodIdx < config.periods) {
      const nextResources = calcChainedResources(nextPeriodIdx, config, decisions);
      const workers = nextResources.totalAvailableWorkers;
      const machines = nextResources.machines;

      // 目标：让下一期的可用人数和可用机器都尽量小（即刚好够用）
      // 计算下一期的最大产能（用于评估资源是否匹配）
      const avgMachineCoeff = config.products.reduce((s, pr) => s + getMachineCoeff(pr), 0) / 4;
      const avgLaborCoeff = config.products.reduce((s, pr) => s + getLaborCoeff(pr), 0) / 4;

      // 机器能支撑的最大人力需求
      const machineCapInLabor = avgMachineCoeff > 0 ? (machines / avgMachineCoeff) * avgLaborCoeff : 999;
      // 人力能支撑的最大机器需求
      const laborCapInMachine = avgLaborCoeff > 0 ? (workers / avgLaborCoeff) * avgMachineCoeff : 999;

      // 资源剩余最小化：人力剩余 + 机器剩余 越小越好
      const workerSurplus = Math.max(0, workers - machineCapInLabor);
      const machineSurplus = Math.max(0, machines - laborCapInMachine);
      // 总分 = -(剩余总量)，越大越好（剩余越小越好）
      const score = -(workerSurplus + machineSurplus * 10);

      if (score > bestScore) {
        bestScore = score;
        bestHired = h;
      }
    }

    decisions[periodIdx].hired = origHired;
    decisions[periodIdx].fired = origFired;
  }

  return { hired: bestHired, fired: fired };
}

/**
 * 第一层主函数：计算所有期的资源决策
 */
function solveResourcePlan(
  config: GlobalConfig,
  designConfig?: DesignPlanConfig | null,
): PeriodDecision[] {
  const decisions: PeriodDecision[] = [];
  let currentInitialWorkers = config.initialWorkers;

  // 第一遍：生成初始决策
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

  // 第二遍：反向推导 range 模式的机器购买
  for (let i = 0; i < config.periods; i++) {
    const machineConfig = designConfig?.periodMachines[i];
    if (!machineConfig || machineConfig.mode !== "range") continue;

    const targetPeriodIdx = i + 2;
    if (targetPeriodIdx >= config.periods) continue;

    const bestPurchase = searchOptimalMachinePurchase(
      i, targetPeriodIdx, config, decisions, machineConfig
    );
    decisions[i].machinesPurchased = bestPurchase;
  }

  // 第三遍：对 range 模式的雇佣，搜索最优人数
  // 需要按顺序处理，因为前一期的雇佣决策会影响后一期的工人数
  for (let i = 0; i < config.periods; i++) {
    const hiringConfig = designConfig?.periodHiring[i];
    if (!hiringConfig || hiringConfig.mode !== "range") continue;

    // 重新计算当前期的实际 initialWorkers（基于前面期的已更新决策）
    let currentWorkers = config.initialWorkers;
    for (let j = 0; j < i; j++) {
      currentWorkers = currentWorkers + decisions[j].hired - decisions[j].fired;
    }
    // 修正当前期的 minFire 和 maxHire 基于实际工人数
    const minFire = Math.ceil(currentWorkers * (config.minFireRate / 100));
    const maxHire = Math.floor(currentWorkers * (config.maxHireRate / 100));
    decisions[i].fired = minFire;

    const bestHiring = searchOptimalHiring(i, config, decisions, hiringConfig);
    decisions[i].hired = bestHiring.hired;
    decisions[i].fired = bestHiring.fired;
  }

  return decisions;
}

// ============================================================
// 第二层：产量分配层
// ============================================================

/**
 * 单期产量求解
 *
 * 严格按用户指定的求解顺序：
 *
 * 1. shift1（第一班）→ 让 C5（一班可用机器）最小
 *    C5 = machines - machineShift1
 *    主约束：machines（机器容量，shift1 独享）
 *    次约束：totalAvailableWorkers（人力上限，shift1+shift2 共享）
 *
 * 2. shift2（第二班）→ 让 C1（一班可用人数）最小
 *    C1 = totalAvailableWorkers - laborShift1 - laborShift2
 *    主约束：remainingLabor（剩余人力）
 *    次约束：machines（机器容量，shift2 独享时段）
 *
 * 3. ot1（一加）→ 让 C7（二班可用机器）最小
 *    C7 = machines - machineShift2 - machineOt1 × 2
 *    主约束：machines - shift2Machine（剩余机器容量，乘数2）
 *    次约束：shift1Labor（C2 人力约束：laborShift1 - laborOt1×2 ≥ 0）
 *
 * 4. ot2（二加）→ 让 C8（二加可用机器）最小
 *    C8 = machines - machineOt2 × 2
 *    主约束：machines（机器容量，乘数2）
 *    次约束：shift2Labor（C4 人力约束：laborShift2 - laborOt2×2 ≥ 0）
 *
 * 每步目标：在不违反任何约束的前提下，尽量把对应资源用完（约束值最小）
 */
function solvePeriodProduction(
  resources: PeriodResources,
  config: GlobalConfig,
  period: number,
  designConfig?: DesignPlanConfig | null,
): PeriodProduction {
  const production = emptyPeriodProduction();
  const products = config.products;

  // ---- Step 1: shift1（第一班）→ 让 C5（一班可用机器）最小 ----
  // C5 = machines - machineShift1
  // shift1 独享机器池，尽量把机器用完
  // 同时受人力总量约束（shift1+shift2 共享人力池）
  {
    const cells = getShiftCells("shift1", period, config, designConfig);
    const allocated = allocateRoundRobin(
      cells,
      resources.machines,                // 主约束：机器容量（让 C5 最小）
      "machineCoeff",
      1,
      resources.totalAvailableWorkers,   // 次约束：总人力上限
      "laborCoeff",
      1,
    );
    for (const p of PRODUCTS) {
      production.shift1[p] = allocated[p];
    }
  }

  // 计算 shift1 实际消耗
  const shift1Labor = PRODUCTS.reduce(
    (s, p) => s + production.shift1[p] * getLaborCoeff(products[PRODUCT_INDEX[p]]), 0
  );

  // ---- Step 2: shift2（第二班）→ 让 C1（一班可用人数）最小 ----
  // C1 = totalAvailableWorkers - laborShift1 - laborShift2
  // shift2 的目标是把剩余人力用完
  // 同时受机器容量约束（shift2 独享时段的机器）
  {
    const remainingLabor = resources.totalAvailableWorkers - shift1Labor;
    const cells = getShiftCells("shift2", period, config, designConfig);
    const allocated = allocateRoundRobin(
      cells,
      remainingLabor,                    // 主约束：剩余人力（让 C1 最小）
      "laborCoeff",
      1,
      resources.machines,                // 次约束：机器容量
      "machineCoeff",
      1,
    );
    for (const p of PRODUCTS) {
      production.shift2[p] = allocated[p];
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
  // C7 = machines - machineShift2 - machineOt1 × 2
  // ot1 和 shift2 共享机器池，ot1 的机器消耗翻倍
  // 同时受 C2 人力约束：laborShift1 - laborOt1×2 ≥ 0
  {
    const remainingMachineForOt1 = resources.machines - shift2Machine;
    const cells = getShiftCells("ot1", period, config, designConfig);
    const allocated = allocateRoundRobin(
      cells,
      remainingMachineForOt1,            // 主约束：剩余机器容量（让 C7 最小）
      "machineCoeff",
      2,                                 // 加班机器乘数 = 2
      shift1Labor,                       // 次约束：C2 人力上限
      "laborCoeff",
      2,                                 // 加班人力乘数 = 2
    );
    for (const p of PRODUCTS) {
      production.ot1[p] = allocated[p];
    }
  }

  // ---- Step 4: ot2（二加）→ 让 C8（二加可用机器）最小 ----
  // C8 = machines - machineOt2 × 2
  // ot2 独享机器池，机器消耗翻倍
  // 同时受 C4 人力约束：laborShift2 - laborOt2×2 ≥ 0
  {
    const cells = getShiftCells("ot2", period, config, designConfig);
    const allocated = allocateRoundRobin(
      cells,
      resources.machines,                // 主约束：机器容量（让 C8 最小）
      "machineCoeff",
      2,                                 // 加班机器乘数 = 2
      shift2Labor,                       // 次约束：C4 人力上限
      "laborCoeff",
      2,                                 // 加班人力乘数 = 2
    );
    for (const p of PRODUCTS) {
      production.ot2[p] = allocated[p];
    }
  }

  return production;
}

// ============================================================
// 第三层：均衡修正层
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

/**
 * 尝试在不违反约束的前提下，微调某期某班次某产品的产量
 */
function tryAdjust(
  productions: PeriodProduction[],
  periodIdx: number,
  shift: ShiftKey,
  product: ProductKey,
  delta: number,
  config: GlobalConfig,
  resources: PeriodResources,
  designConfig?: DesignPlanConfig | null,
): boolean {
  const period = periodIdx + 1;
  const cellInfo = getCellInfo(product, shift, period, config, designConfig);

  if (cellInfo.mode === "fixed" || cellInfo.mode === "blank") return false;

  const currentQty = productions[periodIdx][shift][product];
  const newQty = currentQty + delta;

  if (newQty < cellInfo.rangeMin || newQty > cellInfo.rangeMax) return false;
  if (newQty < 0) return false;

  productions[periodIdx][shift][product] = newQty;

  const constraints = calcConstraints(productions[periodIdx], resources, config.products);
  const valid =
    constraints.c1_workersAfterShift1 >= -0.001 &&
    constraints.c2_workersAfterOt1 >= -0.001 &&
    constraints.c4_workersAfterOt2 >= -0.001 &&
    constraints.c5_machinesAfterShift1 >= -0.001 &&
    constraints.c7_machinesAfterShift2 >= -0.001 &&
    constraints.c8_machinesAfterOt2 >= -0.001;

  if (!valid) {
    productions[periodIdx][shift][product] = currentQty;
    return false;
  }

  return true;
}

/**
 * 均衡修正：最小化 |A-B| 和 |C-D|
 *
 * 策略改进：同时尝试 增加少的 + 减少多的（swap），
 * 并在所有期和所有班次中寻找最佳调整位置。
 */
function balanceProducts(
  productions: PeriodProduction[],
  config: GlobalConfig,
  decisions: PeriodDecision[],
  designConfig?: DesignPlanConfig | null,
  maxIter: number = 200,
): void {
  const shifts: ShiftKey[] = ["shift1", "shift2", "ot1", "ot2"];

  // 预计算各期资源
  const allResources: PeriodResources[] = [];
  for (let i = 0; i < config.periods; i++) {
    allResources.push(calcChainedResources(i, config, decisions));
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const totals = calcGlobalTotals(productions, 0); // 从 P1 开始统计
    const abDiff = totals.A - totals.B;
    const cdDiff = totals.C - totals.D;

    if (Math.abs(abDiff) <= 1 && Math.abs(cdDiff) <= 1) break;

    let adjusted = false;

    // 尝试调整 A/B 均衡
    if (Math.abs(abDiff) > 1) {
      const more: ProductKey = abDiff > 0 ? "A" : "B";
      const less: ProductKey = abDiff > 0 ? "B" : "A";

      for (let i = 0; i < config.periods && !adjusted; i++) {
        for (const shift of shifts) {
          // 策略1：增加较少的产品
          if (tryAdjust(productions, i, shift, less, 1, config, allResources[i], designConfig)) {
            adjusted = true;
            break;
          }
          // 策略2：减少较多的产品
          if (tryAdjust(productions, i, shift, more, -1, config, allResources[i], designConfig)) {
            adjusted = true;
            break;
          }
          // 策略3：swap（减少多的 + 增加少的）
          if (tryAdjust(productions, i, shift, more, -1, config, allResources[i], designConfig)) {
            if (tryAdjust(productions, i, shift, less, 1, config, allResources[i], designConfig)) {
              adjusted = true;
              break;
            }
            // 回滚减少
            tryAdjust(productions, i, shift, more, 1, config, allResources[i], designConfig);
          }
        }
      }
    }

    // 尝试调整 C/D 均衡
    if (!adjusted && Math.abs(cdDiff) > 1) {
      const more: ProductKey = cdDiff > 0 ? "C" : "D";
      const less: ProductKey = cdDiff > 0 ? "D" : "C";

      for (let i = 0; i < config.periods && !adjusted; i++) {
        for (const shift of shifts) {
          if (tryAdjust(productions, i, shift, less, 1, config, allResources[i], designConfig)) {
            adjusted = true;
            break;
          }
          if (tryAdjust(productions, i, shift, more, -1, config, allResources[i], designConfig)) {
            adjusted = true;
            break;
          }
          if (tryAdjust(productions, i, shift, more, -1, config, allResources[i], designConfig)) {
            if (tryAdjust(productions, i, shift, less, 1, config, allResources[i], designConfig)) {
              adjusted = true;
              break;
            }
            tryAdjust(productions, i, shift, more, 1, config, allResources[i], designConfig);
          }
        }
      }
    }

    if (!adjusted) break;
  }
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 全局最优求解（三层联动）
 */
export function solveOptimal(
  config: GlobalConfig,
  designConfig?: DesignPlanConfig | null,
): SolverResult {
  const startTime = performance.now();

  // ---- 第一层：资源规划 ----
  const decisions = solveResourcePlan(config, designConfig);

  // ---- 第二层：产量分配 ----
  const productions: PeriodProduction[] = [];
  for (let i = 0; i < config.periods; i++) {
    const period = i + 1;
    const resources = calcChainedResources(i, config, decisions);
    const production = solvePeriodProduction(resources, config, period, designConfig);
    productions.push(production);
  }

  // ---- 第三层：均衡修正（已移除：AB差/CD差约束可能导致产量不合理） ----
  // balanceProducts(productions, config, decisions, designConfig);

  // ---- 计算结果指标 ----
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

/**
 * 单期最优求解（仅第二层）
 */
export function solveSinglePeriod(
  resources: PeriodResources,
  config: GlobalConfig,
  period: number,
  designConfig?: DesignPlanConfig | null,
): PeriodProduction {
  return solvePeriodProduction(resources, config, period, designConfig);
}

/**
 * 仅求解资源决策（第一层）
 */
export function solveResourceDecisions(
  config: GlobalConfig,
  designConfig?: DesignPlanConfig | null,
): PeriodDecision[] {
  return solveResourcePlan(config, designConfig);
}
