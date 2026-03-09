/**
 * optimizer.ts — 最优排产求解器
 *
 * 基于贪心策略的排产优化算法：
 * 1. 根据颜色映射（必填/选填/自由）确定哪些单元格需要分配产量
 * 2. 在人力和机器约束下，尽量填满产能
 *
 * 约束模型（来自 engine.ts calcConstraints）：
 * - C1: 总可用人数 >= 一班人力消耗 + 二班人力消耗
 * - C2: 一班人力消耗 >= 一加人力消耗 × 2
 * - C4: 二班人力消耗 >= 二加人力消耗 × 2
 * - C5: 本期机器 >= 一班机器消耗
 * - C7: 本期机器 >= 二班机器消耗 + 一加机器消耗 × 2
 * - C8: 本期机器 >= 二加机器消耗 × 2
 */

import type {
  PeriodProduction,
  PeriodDecision,
  GlobalConfig,
  PeriodResources,
  ProductSpec,
} from "./data";
import {
  emptyPeriodProduction,
  PERIOD_COLOR_MAPS,
  getLaborCoeff,
  getMachineCoeff,
} from "./data";
import { calcPeriodResources } from "./engine";
import type {
  DesignPlanConfig,
  CellConfig,
} from "./designerTypes";

// ============================================================
// 产品名称到 config.products 索引的映射
// config.products = [A(0), B(1), C(2), D(3)]
// ============================================================
const PRODUCT_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

type ShiftKey = "shift1" | "ot1" | "shift2" | "ot2";
type ProductKey = "A" | "B" | "C" | "D";

interface CellAllocation {
  product: ProductKey;
  shift: ShiftKey;
  priority: "required" | "optional" | "free";
  fixedValue: number | null;
  rangeMin: number;
  rangeMax: number;
  laborCoeff: number;
  machineCoeff: number;
}

// ============================================================
// 1. 单期最优排产
// ============================================================

export function optimizeSinglePeriod(
  resources: PeriodResources,
  config: GlobalConfig,
  period: number,
  designConfig?: DesignPlanConfig | null,
): PeriodProduction {
  const products = config.products;
  const colorMap = PERIOD_COLOR_MAPS[period] || PERIOD_COLOR_MAPS[8];
  const production = emptyPeriodProduction();

  // 收集所有需要分配的单元格
  const cells: CellAllocation[] = [];
  const productKeys: ProductKey[] = ["A", "B", "C", "D"];
  const shiftKeys: ShiftKey[] = ["shift1", "ot1", "shift2", "ot2"];

  for (const product of productKeys) {
    const pIdx = PRODUCT_INDEX[product];
    const spec = products[pIdx];
    if (!spec) continue;

    const laborCoeff = getLaborCoeff(spec);
    const machineCoeff = getMachineCoeff(spec);

    for (const shift of shiftKeys) {
      let priority: "required" | "optional" | "free" | null = null;
      let fixedValue: number | null = null;
      let rangeMin = 0;
      let rangeMax = 999;

      if (designConfig) {
        const periodConfig = designConfig.periodProductions[period - 1];
        if (periodConfig) {
          const cellCfg: CellConfig = periodConfig[shift][product];
          if (cellCfg.mode === "blank") {
            production[shift][product] = 0;
            continue; // 留空，跳过
          }
          if (cellCfg.mode === "fixed") {
            fixedValue = cellCfg.fixedValue;
            priority = "required"; // 固定值最高优先
          } else if (cellCfg.mode === "required") {
            priority = "required";
          } else if (cellCfg.mode === "optional") {
            priority = "optional";
          } else {
            priority = "free"; // fallback
          }
          rangeMin = cellCfg.range.min;
          rangeMax = cellCfg.range.max;
        } else {
          priority = "free";
        }
      } else {
        // 无设计方案时，使用颜色映射
        const cellColor = colorMap[product]?.[shift];
        if (cellColor === "disabled" || cellColor === "zero") {
          production[shift][product] = 0;
          continue;
        }
        if (cellColor === "required") priority = "required";
        else if (cellColor === "optional") priority = "optional";
        else priority = "free";
      }

      if (priority === null) continue;

      cells.push({
        product,
        shift,
        priority,
        fixedValue,
        rangeMin,
        rangeMax,
        laborCoeff,
        machineCoeff,
      });
    }
  }

  // 按优先级排序：required > optional > free
  // 同优先级内，正班优先于加班
  const priorityOrder = { required: 0, optional: 1, free: 2 };
  const shiftOrder: Record<string, number> = { shift1: 0, shift2: 1, ot1: 2, ot2: 3 };

  cells.sort((a, b) => {
    const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pd !== 0) return pd;
    return shiftOrder[a.shift] - shiftOrder[b.shift];
  });

  // 资源跟踪
  let totalLaborRemaining = resources.totalAvailableWorkers;
  let totalMachines = resources.machines;

  // 各班次已消耗资源
  let shift1Labor = 0;
  let shift2Labor = 0;
  let shift1Machine = 0;
  let shift2Machine = 0;
  let ot1Labor = 0;
  let ot1Machine = 0;
  let ot2Labor = 0;
  let ot2Machine = 0;

  // 分配产量
  for (const cell of cells) {
    const { product, shift, fixedValue, rangeMin, rangeMax, laborCoeff, machineCoeff } = cell;

    if (fixedValue !== null) {
      // 固定值直接设置
      production[shift][product] = fixedValue;
      updateResources(shift, fixedValue, laborCoeff, machineCoeff);
      continue;
    }

    // 计算此单元格可分配的最大产量
    let maxQty = rangeMax;

    if (shift === "shift1" || shift === "shift2") {
      // 正班：受总可用人数约束（C1）和机器约束（C5 for shift1）
      if (laborCoeff > 0) {
        maxQty = Math.min(maxQty, Math.floor(totalLaborRemaining / laborCoeff));
      }
      if (shift === "shift1" && machineCoeff > 0) {
        // C5: 总机器 >= 一班机器消耗
        const remainMachine = totalMachines - shift1Machine;
        maxQty = Math.min(maxQty, Math.floor(remainMachine / machineCoeff));
      }
      if (shift === "shift2" && machineCoeff > 0) {
        // C7 部分：总机器 >= 二班机器 + 一加机器×2
        // 二班可用机器 = 总机器 - ot1Machine*2 - shift2Machine（已分配的）
        const remainMachine = totalMachines - ot1Machine * 2 - shift2Machine;
        maxQty = Math.min(maxQty, Math.floor(remainMachine / machineCoeff));
      }
    } else if (shift === "ot1") {
      // C2: 一班人力消耗 >= (已有ot1人力 + 新增) × 2
      // => 新增 <= (shift1Labor - ot1Labor*2) / (laborCoeff*2)
      if (laborCoeff > 0) {
        const remainLabor = shift1Labor - ot1Labor * 2;
        const maxByLabor = Math.floor(remainLabor / (laborCoeff * 2));
        maxQty = Math.min(maxQty, maxByLabor);
      }
      // C7: 总机器 >= 二班机器 + (已有ot1机器 + 新增)×2
      if (machineCoeff > 0) {
        const remainMachine = totalMachines - shift2Machine - ot1Machine * 2;
        const maxByMachine = Math.floor(remainMachine / (machineCoeff * 2));
        maxQty = Math.min(maxQty, maxByMachine);
      }
    } else if (shift === "ot2") {
      // C4: 二班人力消耗 >= (已有ot2人力 + 新增) × 2
      if (laborCoeff > 0) {
        const remainLabor = shift2Labor - ot2Labor * 2;
        const maxByLabor = Math.floor(remainLabor / (laborCoeff * 2));
        maxQty = Math.min(maxQty, maxByLabor);
      }
      // C8: 总机器 >= (已有ot2机器 + 新增)×2
      if (machineCoeff > 0) {
        const remainMachine = totalMachines - ot2Machine * 2;
        const maxByMachine = Math.floor(remainMachine / (machineCoeff * 2));
        maxQty = Math.min(maxQty, maxByMachine);
      }
    }

    maxQty = Math.max(0, maxQty);
    const qty = Math.max(rangeMin, maxQty);

    production[shift][product] = qty;
    updateResources(shift, qty, laborCoeff, machineCoeff);
  }

  function updateResources(shift: ShiftKey, qty: number, laborCoeff: number, machineCoeff: number) {
    if (shift === "shift1") {
      shift1Labor += qty * laborCoeff;
      shift1Machine += qty * machineCoeff;
      totalLaborRemaining -= qty * laborCoeff;
    } else if (shift === "shift2") {
      shift2Labor += qty * laborCoeff;
      shift2Machine += qty * machineCoeff;
      totalLaborRemaining -= qty * laborCoeff;
    } else if (shift === "ot1") {
      ot1Labor += qty * laborCoeff;
      ot1Machine += qty * machineCoeff;
    } else if (shift === "ot2") {
      ot2Labor += qty * laborCoeff;
      ot2Machine += qty * machineCoeff;
    }
  }

  return production;
}

// ============================================================
// 2. 全局最优排产（1-8期联动）
// ============================================================

export function optimizeAllPeriods(
  config: GlobalConfig,
  decisions: PeriodDecision[],
  designConfig?: DesignPlanConfig | null,
): PeriodProduction[] {
  const productions: PeriodProduction[] = [];

  for (let i = 0; i < config.periods; i++) {
    const period = i + 1;

    // 逐期计算资源（需要上一期的资源信息）
    let prevResources: PeriodResources | null = null;
    if (i > 0) {
      // 递归计算前面所有期的资源
      prevResources = calcChainedResources(i - 1, config, decisions);
    }
    const prevPrevPurchase = i >= 2 ? decisions[i - 2].machinesPurchased : 0;

    const resources = calcPeriodResources(
      period,
      config,
      decisions[i],
      prevResources,
      prevPrevPurchase
    );

    const optimized = optimizeSinglePeriod(resources, config, period, designConfig);
    productions.push(optimized);
  }

  return productions;
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
