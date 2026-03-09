/**
 * engine.ts — iBizSim 核心计算引擎
 *
 * 实现：
 * - 资源参数迭代计算（期初人数、机器数、雇佣/解雇约束）
 * - 6个约束检查点验证
 * - 各班次人力/机器消耗计算
 * - 多期联动计算
 *
 * 所有计算公式严格来自 RULE_FORMULAS.md
 */

import {
  type ProductSpec,
  type ShiftProduction,
  type PeriodProduction,
  type PeriodResources,
  type ConstraintResults,
  type PeriodResult,
  type PeriodDecision,
  type PeriodFinancials,
  type GlobalConfig,
  getMachineCoeff,
  getLaborCoeff,
  emptyPeriodProduction,
} from "./data";

// ============================================================
// 1. 基础计算函数
// ============================================================

/**
 * 计算一个班次的人力消耗
 * = Σ(各产品产量 × 对应人力系数)
 */
export function calcLaborUsed(
  shift: ShiftProduction,
  products: ProductSpec[]
): number {
  const [pA, pB, pC, pD] = products;
  return (
    shift.A * getLaborCoeff(pA) +
    shift.B * getLaborCoeff(pB) +
    shift.C * getLaborCoeff(pC) +
    shift.D * getLaborCoeff(pD)
  );
}

/**
 * 计算一个班次的机器消耗
 * = Σ(各产品产量 × 对应机器系数)
 */
export function calcMachineUsed(
  shift: ShiftProduction,
  products: ProductSpec[]
): number {
  const [pA, pB, pC, pD] = products;
  return (
    shift.A * getMachineCoeff(pA) +
    shift.B * getMachineCoeff(pB) +
    shift.C * getMachineCoeff(pC) +
    shift.D * getMachineCoeff(pD)
  );
}

// ============================================================
// 2. 资源参数计算
// ============================================================

/**
 * 计算单期的资源参数
 *
 * @param period 期数（1-based）
 * @param config 全局配置
 * @param decision 用户决策（购买/雇佣/解雇）
 * @param prevResources 上一期的资源参数（第1期为 null）
 * @param prevPrevPurchase 两期前的购买机器数（用于机器到货计算）
 */
export function calcPeriodResources(
  period: number,
  config: GlobalConfig,
  decision: PeriodDecision,
  prevResources: PeriodResources | null,
  prevPrevPurchase: number
): PeriodResources {
  // 本期机器：P1 由用户输入初始值；P2+ = 上期机器 + 两期前购买
  const machines =
    period === 1
      ? config.initialMachines
      : (prevResources!.machines + prevPrevPurchase);

  // 期初人数：P1 由用户输入初始值；P2+ = 上期期初 + 上期雇佣 - 上期解雇
  const initialWorkers =
    period === 1
      ? config.initialWorkers
      : (prevResources!.initialWorkers + prevResources!.hired - prevResources!.fired);

  // 最少解雇 = ⌈期初人数 × minFireRate%⌉
  const minFire = Math.ceil(initialWorkers * (config.minFireRate / 100));

  // 本期解雇（用户决策，不得低于最少解雇）
  const fired = Math.max(decision.fired, minFire);

  // 最大雇佣 = ⌊期初人数 × maxHireRate%⌋
  const maxHire = Math.floor(initialWorkers * (config.maxHireRate / 100));

  // 本期雇佣（用户决策，不得超过最大雇佣）
  const hired = Math.min(decision.hired, maxHire);

  // 总可用人数 = 期初人数 - 本期解雇 + 本期雇佣 × (newWorkerEfficiency / 100)
  const totalAvailableWorkers =
    initialWorkers - fired + hired * (config.newWorkerEfficiency / 100);

  return {
    machines,
    machinesPurchased: decision.machinesPurchased,
    initialWorkers,
    minFire,
    fired,
    maxHire,
    hired,
    totalAvailableWorkers,
  };
}

// ============================================================
// 3. 约束检查
// ============================================================

/**
 * 计算6个约束检查点
 *
 * 公式来自 RULE_FORMULAS.md 第5节：
 * C1: 可用人数-一班后 = 总可用人数 - 一正消耗人力 - 二正消耗人力
 * C2: 可用人数-一加后 = 一正消耗人力 - 一加消耗人力 × 2
 * C4: 可用人数-二加后 = 二正消耗人力 - 二加消耗人力 × 2
 * C5: 可用机器-一班后 = 本期机器 - 一正消耗机器
 * C7: 可用机器-二班后 = 本期机器 - 二正消耗机器 - 一加消耗机器 × 2
 * C8: 可用机器-二加后 = 本期机器 - 二加消耗机器 × 2
 */
export function calcConstraints(
  production: PeriodProduction,
  resources: PeriodResources,
  products: ProductSpec[]
): ConstraintResults {
  // 各班次人力消耗
  const laborShift1 = calcLaborUsed(production.shift1, products);
  const laborOt1 = calcLaborUsed(production.ot1, products);
  const laborShift2 = calcLaborUsed(production.shift2, products);
  const laborOt2 = calcLaborUsed(production.ot2, products);

  // 各班次机器消耗
  const machineShift1 = calcMachineUsed(production.shift1, products);
  const machineOt1 = calcMachineUsed(production.ot1, products);
  const machineShift2 = calcMachineUsed(production.shift2, products);
  const machineOt2 = calcMachineUsed(production.ot2, products);

  return {
    // C1: 一班和二班共享人力池
    c1_workersAfterShift1:
      resources.totalAvailableWorkers - laborShift1 - laborShift2,

    // C2: 一加只能用一班工人，加班消耗翻倍
    c2_workersAfterOt1: laborShift1 - laborOt1 * 2,

    // C4: 二加只能用二班工人，加班消耗翻倍
    c4_workersAfterOt2: laborShift2 - laborOt2 * 2,

    // C5: 一班结束后剩余机器
    c5_machinesAfterShift1: resources.machines - machineShift1,

    // C7: 一加的机器消耗翻倍后从二班机器池中扣除
    c7_machinesAfterShift2:
      resources.machines - machineShift2 - machineOt1 * 2,

    // C8: 二加的机器消耗翻倍
    c8_machinesAfterOt2: resources.machines - machineOt2 * 2,
  };
}

// ============================================================
// 4. 财务计算
// ============================================================

/**
 * 计算单期的财务数据
 *
 * 收入 = Σ(各产品总产量 × 对应售价)
 * 原材料成本 = Σ(各产品总产量 × 原材料需求 × 原材料单价)
 * 人工成本(正班) = (期初人数 - 本期解雇) × 正班工资
 * 人工成本(加班) = (一加消耗人力 + 二加消耗人力) × 正班工资 × 加班倍率
 * 雇佣成本 = 本期雇佣 × 雇佣单价
 * 解雇成本 = 本期解雇 × 解雇单价
 * 机器购买成本 = 本期购买 × 机器单价
 * 机器维护成本 = 本期机器 × 维护单价
 */
export function calcPeriodFinancials(
  totalOutput: { A: number; B: number; C: number; D: number },
  resources: PeriodResources,
  laborUsed: { shift1: number; ot1: number; shift2: number; ot2: number },
  config: GlobalConfig
): PeriodFinancials {
  const pf = config.productFinancials;
  const lc = config.laborCosts;
  const mc = config.machineCosts;
  const ic = config.inventoryCosts;
  const products = config.products;

  // 收入计算
  const revenueA = totalOutput.A * (pf[0]?.sellingPrice || 0);
  const revenueB = totalOutput.B * (pf[1]?.sellingPrice || 0);
  const revenueC = totalOutput.C * (pf[2]?.sellingPrice || 0);
  const revenueD = totalOutput.D * (pf[3]?.sellingPrice || 0);
  const totalRevenue = revenueA + revenueB + revenueC + revenueD;

  // 原材料成本 = 产量 × 原材料需求 × 原材料单价
  const matCostA = totalOutput.A * (products[0]?.rawMaterial || 0) * (pf[0]?.materialUnitCost || 0);
  const matCostB = totalOutput.B * (products[1]?.rawMaterial || 0) * (pf[1]?.materialUnitCost || 0);
  const matCostC = totalOutput.C * (products[2]?.rawMaterial || 0) * (pf[2]?.materialUnitCost || 0);
  const matCostD = totalOutput.D * (products[3]?.rawMaterial || 0) * (pf[3]?.materialUnitCost || 0);
  const totalMatCost = matCostA + matCostB + matCostC + matCostD;

  // 人工成本（正班）= 实际在岗人数 × 工资
  const activeWorkers = resources.initialWorkers - resources.fired + resources.hired;
  const laborCostNormal = activeWorkers * lc.normalWage;

  // 人工成本（加班）= 加班消耗人力 × 工资 × 加班倍率
  const overtimeLabor = laborUsed.ot1 + laborUsed.ot2;
  const laborCostOvertime = overtimeLabor * lc.normalWage * lc.overtimeMultiplier;

  // 雇佣/解雇成本
  const hiringCost = resources.hired * lc.hiringCost;
  const firingCost = resources.fired * lc.firingCost;

  // 机器成本
  const machinePurchaseCost = resources.machinesPurchased * mc.purchasePrice;
  const machineMaintenanceCost = resources.machines * mc.maintenanceCost;

  // 库存持有成本（简化版：假设全部售出，库存成本为0）
  const inventoryHoldingCost = 0;

  // 总成本
  const totalCost =
    totalMatCost +
    laborCostNormal +
    laborCostOvertime +
    hiringCost +
    firingCost +
    machinePurchaseCost +
    machineMaintenanceCost +
    inventoryHoldingCost;

  // 净利润
  const netProfit = totalRevenue - totalCost;

  return {
    revenue: { A: revenueA, B: revenueB, C: revenueC, D: revenueD, total: totalRevenue },
    materialCost: { A: matCostA, B: matCostB, C: matCostC, D: matCostD, total: totalMatCost },
    laborCostNormal,
    laborCostOvertime,
    hiringCost,
    firingCost,
    machinePurchaseCost,
    machineMaintenanceCost,
    inventoryHoldingCost,
    totalCost,
    netProfit,
  };
}

// ============================================================
// 5. 单期完整计算
// ============================================================

/**
 * 计算单期的完整结果
 */
export function calcPeriodResult(
  period: number,
  production: PeriodProduction,
  resources: PeriodResources,
  config: GlobalConfig
): PeriodResult {
  const products = config.products;
  const constraints = calcConstraints(production, resources, products);

  // 各班次资源消耗
  const laborUsed = {
    shift1: calcLaborUsed(production.shift1, products),
    ot1: calcLaborUsed(production.ot1, products),
    shift2: calcLaborUsed(production.shift2, products),
    ot2: calcLaborUsed(production.ot2, products),
  };

  const machineUsed = {
    shift1: calcMachineUsed(production.shift1, products),
    ot1: calcMachineUsed(production.ot1, products),
    shift2: calcMachineUsed(production.shift2, products),
    ot2: calcMachineUsed(production.ot2, products),
  };

  // 各产品总产量
  const totalOutput = {
    A: production.shift1.A + production.ot1.A + production.shift2.A + production.ot2.A,
    B: production.shift1.B + production.ot1.B + production.shift2.B + production.ot2.B,
    C: production.shift1.C + production.ot1.C + production.shift2.C + production.ot2.C,
    D: production.shift1.D + production.ot1.D + production.shift2.D + production.ot2.D,
  };

  // 财务计算
  const financials = calcPeriodFinancials(totalOutput, resources, laborUsed, config);

  return {
    period,
    production,
    resources,
    constraints,
    laborUsed,
    machineUsed,
    totalOutput,
    financials,
  };
}

// ============================================================
// 5. 多期联动计算
// ============================================================

/**
 * 计算所有期数的完整结果
 *
 * @param config 全局配置
 * @param productions 各期排产数据（长度 = config.periods）
 * @param decisions 各期资源决策（长度 = config.periods）
 * @returns 各期计算结果
 */
export function calcAllPeriods(
  config: GlobalConfig,
  productions: PeriodProduction[],
  decisions: PeriodDecision[]
): PeriodResult[] {
  const results: PeriodResult[] = [];

  for (let i = 0; i < config.periods; i++) {
    const period = i + 1;
    const prevResources = i > 0 ? results[i - 1].resources : null;
    // 购买机器两期后到货
    const prevPrevPurchase = i >= 2 ? decisions[i - 2].machinesPurchased : 0;

    const resources = calcPeriodResources(
      period,
      config,
      decisions[i],
      prevResources,
      prevPrevPurchase
    );

    const production = productions[i] || emptyPeriodProduction();
    const result = calcPeriodResult(period, production, resources, config);
    results.push(result);
  }

  return results;
}

// ============================================================
// 6. 默认决策生成
// ============================================================

/**
 * 根据 rule.xls 中的默认雇佣策略生成各期决策
 *
 * P1-P3: 最大雇佣（快速扩张期）
 * P4: 不雇佣（人力已充足）
 * P5-P8: 雇佣 = 解雇（维持人力平衡）
 */
export function generateDefaultDecisions(config: GlobalConfig): PeriodDecision[] {
  const decisions: PeriodDecision[] = [];

  // 需要迭代计算每期的期初人数来确定雇佣/解雇数
  let currentInitialWorkers = config.initialWorkers;

  for (let i = 0; i < config.periods; i++) {
    const period = i + 1;
    const minFire = Math.ceil(currentInitialWorkers * (config.minFireRate / 100));
    const maxHire = Math.floor(currentInitialWorkers * (config.maxHireRate / 100));

    let fired: number;
    let hired: number;

    if (period <= 3) {
      // P1-P3: 最少解雇，最大雇佣
      fired = minFire;
      hired = maxHire;
    } else if (period === 4) {
      // P4: 最少解雇，不雇佣
      fired = minFire;
      hired = 0;
    } else {
      // P5-P8: 雇佣 = 解雇（维持平衡）
      fired = minFire;
      hired = minFire;
    }

    decisions.push({
      machinesPurchased: 0,
      fired,
      hired,
    });

    // 迭代计算下一期的期初人数
    currentInitialWorkers = currentInitialWorkers + hired - fired;
  }

  return decisions;
}

// ============================================================
// 7. 工具函数
// ============================================================

/** 获取约束状态：pass(接近0=达标) / warning(偏大) / fail(超限) */
export function getConstraintStatus(
  value: number
): "pass" | "warning" | "fail" {
  if (value < -0.001) return "fail";   // 超限（红）
  if (value <= 5) return "pass";       // 接近0 = 达标（绿）
  return "warning";                     // 偏大（黄）
}

/** 格式化约束值为字符串 */
export function formatConstraintValue(value: number): string {
  return value.toFixed(3);
}

/** 计算工人利用率（百分比） */
export function calcWorkerUtilization(result: PeriodResult): number {
  const totalLabor =
    result.laborUsed.shift1 + result.laborUsed.shift2;
  if (result.resources.totalAvailableWorkers === 0) return 0;
  return Math.min(
    100,
    Math.round((totalLabor / result.resources.totalAvailableWorkers) * 100)
  );
}

/** 计算机器利用率（百分比，基于一班） */
export function calcMachineUtilization(result: PeriodResult): number {
  const maxMachineUsed = Math.max(
    result.machineUsed.shift1,
    result.machineUsed.shift2
  );
  if (result.resources.machines === 0) return 0;
  return Math.min(
    100,
    Math.round((maxMachineUsed / result.resources.machines) * 100)
  );
}

/** 计算总产量 */
export function calcTotalProduction(result: PeriodResult): number {
  return (
    result.totalOutput.A +
    result.totalOutput.B +
    result.totalOutput.C +
    result.totalOutput.D
  );
}
