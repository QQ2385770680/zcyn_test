// iBizSim 连续排产计算引擎 v2
// 支持4班次（第一班、一加、第二班、二加）的产品分配
// 实时约束验证（可用人数/机器接近0检查）

const WORK_HOURS = 520;

// 产品规格（固定）
export const PRODUCTS = {
  A: { machineHours: 110, laborHours: 80, materials: 500 },
  B: { machineHours: 150, laborHours: 100, materials: 800 },
  C: { machineHours: 180, laborHours: 110, materials: 1600 },
  D: { machineHours: 280, laborHours: 140, materials: 2500 },
} as const;

export type ProductKey = 'A' | 'B' | 'C' | 'D';
export const PRODUCT_KEYS: ProductKey[] = ['A', 'B', 'C', 'D'];

// 产品结构比例（固定，用于按比例计算）
export const PRODUCT_RATIO: Record<ProductKey, number> = { A: 9, B: 6, C: 4, D: 3 };

// 每单位产品需要的机器/人力
export function getMachinePerUnit(p: ProductKey) {
  return PRODUCTS[p].machineHours / WORK_HOURS;
}
export function getLaborPerUnit(p: ProductKey) {
  return PRODUCTS[p].laborHours / WORK_HOURS;
}

// 一组产品的机器/人力需求
function getGroupMachineNeed() {
  return PRODUCT_KEYS.reduce((s, p) => s + PRODUCT_RATIO[p] * getMachinePerUnit(p), 0);
}
function getGroupLaborNeed() {
  return PRODUCT_KEYS.reduce((s, p) => s + PRODUCT_RATIO[p] * getLaborPerUnit(p), 0);
}

// ============================================================
// 班次产量分配
// ============================================================
export type ShiftName = 'shift1' | 'ot1' | 'shift2' | 'ot2';
export const SHIFT_NAMES: ShiftName[] = ['shift1', 'ot1', 'shift2', 'ot2'];
export const SHIFT_LABELS: Record<ShiftName, string> = {
  shift1: '第一班',
  ot1: '一加',
  shift2: '第二班',
  ot2: '二加',
};

// 每个班次每种产品的产量
export type ShiftProduction = Record<ProductKey, number>;

// 一期的所有班次产量
export type PeriodShiftPlan = Record<ShiftName, ShiftProduction>;

function emptyShiftProduction(): ShiftProduction {
  return { A: 0, B: 0, C: 0, D: 0 };
}

export function emptyPeriodShiftPlan(): PeriodShiftPlan {
  return {
    shift1: emptyShiftProduction(),
    ot1: emptyShiftProduction(),
    shift2: emptyShiftProduction(),
    ot2: emptyShiftProduction(),
  };
}

// ============================================================
// 用户可调参数
// ============================================================
export type HireStrategyType = 'max_hire' | 'no_hire' | 'hire_eq_fire' | 'custom';

export interface PeriodConfig {
  hireStrategy: HireStrategyType;
  customHire?: number;
  customFire?: number;
  machinePurchase?: number;
  shiftPlan: PeriodShiftPlan;
}

export interface SimulatorParams {
  initialMachines: number;
  initialWorkers: number;
  totalPeriods: number;
  fireRateMin: number;    // 最低解雇比例，默认 0.03
  fireRateMax: number;    // 最大解雇比例，默认 0.10
  hireRate: number;       // 最大雇佣比例，默认 0.50
  newWorkerEfficiency: number; // 新工人效率，默认 0.25
  periodConfigs: PeriodConfig[];
}

// ============================================================
// 约束状态
// ============================================================
export interface ConstraintStatus {
  value: number;
  status: 'good' | 'warning' | 'danger' | 'over'; // 接近0=good, 偏大=warning, 过大=danger, 负数=over
}

function getConstraintStatus(value: number, total: number): ConstraintStatus {
  if (value < -0.01) return { value, status: 'over' };
  const ratio = total > 0 ? value / total : 0;
  if (ratio <= 0.02) return { value, status: 'good' };
  if (ratio <= 0.10) return { value, status: 'warning' };
  return { value, status: 'danger' };
}

// ============================================================
// 计算结果
// ============================================================
export interface PeriodResult {
  period: number;
  machines: number;
  initialWorkers: number;
  minFire: number;
  maxFire: number;
  fire: number;
  maxHire: number;
  hire: number;
  hireStrategy: string;
  totalAvailableWorkers: number; // 期初-解雇+雇佣*效率

  // 班次产量
  shiftPlan: PeriodShiftPlan;

  // 各班次产品总量
  shift1Total: number;
  ot1Total: number;
  shift2Total: number;
  ot2Total: number;
  periodTotal: number;

  // 可用人数（3个检查点）
  availWorkers_afterShift1: ConstraintStatus; // 一班后
  availWorkers_afterOT1: ConstraintStatus;    // 一加后
  availWorkers_afterOT2: ConstraintStatus;    // 二加后

  // 可用机器（3个检查点）
  availMachines_afterShift1: ConstraintStatus; // 一班后
  availMachines_afterShift2: ConstraintStatus; // 二班后（含一加）
  availMachines_afterOT2: ConstraintStatus;    // 二加后

  // 按比例计算的产能（保留旧功能）
  singleShiftGroups: number;
  singleShiftBottleneck: string;
  singleShiftProduction: Record<ProductKey, number>;
  singleShiftTotal: number;
  doubleShiftGroupsPerShift: number;
  doubleShiftBottleneck: string;
  doubleShiftProduction: Record<ProductKey, number>;
  doubleShiftTotal: number;

  // 利用率
  singleMachineUtil: number;
  singleLaborUtil: number;
  doubleMachineUtil: number;
  doubleLaborUtil: number;

  // 原材料
  shiftMaterials: Record<ProductKey, number>;
  shiftMaterialsTotal: number;
}

export interface SimulatorResult {
  periods: PeriodResult[];
  groupMachineNeed: number;
  groupLaborNeed: number;
}

// ============================================================
// 默认参数
// ============================================================
export function getDefaultParams(): SimulatorParams {
  const periodConfigs: PeriodConfig[] = [];
  for (let i = 0; i < 9; i++) {
    if (i < 3) {
      periodConfigs.push({ hireStrategy: 'max_hire', machinePurchase: 0, shiftPlan: emptyPeriodShiftPlan() });
    } else if (i === 3) {
      periodConfigs.push({ hireStrategy: 'no_hire', machinePurchase: 0, shiftPlan: emptyPeriodShiftPlan() });
    } else {
      periodConfigs.push({ hireStrategy: 'hire_eq_fire', machinePurchase: 0, shiftPlan: emptyPeriodShiftPlan() });
    }
  }
  return {
    initialMachines: 157,
    initialWorkers: 113,
    totalPeriods: 9,
    fireRateMin: 0.03,
    fireRateMax: 0.10,
    hireRate: 0.50,
    newWorkerEfficiency: 0.25,
    periodConfigs,
  };
}

// ============================================================
// 核心计算函数
// ============================================================
export function calculateProduction(params: SimulatorParams): SimulatorResult {
  const groupMachine = getGroupMachineNeed();
  const groupLabor = getGroupLaborNeed();

  const results: PeriodResult[] = [];

  for (let i = 0; i < params.totalPeriods; i++) {
    const periodNum = i + 1;
    const config = params.periodConfigs[i] || {
      hireStrategy: 'hire_eq_fire' as HireStrategyType,
      machinePurchase: 0,
      shiftPlan: emptyPeriodShiftPlan(),
    };

    // 机器数量：初始 + 两期前购买的机器
    let machines = params.initialMachines;
    if (i >= 2) {
      for (let j = 0; j <= i - 2; j++) {
        machines += (params.periodConfigs[j]?.machinePurchase || 0);
      }
    }

    // 期初人数
    let initialWorkers: number;
    if (i === 0) {
      initialWorkers = params.initialWorkers;
    } else {
      const prev = results[i - 1];
      initialWorkers = prev.initialWorkers + prev.hire - prev.fire;
    }

    // 解雇
    const minFire = Math.ceil(initialWorkers * params.fireRateMin);
    const maxFire = Math.floor(initialWorkers * params.fireRateMax);
    const fire = config.customFire !== undefined
      ? Math.max(config.customFire, minFire)
      : minFire;

    // 雇佣
    const maxHire = Math.floor(initialWorkers * params.hireRate);
    let hire: number;
    let hireStrategyLabel: string;

    switch (config.hireStrategy) {
      case 'max_hire':
        hire = maxHire;
        hireStrategyLabel = '最大雇佣';
        break;
      case 'no_hire':
        hire = 0;
        hireStrategyLabel = '不雇佣';
        break;
      case 'hire_eq_fire':
        hire = fire;
        hireStrategyLabel = '雇佣=解雇';
        break;
      case 'custom':
        hire = Math.min(config.customHire || 0, maxHire);
        hireStrategyLabel = `自定义(${hire})`;
        break;
      default:
        hire = fire;
        hireStrategyLabel = '雇佣=解雇';
    }

    // 总可用人数 = 期初 - 解雇 + 雇佣*效率
    const totalAvailableWorkers = parseFloat(
      (initialWorkers - fire + hire * params.newWorkerEfficiency).toFixed(3)
    );

    // ============================================================
    // 班次产量计算
    // ============================================================
    const plan = config.shiftPlan || emptyPeriodShiftPlan();

    // 各班次总产量
    const shift1Total = PRODUCT_KEYS.reduce((s, p) => s + (plan.shift1[p] || 0), 0);
    const ot1Total = PRODUCT_KEYS.reduce((s, p) => s + (plan.ot1[p] || 0), 0);
    const shift2Total = PRODUCT_KEYS.reduce((s, p) => s + (plan.shift2[p] || 0), 0);
    const ot2Total = PRODUCT_KEYS.reduce((s, p) => s + (plan.ot2[p] || 0), 0);
    const periodTotal = shift1Total + ot1Total + shift2Total + ot2Total;

    // ============================================================
    // 可用人数计算（3个检查点）
    // ============================================================

    // 一班后可用人数 = 总可用人数 - (一正+二正产品消耗人力)
    const shift1LaborUsed = PRODUCT_KEYS.reduce(
      (s, p) => s + (plan.shift1[p] || 0) * getLaborPerUnit(p), 0
    );
    const shift2LaborUsed = PRODUCT_KEYS.reduce(
      (s, p) => s + (plan.shift2[p] || 0) * getLaborPerUnit(p), 0
    );
    const availWorkersAfterShift1 = totalAvailableWorkers - shift1LaborUsed - shift2LaborUsed;

    // 一加后可用人数 = 一正消耗人力 - 一加消耗人力×2
    const ot1LaborUsed = PRODUCT_KEYS.reduce(
      (s, p) => s + (plan.ot1[p] || 0) * getLaborPerUnit(p) * 2, 0
    );
    const availWorkersAfterOT1 = shift1LaborUsed - ot1LaborUsed;

    // 二加后可用人数 = 二正消耗人力 - 二加消耗人力×2
    const ot2LaborUsed = PRODUCT_KEYS.reduce(
      (s, p) => s + (plan.ot2[p] || 0) * getLaborPerUnit(p) * 2, 0
    );
    const availWorkersAfterOT2 = shift2LaborUsed - ot2LaborUsed;

    // ============================================================
    // 可用机器计算（3个检查点）
    // ============================================================

    // 一班后可用机器 = 本期机器 - 一正产品消耗机器
    const shift1MachineUsed = PRODUCT_KEYS.reduce(
      (s, p) => s + (plan.shift1[p] || 0) * getMachinePerUnit(p), 0
    );
    const availMachinesAfterShift1 = machines - shift1MachineUsed;

    // 二班后可用机器 = 本期机器 - 二正消耗机器 - 一加消耗机器×2
    const shift2MachineUsed = PRODUCT_KEYS.reduce(
      (s, p) => s + (plan.shift2[p] || 0) * getMachinePerUnit(p), 0
    );
    const ot1MachineUsed = PRODUCT_KEYS.reduce(
      (s, p) => s + (plan.ot1[p] || 0) * getMachinePerUnit(p) * 2, 0
    );
    const availMachinesAfterShift2 = machines - shift2MachineUsed - ot1MachineUsed;

    // 二加后可用机器 = 本期机器 - 二加消耗机器×2
    const ot2MachineUsed = PRODUCT_KEYS.reduce(
      (s, p) => s + (plan.ot2[p] || 0) * getMachinePerUnit(p) * 2, 0
    );
    const availMachinesAfterOT2 = machines - ot2MachineUsed;

    // ============================================================
    // 按比例计算的产能（保留旧功能）
    // ============================================================
    const s1MachineGroups = machines / groupMachine;
    const s1LaborGroups = totalAvailableWorkers / groupLabor;
    const s1Groups = Math.min(s1MachineGroups, s1LaborGroups);
    const singleShiftBottleneck = s1MachineGroups < s1LaborGroups ? '机器' : '人力';

    const singleShiftProduction = {} as Record<ProductKey, number>;
    PRODUCT_KEYS.forEach(p => {
      singleShiftProduction[p] = Math.floor(s1Groups * PRODUCT_RATIO[p]);
    });
    const singleShiftTotal = PRODUCT_KEYS.reduce((s, p) => s + singleShiftProduction[p], 0);

    const d2MachineGroups = machines / groupMachine;
    const d2LaborGroups = totalAvailableWorkers / (2 * groupLabor);
    const d2Groups = Math.min(d2MachineGroups, d2LaborGroups);
    const doubleShiftBottleneck = d2MachineGroups < d2LaborGroups ? '机器' : '人力';

    const doubleShiftProduction = {} as Record<ProductKey, number>;
    PRODUCT_KEYS.forEach(p => {
      doubleShiftProduction[p] = Math.floor(d2Groups * PRODUCT_RATIO[p]) * 2;
    });
    const doubleShiftTotal = PRODUCT_KEYS.reduce((s, p) => s + doubleShiftProduction[p], 0);

    // 利用率
    const s1MUsed = PRODUCT_KEYS.reduce((s, p) => s + singleShiftProduction[p] * getMachinePerUnit(p), 0);
    const s1LUsed = PRODUCT_KEYS.reduce((s, p) => s + singleShiftProduction[p] * getLaborPerUnit(p), 0);
    const singleMachineUtil = machines > 0 ? parseFloat((s1MUsed / machines * 100).toFixed(1)) : 0;
    const singleLaborUtil = totalAvailableWorkers > 0 ? parseFloat((s1LUsed / totalAvailableWorkers * 100).toFixed(1)) : 0;

    const dMUsed = PRODUCT_KEYS.reduce((s, p) => s + (doubleShiftProduction[p] / 2) * getMachinePerUnit(p), 0);
    const dLUsed = PRODUCT_KEYS.reduce((s, p) => s + doubleShiftProduction[p] * getLaborPerUnit(p), 0);
    const doubleMachineUtil = machines > 0 ? parseFloat((dMUsed / machines * 100).toFixed(1)) : 0;
    const doubleLaborUtil = totalAvailableWorkers > 0 ? parseFloat((dLUsed / totalAvailableWorkers * 100).toFixed(1)) : 0;

    // 原材料（基于班次排产）
    const shiftMaterials = {} as Record<ProductKey, number>;
    PRODUCT_KEYS.forEach(p => {
      const totalProd = (plan.shift1[p] || 0) + (plan.ot1[p] || 0) + (plan.shift2[p] || 0) + (plan.ot2[p] || 0);
      shiftMaterials[p] = totalProd * PRODUCTS[p].materials;
    });
    const shiftMaterialsTotal = PRODUCT_KEYS.reduce((s, p) => s + shiftMaterials[p], 0);

    results.push({
      period: periodNum,
      machines,
      initialWorkers,
      minFire,
      maxFire,
      fire,
      maxHire,
      hire,
      hireStrategy: hireStrategyLabel,
      totalAvailableWorkers,

      shiftPlan: plan,
      shift1Total,
      ot1Total,
      shift2Total,
      ot2Total,
      periodTotal,

      availWorkers_afterShift1: getConstraintStatus(
        parseFloat(availWorkersAfterShift1.toFixed(3)), totalAvailableWorkers
      ),
      availWorkers_afterOT1: getConstraintStatus(
        parseFloat(availWorkersAfterOT1.toFixed(3)), shift1LaborUsed || 1
      ),
      availWorkers_afterOT2: getConstraintStatus(
        parseFloat(availWorkersAfterOT2.toFixed(3)), shift2LaborUsed || 1
      ),

      availMachines_afterShift1: getConstraintStatus(
        parseFloat(availMachinesAfterShift1.toFixed(3)), machines
      ),
      availMachines_afterShift2: getConstraintStatus(
        parseFloat(availMachinesAfterShift2.toFixed(3)), machines
      ),
      availMachines_afterOT2: getConstraintStatus(
        parseFloat(availMachinesAfterOT2.toFixed(3)), machines
      ),

      singleShiftGroups: parseFloat(s1Groups.toFixed(2)),
      singleShiftBottleneck,
      singleShiftProduction,
      singleShiftTotal,
      doubleShiftGroupsPerShift: parseFloat(d2Groups.toFixed(2)),
      doubleShiftBottleneck,
      doubleShiftProduction,
      doubleShiftTotal,
      singleMachineUtil,
      singleLaborUtil,
      doubleMachineUtil,
      doubleLaborUtil,
      shiftMaterials,
      shiftMaterialsTotal,
    });
  }

  return {
    periods: results,
    groupMachineNeed: parseFloat(groupMachine.toFixed(4)),
    groupLaborNeed: parseFloat(groupLabor.toFixed(4)),
  };
}

// ============================================================
// 最优排产推荐算法
// ============================================================

// 产品每单位消耗的机器和人力（预计算常量）
const MACHINE_PER = {
  A: 110 / WORK_HOURS,
  B: 150 / WORK_HOURS,
  C: 180 / WORK_HOURS,
  D: 280 / WORK_HOURS,
} as const;

const LABOR_PER = {
  A: 80 / WORK_HOURS,
  B: 100 / WORK_HOURS,
  C: 110 / WORK_HOURS,
  D: 140 / WORK_HOURS,
} as const;

/**
 * 最优排产推荐算法
 * 
 * 排产模式（基于用户提供的规则）：
 * - 第一班：C + D 产品 → 目标：一班可用机器接近0
 * - 第二班：B 产品   → 目标：一班可用人数接近0
 * - 一加班：A 产品   → 目标：二班可用机器接近0
 * - 二加班：D + B    → 目标：二加可用机器最小 & 二加可用人数接近0
 * 
 * 求解顺序：
 * 1. 先确定第一班C和D（使一班可用机器接近0）
 * 2. 再确定第二班B（使一班可用人数接近0）
 * 3. 再确定一加A（使二班可用机器接近0）
 * 4. 最后确定二加D和B（使二加可用人数接近0，同时二加可用机器尽量小）
 */
export function optimizeShiftPlan(
  machines: number,
  totalAvailableWorkers: number,
): PeriodShiftPlan {
  const plan = emptyPeriodShiftPlan();

  // ============================================================
  // Step 1: 第一班 C + D → 一班可用机器接近0
  // 约束: machines - C * MACHINE_PER.C - D * MACHINE_PER.D ≈ 0
  // 策略: 在C和D的合理范围内搜索最优组合
  // C范围[100,250], D范围[100,250]
  // ============================================================
  
  let bestShift1Score = Infinity;
  let bestC = 100, bestD = 100;
  
  for (let d = 100; d <= 250; d += 1) {
    // 给定D，求C使一班可用机器接近0
    // machines - C * MACHINE_PER.C - D * MACHINE_PER.D = 0
    // C = (machines - D * MACHINE_PER.D) / MACHINE_PER.C
    const cExact = (machines - d * MACHINE_PER.D) / MACHINE_PER.C;
    const cRounded = Math.round(cExact);
    
    // C必须在[100, 250]范围内
    if (cRounded < 100 || cRounded > 250) continue;
    
    const remaining = machines - cRounded * MACHINE_PER.C - d * MACHINE_PER.D;
    // 不能为负
    if (remaining < -0.5) continue;
    
    const score = Math.abs(remaining);
    if (score < bestShift1Score) {
      bestShift1Score = score;
      bestC = cRounded;
      bestD = d;
    }
  }
  
  plan.shift1.C = bestC;
  plan.shift1.D = bestD;
  
  // ============================================================
  // Step 2: 第二班 B → 一班可用人数接近0
  // 约束: totalAvailableWorkers - shift1Labor - shift2Labor ≈ 0
  // shift1Labor = C * LABOR_PER.C + D * LABOR_PER.D
  // shift2Labor = B * LABOR_PER.B
  // B = (totalAvailableWorkers - shift1Labor) / LABOR_PER.B
  // ============================================================
  
  const shift1Labor = bestC * LABOR_PER.C + bestD * LABOR_PER.D;
  const bExact = (totalAvailableWorkers - shift1Labor) / LABOR_PER.B;
  
  // B还受机器约束限制：二班后可用机器 = machines - B*MACHINE_PER.B - A_ot1*MACHINE_PER.A*2 >= 0
  // 但此时A_ot1还未确定，先用机器上限粗估：B <= machines / MACHINE_PER.B
  // 更精确：一加A的机器消耗也占用机器，所以B的机器上限约为 machines / MACHINE_PER.B
  // 但实际上二班可用机器 = machines - B*MACHINE_PER.B - A*MACHINE_PER.A*2
  // 为避免B过大导致一加A无法分配，限制B使得至少留出一些机器给一加
  // 保守估计：B的机器消耗不超过机器总量的60%（留40%给一加A）
  const bMachineLimit = Math.floor(machines * 0.6 / MACHINE_PER.B);
  let bestB = Math.max(0, Math.min(Math.round(bExact), bMachineLimit));
  
  // 验证不会使可用人数为负
  const availWorkersCheck = totalAvailableWorkers - shift1Labor - bestB * LABOR_PER.B;
  if (availWorkersCheck < -0.5) {
    bestB = Math.max(0, Math.floor(bExact));
    bestB = Math.min(bestB, bMachineLimit);
  }
  
  plan.shift2.B = bestB;
  
  // ============================================================
  // Step 3: 一加 A → 二班可用机器接近0
  // 约束: machines - B * MACHINE_PER.B - A * MACHINE_PER.A * 2 ≈ 0
  // A = (machines - B * MACHINE_PER.B) / (MACHINE_PER.A * 2)
  // ============================================================
  
  const aExact = (machines - bestB * MACHINE_PER.B) / (MACHINE_PER.A * 2);
  let bestA = Math.max(0, Math.round(aExact));
  
  // 验证不会使可用机器为负
  const availMachinesCheck = machines - bestB * MACHINE_PER.B - bestA * MACHINE_PER.A * 2;
  if (availMachinesCheck < -0.5) {
    bestA = Math.max(0, Math.floor(aExact));
  }
  
  plan.ot1.A = bestA;
  
  // ============================================================
  // Step 4: 二加 D + B → 二加可用人数接近0 & 二加可用机器尽量小
  // 
  // 约束1 (二加可用人数): shift2Labor - (D2 * LABOR_PER.D + B2 * LABOR_PER.B) * 2 ≈ 0
  //   shift2Labor = bestB * LABOR_PER.B
  //   D2 * LABOR_PER.D * 2 + B2 * LABOR_PER.B * 2 = bestB * LABOR_PER.B
  //
  // 约束2 (二加可用机器): machines - (D2 * MACHINE_PER.D + B2 * MACHINE_PER.B) * 2 → 最小但≥0
  //
  // 策略: D2从40开始，优先满足约束1求B2，然后检查约束2
  // ============================================================
  
  const shift2Labor = bestB * LABOR_PER.B;
  
  let bestOt2Score = Infinity;
  let bestD2 = 40, bestB2 = 0;
  
  for (let d2 = 40; d2 <= 200; d2 += 1) {
    // 从约束1求B2:
    // shift2Labor - (d2 * LABOR_PER.D + b2 * LABOR_PER.B) * 2 = 0
    // b2 = (shift2Labor / 2 - d2 * LABOR_PER.D) / LABOR_PER.B
    const b2Exact = (shift2Labor / 2 - d2 * LABOR_PER.D) / LABOR_PER.B;
    // 使用floor确保不超限
    const b2Floor = Math.max(0, Math.floor(b2Exact));
    const b2Ceil = Math.max(0, Math.ceil(b2Exact));
    
    // 尝试floor和ceil两个候选值
    for (const b2 of [b2Floor, b2Ceil]) {
      // 检查约束1的满足度（二加可用人数）
      const ot2LaborRemain = shift2Labor - (d2 * LABOR_PER.D + b2 * LABOR_PER.B) * 2;
      if (ot2LaborRemain < -0.5) continue; // 人数不能超限
      
      // 检查约束2（二加可用机器）
      const ot2MachineRemain = machines - (d2 * MACHINE_PER.D + b2 * MACHINE_PER.B) * 2;
      if (ot2MachineRemain < -0.5) continue; // 机器不能超限
      
      // 综合评分：约束1接近0（高权重） + 约束2尽量小（低权重）
      // 同时惩罚负值
      const laborPenalty = ot2LaborRemain < 0 ? Math.abs(ot2LaborRemain) * 10 : Math.abs(ot2LaborRemain);
      const score = laborPenalty * 3 + Math.max(0, ot2MachineRemain);
      
      if (score < bestOt2Score) {
        bestOt2Score = score;
        bestD2 = d2;
        bestB2 = b2;
      }
    }
  }
  
  plan.ot2.D = bestD2;
  plan.ot2.B = bestB2;
  
  return plan;
}

/**
 * 为所有期数生成最优排产推荐
 * 需要先计算每期的machines和totalAvailableWorkers，然后逐期推荐
 */
export function optimizeAllPeriods(params: SimulatorParams): PeriodShiftPlan[] {
  const plans: PeriodShiftPlan[] = [];
  
  // 需要逐期计算，因为每期的人数依赖前一期
  let currentInitialWorkers = params.initialWorkers;
  
  for (let i = 0; i < params.totalPeriods; i++) {
    const config = params.periodConfigs[i];
    
    // 计算本期机器
    let machines = params.initialMachines;
    if (i >= 2) {
      for (let j = 0; j <= i - 2; j++) {
        machines += (params.periodConfigs[j]?.machinePurchase || 0);
      }
    }
    
    // 计算解雇和雇佣
    const minFire = Math.ceil(currentInitialWorkers * params.fireRateMin);
    const maxFire = Math.floor(currentInitialWorkers * params.fireRateMax);
    const fire = config?.customFire !== undefined
      ? Math.max(config.customFire, minFire)
      : minFire;
    
    const maxHire = Math.floor(currentInitialWorkers * params.hireRate);
    let hire: number;
    switch (config?.hireStrategy) {
      case 'max_hire': hire = maxHire; break;
      case 'no_hire': hire = 0; break;
      case 'hire_eq_fire': hire = fire; break;
      case 'custom': hire = Math.min(config.customHire || 0, maxHire); break;
      default: hire = fire;
    }
    
    const totalAvailableWorkers = currentInitialWorkers - fire + hire * params.newWorkerEfficiency;
    
    // 生成本期最优排产
    const plan = optimizeShiftPlan(machines, totalAvailableWorkers);
    plans.push(plan);
    
    // 更新下一期的期初人数
    currentInitialWorkers = currentInitialWorkers + hire - fire;
  }
  
  return plans;
}


// ============================================================
// 第四期雇佣联动预览
// ============================================================

export interface P4LinkagePreview {
  p4Hire: number;
  p5InitialWorkers: number;
  p5MinFire: number;
  p5MaxFire: number;
  p5Fire: number;
  p5MaxHire: number;
  p5Hire: number;
  p5TotalAvailableWorkers: number;
  p5Machines: number;
  // 如果第五期有最优排产，计算约束
  p5OptimalPlan: PeriodShiftPlan;
  p5Constraints: {
    availWorkers_afterShift1: ConstraintStatus;
    availMachines_afterShift1: ConstraintStatus;
    availWorkers_afterOT1: ConstraintStatus;
    availMachines_afterShift2: ConstraintStatus;
    availWorkers_afterOT2: ConstraintStatus;
    availMachines_afterOT2: ConstraintStatus;
  };
  p5PeriodTotal: number;
}

/**
 * 给定第四期雇佣人数，预览第五期的状态和约束
 */
export function previewP4Linkage(
  params: SimulatorParams,
  p4HireOverride: number,
): P4LinkagePreview {
  // 先计算到第四期（index=3）的期初人数
  const tempParams = { ...params };
  // 覆盖第四期为custom策略
  const configs = [...tempParams.periodConfigs];
  configs[3] = { ...configs[3], hireStrategy: 'custom', customHire: p4HireOverride };
  tempParams.periodConfigs = configs;
  
  // 计算前4期
  const result = calculateProduction(tempParams);
  const p4 = result.periods[3]; // index 3 = 第4期
  
  // 第五期的期初人数 = 第四期期初 + 第四期雇佣 - 第四期解雇
  const p5InitialWorkers = p4.initialWorkers + p4.hire - p4.fire;
  
  // 第五期机器
  let p5Machines = params.initialMachines;
  for (let j = 0; j <= 2; j++) { // j=0,1,2 → 第1,2,3期购买的机器在第5期生效
    p5Machines += (params.periodConfigs[j]?.machinePurchase || 0);
  }
  
  // 第五期解雇/雇佣（使用第五期的策略）
  const p5Config = params.periodConfigs[4] || { hireStrategy: 'hire_eq_fire' as HireStrategyType, machinePurchase: 0, shiftPlan: emptyPeriodShiftPlan() };
  const p5MinFire = Math.ceil(p5InitialWorkers * params.fireRateMin);
  const p5MaxFire = Math.floor(p5InitialWorkers * params.fireRateMax);
  const p5Fire = p5Config.customFire !== undefined
    ? Math.max(p5Config.customFire, p5MinFire)
    : p5MinFire;
  
  const p5MaxHire = Math.floor(p5InitialWorkers * params.hireRate);
  let p5Hire: number;
  switch (p5Config.hireStrategy) {
    case 'max_hire': p5Hire = p5MaxHire; break;
    case 'no_hire': p5Hire = 0; break;
    case 'hire_eq_fire': p5Hire = p5Fire; break;
    case 'custom': p5Hire = Math.min(p5Config.customHire || 0, p5MaxHire); break;
    default: p5Hire = p5Fire;
  }
  
  const p5TotalAvailableWorkers = parseFloat(
    (p5InitialWorkers - p5Fire + p5Hire * params.newWorkerEfficiency).toFixed(3)
  );
  
  // 生成第五期最优排产
  const p5OptimalPlan = optimizeShiftPlan(p5Machines, p5TotalAvailableWorkers);
  
  // 计算约束
  const shift1LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.shift1[p] || 0) * LABOR_PER[p], 0
  );
  const shift2LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.shift2[p] || 0) * LABOR_PER[p], 0
  );
  const ot1LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.ot1[p] || 0) * LABOR_PER[p] * 2, 0
  );
  const ot2LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.ot2[p] || 0) * LABOR_PER[p] * 2, 0
  );
  
  const shift1MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.shift1[p] || 0) * MACHINE_PER[p], 0
  );
  const shift2MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.shift2[p] || 0) * MACHINE_PER[p], 0
  );
  const ot1MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.ot1[p] || 0) * MACHINE_PER[p] * 2, 0
  );
  const ot2MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.ot2[p] || 0) * MACHINE_PER[p] * 2, 0
  );
  
  const availWorkersAfterShift1 = p5TotalAvailableWorkers - shift1LaborUsed - shift2LaborUsed;
  const availWorkersAfterOT1 = shift1LaborUsed - ot1LaborUsed;
  const availWorkersAfterOT2 = shift2LaborUsed - ot2LaborUsed;
  const availMachinesAfterShift1 = p5Machines - shift1MachineUsed;
  const availMachinesAfterShift2 = p5Machines - shift2MachineUsed - ot1MachineUsed;
  const availMachinesAfterOT2 = p5Machines - ot2MachineUsed;
  
  const p5PeriodTotal = PRODUCT_KEYS.reduce((s, p) => 
    s + (p5OptimalPlan.shift1[p] || 0) + (p5OptimalPlan.ot1[p] || 0) + 
    (p5OptimalPlan.shift2[p] || 0) + (p5OptimalPlan.ot2[p] || 0), 0
  );
  
  return {
    p4Hire: p4.hire,
    p5InitialWorkers,
    p5MinFire,
    p5MaxFire,
    p5Fire,
    p5MaxHire,
    p5Hire,
    p5TotalAvailableWorkers,
    p5Machines,
    p5OptimalPlan,
    p5Constraints: {
      availWorkers_afterShift1: getConstraintStatus(
        parseFloat(availWorkersAfterShift1.toFixed(3)), p5TotalAvailableWorkers
      ),
      availMachines_afterShift1: getConstraintStatus(
        parseFloat(availMachinesAfterShift1.toFixed(3)), p5Machines
      ),
      availWorkers_afterOT1: getConstraintStatus(
        parseFloat(availWorkersAfterOT1.toFixed(3)), shift1LaborUsed || 1
      ),
      availMachines_afterShift2: getConstraintStatus(
        parseFloat(availMachinesAfterShift2.toFixed(3)), p5Machines
      ),
      availWorkers_afterOT2: getConstraintStatus(
        parseFloat(availWorkersAfterOT2.toFixed(3)), shift2LaborUsed || 1
      ),
      availMachines_afterOT2: getConstraintStatus(
        parseFloat(availMachinesAfterOT2.toFixed(3)), p5Machines
      ),
    },
    p5PeriodTotal,
  };
}

/**
 * 批量预览不同P4雇佣人数对P5的影响（用于图表）
 */
export function batchPreviewP4Linkage(
  params: SimulatorParams,
  hireRange: [number, number],
  step: number = 1,
): P4LinkagePreview[] {
  const previews: P4LinkagePreview[] = [];
  for (let hire = hireRange[0]; hire <= hireRange[1]; hire += step) {
    previews.push(previewP4Linkage(params, hire));
  }
  return previews;
}


// ============================================================
// 黄格/橙格颜色映射（来自Excel原始数据）
// yellow = 必填, gold = 必填变体, 无标记 = 不填
// ============================================================
export type CellColor = 'yellow' | 'gold' | 'none';

// 每期每班次每产品的颜色标记
// key = `P${period}_${shift}_${product}`, value = CellColor
const COLOR_MAP: Record<string, CellColor> = {
  // 第1期
  'P1_ot1_A': 'yellow',
  'P1_shift2_B': 'yellow',
  'P1_ot2_B': 'gold',
  'P1_shift1_C': 'yellow',
  'P1_shift1_D': 'yellow',
  'P1_ot2_D': 'yellow',
  // 第2期
  'P2_shift1_A': 'yellow',
  'P2_ot1_A': 'yellow',
  'P2_shift1_B': 'yellow',
  'P2_shift2_C': 'yellow',
  'P2_ot2_C': 'gold',
  'P2_shift2_D': 'yellow',
  'P2_ot2_D': 'yellow',
  // 第3期
  'P3_shift1_A': 'yellow',
  'P3_ot1_A': 'gold',
  'P3_shift1_B': 'yellow',
  'P3_shift1_C': 'gold',
  'P3_shift2_C': 'yellow',
  'P3_ot2_C': 'yellow',
  'P3_shift2_D': 'yellow',
  'P3_ot2_D': 'yellow',
  // 第4期
  'P4_shift1_A': 'yellow',
  'P4_shift1_B': 'yellow',
  'P4_shift2_C': 'yellow',
  'P4_ot2_C': 'yellow',
  'P4_shift2_D': 'yellow',
  'P4_ot2_D': 'yellow',
  // 第5期
  'P5_shift1_A': 'yellow',
  'P5_shift1_B': 'yellow',
  'P5_shift2_C': 'yellow',
  'P5_ot2_C': 'yellow',
  'P5_shift2_D': 'yellow',
  'P5_ot2_D': 'yellow',
};

/**
 * 获取某期某班次某产品的颜色标记
 * @param period 期数（1-based）
 * @param shift 班次名
 * @param product 产品名
 * @returns 'yellow' | 'gold' | 'none'
 */
export function getCellColor(period: number, shift: ShiftName, product: ProductKey): CellColor {
  const key = `P${period}_${shift}_${product}`;
  return COLOR_MAP[key] || 'none';
}

/**
 * 判断某期某班次某产品是否为橙格（选填）
 * 橙格 = 有颜色标记但为 gold 的
 */
export function isOptionalCell(period: number, shift: ShiftName, product: ProductKey): boolean {
  return getCellColor(period, shift, product) === 'gold';
}

/**
 * 判断某期某班次某产品是否为必填
 * 必填 = yellow 或 gold
 */
export function isRequiredCell(period: number, shift: ShiftName, product: ProductKey): boolean {
  const color = getCellColor(period, shift, product);
  return color === 'yellow' || color === 'gold';
}
