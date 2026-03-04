// iBizSim 连续排产计算引擎 v2
// 支持4班次（第一班、一加、第二班、二加）的产品分配
// 实时约束验证（可用人数/机器接近0检查）

const WORK_HOURS = 520;

// 产品规格接口
export interface ProductSpecInput {
  machineHours: number;
  laborHours: number;
  materials: number;
}

// 默认产品规格
export const DEFAULT_PRODUCTS: Record<string, ProductSpecInput> = {
  A: { machineHours: 110, laborHours: 80, materials: 500 },
  B: { machineHours: 150, laborHours: 100, materials: 800 },
  C: { machineHours: 180, laborHours: 110, materials: 1600 },
  D: { machineHours: 280, laborHours: 140, materials: 2500 },
};

// 当前生效的产品规格（可被 setActiveProducts 更新）
let _activeProducts: Record<string, ProductSpecInput> = { ...DEFAULT_PRODUCTS };

export function setActiveProducts(specs: Record<string, ProductSpecInput>) {
  _activeProducts = { ...specs };
}
export function getActiveProducts(): Record<string, ProductSpecInput> {
  return _activeProducts;
}

export type ProductKey = 'A' | 'B' | 'C' | 'D';
export const PRODUCT_KEYS: ProductKey[] = ['A', 'B', 'C', 'D'];

// 产品结构比例（固定，用于按比例计算）
export const PRODUCT_RATIO: Record<ProductKey, number> = { A: 9, B: 6, C: 4, D: 3 };

// 每单位产品需要的机器/人力（使用当前生效的产品规格）
export function getMachinePerUnit(p: ProductKey) {
  return _activeProducts[p].machineHours / WORK_HOURS;
}
export function getLaborPerUnit(p: ProductKey) {
  return _activeProducts[p].laborHours / WORK_HOURS;
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

  // 二加资源上限（用于显示二加可用的最大资源）
  ot2_maxWorkers: number;   // 二加可用人数上限 = 二正消耗人力 / 2（因为加班×2）
  ot2_maxMachines: number;  // 二加可用机器上限 = 本期机器 / 2（因为加班×2）
  ot2_usedWorkers: number;  // 二加已用人数
  ot2_usedMachines: number; // 二加已用机器

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
      shiftMaterials[p] = totalProd * _activeProducts[p].materials;
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

      // 二加资源上限和已用资源
      ot2_maxWorkers: parseFloat((shift2LaborUsed / 2).toFixed(3)),  // 二正消耗人力/2 = 二加可用人数上限
      ot2_maxMachines: parseFloat((machines / 2).toFixed(3)),         // 本期机器/2 = 二加可用机器上限
      ot2_usedWorkers: parseFloat((ot2LaborUsed / 2).toFixed(3)),    // 二加已用人数（原始值，未×2）
      ot2_usedMachines: parseFloat((ot2MachineUsed / 2).toFixed(3)), // 二加已用机器（原始值，未×2）

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

// 产品每单位消耗的机器和人力（动态计算，基于当前生效的产品规格）
function getMACHINE_PER(): Record<ProductKey, number> {
  return {
    A: _activeProducts.A.machineHours / WORK_HOURS,
    B: _activeProducts.B.machineHours / WORK_HOURS,
    C: _activeProducts.C.machineHours / WORK_HOURS,
    D: _activeProducts.D.machineHours / WORK_HOURS,
  };
}
function getLABOR_PER(): Record<ProductKey, number> {
  return {
    A: _activeProducts.A.laborHours / WORK_HOURS,
    B: _activeProducts.B.laborHours / WORK_HOURS,
    C: _activeProducts.C.laborHours / WORK_HOURS,
    D: _activeProducts.D.laborHours / WORK_HOURS,
  };
}

/**
 * 获取某期所有黄色（必填）格子的列表
 */
function getYellowCells(period: number): Array<{ shift: ShiftName; product: ProductKey }> {
  const cells: Array<{ shift: ShiftName; product: ProductKey }> = [];
  for (const shift of SHIFT_NAMES) {
    for (const product of PRODUCT_KEYS) {
      if (getCellColor(period, shift, product) === 'yellow') {
        cells.push({ shift, product });
      }
    }
  }
  return cells;
}

/**
 * 获取某期所有橙色（选填）格子的列表
 */
function getOrangeCells(period: number): Array<{ shift: ShiftName; product: ProductKey }> {
  const cells: Array<{ shift: ShiftName; product: ProductKey }> = [];
  for (const shift of SHIFT_NAMES) {
    for (const product of PRODUCT_KEYS) {
      if (getCellColor(period, shift, product) === 'orange') {
        cells.push({ shift, product });
      }
    }
  }
  return cells;
}

/**
 * 计算一个排产方案的6个约束残差绝对值之和（越小越好）
 * 同时检查是否有超限（负值），超限的方案会被大幅惩罚
 */
function evaluatePlan(
  plan: PeriodShiftPlan,
  machines: number,
  totalAvailableWorkers: number,
): number {
  const MP = getMACHINE_PER();
  const LP = getLABOR_PER();
  const shift1LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (plan.shift1[p] || 0) * LP[p], 0
  );
  const shift2LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (plan.shift2[p] || 0) * LP[p], 0
  );
  const ot1LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (plan.ot1[p] || 0) * LP[p] * 2, 0
  );
  const ot2LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (plan.ot2[p] || 0) * LP[p] * 2, 0
  );
  const shift1MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (plan.shift1[p] || 0) * MP[p], 0
  );
  const shift2MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (plan.shift2[p] || 0) * MP[p], 0
  );
  const ot1MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (plan.ot1[p] || 0) * MP[p] * 2, 0
  );
  const ot2MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (plan.ot2[p] || 0) * MP[p] * 2, 0
  );

  // 6个约束检查点
  const c1 = totalAvailableWorkers - shift1LaborUsed - shift2LaborUsed; // 一班后可用人数
  const c2 = machines - shift1MachineUsed;                               // 一班后可用机器
  const c3 = shift1LaborUsed - ot1LaborUsed;                             // 一加后可用人数
  const c4 = machines - shift2MachineUsed - ot1MachineUsed;              // 二班后可用机器
  const c5 = shift2LaborUsed - ot2LaborUsed;                             // 二加后可用人数
  const c6 = machines - ot2MachineUsed;                                  // 二加后可用机器

  let score = 0;
  for (const c of [c1, c2, c3, c4, c5, c6]) {
    if (c < -0.001) {
      score += Math.abs(c) * 1000; // 超限大幅惩罚，严格禁止
    } else {
      score += Math.abs(c);
    }
  }
  return score;
}

/**
 * 最优排产推荐算法（颜色感知版）
 *
 * 根据每期 COLOR_MAP 中的颜色标记决定哪些格子可以填值：
 * - 黄色（必填）格子：优先分配产量
 * - 橙色（选填）格子：在黄色格填完后考虑
 * - 灰色/none 格子：不填，保持为0
 *
 * 对于有颜色标记的期数（P1-P5），严格按颜色优先级排产。
 * 对于无颜色标记的期数（P6-P9），使用通用启发式算法。
 *
 * @param machines 本期可用机器数
 * @param totalAvailableWorkers 本期可用人数
 * @param period 期数（1-based），用于查询 COLOR_MAP
 */
export function optimizeShiftPlan(
  machines: number,
  totalAvailableWorkers: number,
  period: number = 0,
): PeriodShiftPlan {
  const MP = getMACHINE_PER();
  const LP = getLABOR_PER();
  // 获取该期的黄色和橙色格子
  const yellowCells = period > 0 ? getYellowCells(period) : [];
  const orangeCells = period > 0 ? getOrangeCells(period) : [];

  // 如果该期没有颜色标记（P6-P9或period=0），使用通用启发式算法
  if (yellowCells.length === 0 && orangeCells.length === 0) {
    return _optimizeShiftPlanGeneric(machines, totalAvailableWorkers);
  }

  // ============================================================
  // 全局约束感知求解算法
  // 核心原则：每次分配产量后，都检查全部6个约束是否满足
  // ============================================================

  // 将黄色格子按班次分组
  const yellowByShift: Record<ShiftName, ProductKey[]> = {
    shift1: [], ot1: [], shift2: [], ot2: [],
  };
  for (const { shift, product } of yellowCells) {
    yellowByShift[shift].push(product);
  }

  // 全局约束计算函数（与 simulateProduction 完全一致）
  const calcConstraints = (p: PeriodShiftPlan) => {
    const s1L = PRODUCT_KEYS.reduce((s, k) => s + (p.shift1[k] || 0) * LP[k], 0);
    const s2L = PRODUCT_KEYS.reduce((s, k) => s + (p.shift2[k] || 0) * LP[k], 0);
    const s1M = PRODUCT_KEYS.reduce((s, k) => s + (p.shift1[k] || 0) * MP[k], 0);
    const s2M = PRODUCT_KEYS.reduce((s, k) => s + (p.shift2[k] || 0) * MP[k], 0);
    const o1L = PRODUCT_KEYS.reduce((s, k) => s + (p.ot1[k] || 0) * LP[k] * 2, 0);
    const o1M = PRODUCT_KEYS.reduce((s, k) => s + (p.ot1[k] || 0) * MP[k] * 2, 0);
    const o2L = PRODUCT_KEYS.reduce((s, k) => s + (p.ot2[k] || 0) * LP[k] * 2, 0);
    const o2M = PRODUCT_KEYS.reduce((s, k) => s + (p.ot2[k] || 0) * MP[k] * 2, 0);
    return {
      c1: totalAvailableWorkers - s1L - s2L,  // 一班后可用人数
      c2: machines - s1M,                      // 一班后可用机器
      c3: s1L - o1L,                           // 一加后可用人数
      c4: machines - s2M - o1M,                // 二班后可用机器
      c5: s2L - o2L,                           // 二加后可用人数
      c6: machines - o2M,                      // 二加后可用机器
    };
  };

  // 评分函数：所有约束残差绝对值之和，超限大幅惩罚
  const scorePlan = (p: PeriodShiftPlan) => {
    const c = calcConstraints(p);
    let score = 0;
    for (const v of [c.c1, c.c2, c.c3, c.c4, c.c5, c.c6]) {
      if (v < -0.001) score += Math.abs(v) * 1000; // 超限大幅惩罚
      else score += Math.abs(v);
    }
    return score;
  };

  // 检查方案是否合法（所有约束 >= -0.001）
  const isFeasible = (p: PeriodShiftPlan) => {
    const c = calcConstraints(p);
    return c.c1 >= -0.001 && c.c2 >= -0.001 && c.c3 >= -0.001 &&
           c.c4 >= -0.001 && c.c5 >= -0.001 && c.c6 >= -0.001;
  };

  // 生成候选方案：为每个班次生成多个候选分配，然后组合搜索
  // 策略：对每个班次生成候选值，然后用贪心+回溯找到最优组合

  let bestPlan = emptyPeriodShiftPlan();
  let bestScore = Infinity;

  // 策略：对 shift1 尝试多个缩放比例，然后对每个比例求解后续班次
  // shift1 的资源上限不应该是全部机器，而是一个比例
  const fractions = [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0];

  for (const frac of fractions) {
    const plan = emptyPeriodShiftPlan();
    const s1Resource = machines * frac;

    // Step 1: shift1 — 目标：使用机器资源的 frac 比例
    const s1Prods = yellowByShift.shift1;
    if (s1Prods.length > 0) {
      _solveShiftGroupSafe(plan, 'shift1', s1Prods, s1Resource, MP, 1);
    }

    // Step 2: shift2 — 目标：一班后可用人数接近0
    const s2Prods = yellowByShift.shift2;
    if (s2Prods.length > 0) {
      const s1Labor = PRODUCT_KEYS.reduce((s, k) => s + (plan.shift1[k] || 0) * LP[k], 0);
      const remainLabor = totalAvailableWorkers - s1Labor;
      // 同时约束 shift2 的机器消耗不能超过机器数
      _solveShiftGroupDual(plan, 'shift2', s2Prods, remainLabor, LP, machines, MP, 1);
    }

    // Step 3: ot1 — 目标：二班后可用机器接近0 & 一加后可用人数接近0
    const ot1Prods = yellowByShift.ot1;
    if (ot1Prods.length > 0) {
      const s1Labor = PRODUCT_KEYS.reduce((s, k) => s + (plan.shift1[k] || 0) * LP[k], 0);
      const s2Machine = PRODUCT_KEYS.reduce((s, k) => s + (plan.shift2[k] || 0) * MP[k], 0);
      // c3: s1Labor - o1Labor*2 >= 0 → o1Labor*2 <= s1Labor
      // c4: machines - s2Machine - o1Machine*2 >= 0 → o1Machine*2 <= machines - s2Machine
      const laborLimit = s1Labor; // o1Labor*2 的上限
      const machineLimit = machines - s2Machine; // o1Machine*2 的上限
      // 取两个约束的较小值作为资源上限
      const ot1Resource = Math.min(laborLimit, machineLimit);
      if (ot1Resource > 0) {
        // 用机器约束求解（因为 c4 是机器约束）
        _solveShiftGroupSafe(plan, 'ot1', ot1Prods, machineLimit, MP, 2);
        // 检查 c3 是否也满足
        const o1LaborUsed = PRODUCT_KEYS.reduce((s, k) => s + (plan.ot1[k] || 0) * LP[k] * 2, 0);
        if (o1LaborUsed > s1Labor + 0.001) {
          // c3 超限，用人力约束重新求解
          for (const k of PRODUCT_KEYS) plan.ot1[k] = 0;
          _solveShiftGroupSafe(plan, 'ot1', ot1Prods, laborLimit, LP, 2);
        }
      }
    }

    // Step 4: ot2 — 目标：二加后可用人数接近0 & 二加后可用机器接近0
    const ot2Prods = yellowByShift.ot2;
    if (ot2Prods.length > 0) {
      const s2Labor = PRODUCT_KEYS.reduce((s, k) => s + (plan.shift2[k] || 0) * LP[k], 0);
      // c5: s2Labor - o2Labor*2 >= 0 → o2Labor*2 <= s2Labor
      // c6: machines - o2Machine*2 >= 0 → o2Machine*2 <= machines
      if (ot2Prods.length === 1) {
        const p = ot2Prods[0];
        const fromLabor = s2Labor / (LP[p] * 2);
        const fromMachine = machines / (MP[p] * 2);
        plan.ot2[p] = Math.max(0, Math.floor(Math.min(fromLabor, fromMachine)));
      } else {
        _solveOt2MultiSafe(plan, ot2Prods, s2Labor, machines);
      }
    }

    // 最终约束验证
    _enforceConstraints(plan, machines, totalAvailableWorkers);

    const score = scorePlan(plan);
    if (score < bestScore) {
      bestScore = score;
      bestPlan = JSON.parse(JSON.stringify(plan));
    }
  }

  return bestPlan;
}

/**
 * 安全的班次产品分配（严格使用 floor，禁止超限）
 */
function _solveShiftGroupSafe(
  plan: PeriodShiftPlan,
  shift: ShiftName,
  products: ProductKey[],
  resource: number,
  costPer: Record<ProductKey, number>,
  multiplier: number,
): void {
  if (products.length === 0 || resource <= 0) return;

  if (products.length === 1) {
    const p = products[0];
    plan[shift][p] = Math.max(0, Math.floor(resource / (costPer[p] * multiplier)));
    return;
  }

  if (products.length === 2) {
    const [p1, p2] = products;
    const max1 = Math.floor(resource / (costPer[p1] * multiplier));
    let bestScore = Infinity, bestV1 = 0, bestV2 = 0;
    const step = Math.max(1, Math.floor(max1 / 300));
    for (let v1 = 0; v1 <= max1; v1 += step) {
      const remaining = resource - v1 * costPer[p1] * multiplier;
      if (remaining < 0) break;
      const v2 = Math.floor(remaining / (costPer[p2] * multiplier));
      if (v2 < 0) continue;
      const residual = resource - (v1 * costPer[p1] + v2 * costPer[p2]) * multiplier;
      if (residual < 0) continue;
      if (residual < bestScore) {
        bestScore = residual;
        bestV1 = v1;
        bestV2 = v2;
      }
    }
    plan[shift][p1] = bestV1;
    plan[shift][p2] = bestV2;
    return;
  }

  // 3+产品：贪心分配，严格使用 floor
  const sorted = [...products].sort((a, b) => costPer[b] - costPer[a]);
  let remaining = resource;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (i === sorted.length - 1) {
      plan[shift][p] = Math.max(0, Math.floor(remaining / (costPer[p] * multiplier)));
    } else {
      const share = remaining / (sorted.length - i);
      const val = Math.max(0, Math.floor(share / (costPer[p] * multiplier)));
      plan[shift][p] = val;
      remaining -= val * costPer[p] * multiplier;
      if (remaining <= 0) break;
    }
  }
}

/**
 * 双约束班次分配（同时考虑人力和机器约束）
 */
function _solveShiftGroupDual(
  plan: PeriodShiftPlan,
  shift: ShiftName,
  products: ProductKey[],
  laborResource: number,
  laborCost: Record<ProductKey, number>,
  machineResource: number,
  machineCost: Record<ProductKey, number>,
  multiplier: number,
): void {
  if (products.length === 0 || laborResource <= 0) return;

  if (products.length === 1) {
    const p = products[0];
    const fromLabor = Math.floor(laborResource / (laborCost[p] * multiplier));
    const fromMachine = Math.floor(machineResource / (machineCost[p] * multiplier));
    plan[shift][p] = Math.max(0, Math.min(fromLabor, fromMachine));
    return;
  }

  if (products.length === 2) {
    const [p1, p2] = products;
    const max1Labor = Math.floor(laborResource / (laborCost[p1] * multiplier));
    const max1Machine = Math.floor(machineResource / (machineCost[p1] * multiplier));
    const max1 = Math.min(max1Labor, max1Machine);
    let bestScore = Infinity, bestV1 = 0, bestV2 = 0;
    const step = Math.max(1, Math.floor(max1 / 300));
    for (let v1 = 0; v1 <= max1; v1 += step) {
      const remainLabor = laborResource - v1 * laborCost[p1] * multiplier;
      const remainMachine = machineResource - v1 * machineCost[p1] * multiplier;
      if (remainLabor < 0 || remainMachine < 0) break;
      const v2FromLabor = Math.floor(remainLabor / (laborCost[p2] * multiplier));
      const v2FromMachine = Math.floor(remainMachine / (machineCost[p2] * multiplier));
      const v2 = Math.min(v2FromLabor, v2FromMachine);
      if (v2 < 0) continue;
      const laborResidual = laborResource - (v1 * laborCost[p1] + v2 * laborCost[p2]) * multiplier;
      const machineResidual = machineResource - (v1 * machineCost[p1] + v2 * machineCost[p2]) * multiplier;
      if (laborResidual < 0 || machineResidual < 0) continue;
      const score = laborResidual * 3 + machineResidual; // 人力残差权重更高
      if (score < bestScore) {
        bestScore = score;
        bestV1 = v1;
        bestV2 = v2;
      }
    }
    plan[shift][p1] = bestV1;
    plan[shift][p2] = bestV2;
    return;
  }

  // 3+产品：取两个约束的较小值
  const sorted = [...products].sort((a, b) => laborCost[b] - laborCost[a]);
  let remainLabor = laborResource;
  let remainMachine = machineResource;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (i === sorted.length - 1) {
      const fromLabor = Math.floor(remainLabor / (laborCost[p] * multiplier));
      const fromMachine = Math.floor(remainMachine / (machineCost[p] * multiplier));
      plan[shift][p] = Math.max(0, Math.min(fromLabor, fromMachine));
    } else {
      const share = Math.min(remainLabor, remainMachine) / (sorted.length - i);
      const fromLabor = Math.floor(share / (laborCost[p] * multiplier));
      const fromMachine = Math.floor(share / (machineCost[p] * multiplier));
      const val = Math.max(0, Math.min(fromLabor, fromMachine));
      plan[shift][p] = val;
      remainLabor -= val * laborCost[p] * multiplier;
      remainMachine -= val * machineCost[p] * multiplier;
      if (remainLabor <= 0 || remainMachine <= 0) break;
    }
  }
}

/**
 * 安全的二加多产品求解（同时检查人力和机器约束）
 */
function _solveOt2MultiSafe(
  plan: PeriodShiftPlan,
  products: ProductKey[],
  shift2Labor: number,
  machines: number,
): void {
  const MP = getMACHINE_PER();
  const LP = getLABOR_PER();
  if (products.length === 2) {
    const [p1, p2] = products;
    const max1FromLabor = Math.floor(shift2Labor / (LP[p1] * 2));
    const max1FromMachine = Math.floor(machines / (MP[p1] * 2));
    const max1 = Math.min(max1FromLabor, max1FromMachine);
    let bestScore = Infinity, bestV1 = 0, bestV2 = 0;
    const step = Math.max(1, Math.floor(max1 / 300));
    for (let v1 = 0; v1 <= max1; v1 += step) {
      const remainLabor = shift2Labor - v1 * LP[p1] * 2;
      const remainMachine = machines - v1 * MP[p1] * 2;
      if (remainLabor < 0 || remainMachine < 0) break;
      const v2FromLabor = Math.floor(remainLabor / (LP[p2] * 2));
      const v2FromMachine = Math.floor(remainMachine / (MP[p2] * 2));
      const v2 = Math.min(v2FromLabor, v2FromMachine);
      if (v2 < 0) continue;
      const laborRemain = shift2Labor - (v1 * LP[p1] + v2 * LP[p2]) * 2;
      const machineRemain = machines - (v1 * MP[p1] + v2 * MP[p2]) * 2;
      if (laborRemain < 0 || machineRemain < 0) continue;
      const score = laborRemain * 3 + machineRemain;
      if (score < bestScore) {
        bestScore = score;
        bestV1 = v1;
        bestV2 = v2;
      }
    }
    plan.ot2[p1] = bestV1;
    plan.ot2[p2] = bestV2;
  } else {
    _solveShiftGroupSafe(plan, 'ot2', products, shift2Labor, LP, 2);
  }
}

/**
 * 最终约束验证与修正
 * 检查所有6个约束检查点，如果有任何超限（负值），通过逐步减少产量修正
 */
function _enforceConstraints(
  plan: PeriodShiftPlan,
  machines: number,
  totalAvailableWorkers: number,
): void {
  const MP = getMACHINE_PER();
  const LP = getLABOR_PER();
  // 使用与 simulateProduction 完全一致的约束计算公式
  const _calc = (p: PeriodShiftPlan) => {
    const s1Labor = PRODUCT_KEYS.reduce((s, k) => s + (p.shift1[k] || 0) * LP[k], 0);
    const s2Labor = PRODUCT_KEYS.reduce((s, k) => s + (p.shift2[k] || 0) * LP[k], 0);
    const s1Machine = PRODUCT_KEYS.reduce((s, k) => s + (p.shift1[k] || 0) * MP[k], 0);
    const s2Machine = PRODUCT_KEYS.reduce((s, k) => s + (p.shift2[k] || 0) * MP[k], 0);
    const o1Labor = PRODUCT_KEYS.reduce((s, k) => s + (p.ot1[k] || 0) * LP[k] * 2, 0);
    const o1Machine = PRODUCT_KEYS.reduce((s, k) => s + (p.ot1[k] || 0) * MP[k] * 2, 0);
    const o2Labor = PRODUCT_KEYS.reduce((s, k) => s + (p.ot2[k] || 0) * LP[k] * 2, 0);
    const o2Machine = PRODUCT_KEYS.reduce((s, k) => s + (p.ot2[k] || 0) * MP[k] * 2, 0);
    return [
      { value: machines - s1Machine,                    shift: 'shift1' as ShiftName, resource: 'machine' as const },  // 一班后可用机器
      { value: totalAvailableWorkers - s1Labor - s2Labor, shift: 'shift2' as ShiftName, resource: 'labor' as const },   // 一班后可用人数
      { value: s1Labor - o1Labor,                       shift: 'ot1' as ShiftName, resource: 'labor' as const },       // 一加后可用人数
      { value: machines - s2Machine - o1Machine,        shift: 'ot1' as ShiftName, resource: 'machine' as const },     // 二班后可用机器
      { value: s2Labor - o2Labor,                       shift: 'ot2' as ShiftName, resource: 'labor' as const },       // 二加后可用人数
      { value: machines - o2Machine,                    shift: 'ot2' as ShiftName, resource: 'machine' as const },     // 二加后可用机器
    ];
  };

  // 迭代修正：循环检查直到所有约束都满足，最多迭代 20 次防止无限循环
  for (let iter = 0; iter < 20; iter++) {
    const constraints = _calc(plan);
    let anyViolation = false;

    for (const c of constraints) {
      if (c.value < -0.001) {
        anyViolation = true;
        const shift = c.shift;
        const isOT = shift === 'ot1' || shift === 'ot2';
        const costMap = c.resource === 'machine' ? MP : LP;
        const multiplier = isOT ? 2 : 1;

        // 从该班次中找到有产量的产品，减少产量
        for (const pk of PRODUCT_KEYS) {
          if (plan[shift][pk] > 0) {
            const excess = -c.value;
            const perUnit = costMap[pk] * multiplier;
            const reduce = Math.ceil(excess / perUnit);
            plan[shift][pk] = Math.max(0, plan[shift][pk] - reduce);
            break;
          }
        }
      }
    }

    if (!anyViolation) break;
  }
}

/**
 * 求解某个班次的产品分配
 * 目标：使 resource - sum(product[i] * costPer[product[i]] * multiplier) ≈ 0
 * 约束：残差必须 >= 0（严格禁止超限）
 */
function _solveShiftGroup(
  plan: PeriodShiftPlan,
  shift: ShiftName,
  products: ProductKey[],
  resource: number,
  costPer: Record<ProductKey, number>,
  multiplier: number,
  maxPerCell: Record<string, number>,
): void {
  if (products.length === 0) return;

  if (products.length === 1) {
    // 单产品：直接求解（使用 floor 禁止超限）
    const p = products[0];
    const exact = resource / (costPer[p] * multiplier);
    const maxVal = maxPerCell[`${shift}_${p}`] || 0;
    plan[shift][p] = Math.max(0, Math.min(Math.floor(exact), maxVal));
    return;
  }

  if (products.length === 2) {
    // 双产品：遍历搜索（严格禁止超限）
    const [p1, p2] = products;
    const max1 = maxPerCell[`${shift}_${p1}`] || 0;
    const max2 = maxPerCell[`${shift}_${p2}`] || 0;
    let bestScore = Infinity;
    let bestV1 = 0, bestV2 = 0;

    // 遍历p1，求p2使约束接近0且不超限
    const step = Math.max(1, Math.floor(max1 / 300));
    for (let v1 = 0; v1 <= max1; v1 += step) {
      const remaining = resource - v1 * costPer[p1] * multiplier;
      if (remaining < 0) break; // p1已经超限，后续更大的v1也不可能
      const v2Exact = remaining / (costPer[p2] * multiplier);
      // 只尝试 floor（保证不超限）
      const v2 = Math.min(Math.floor(v2Exact), max2);
      if (v2 < 0) continue;
      const residual = resource - (v1 * costPer[p1] + v2 * costPer[p2]) * multiplier;
      if (residual < 0) continue; // 严格禁止超限
      const score = residual; // 残差越小越好（已保证 >= 0）
      if (score < bestScore) {
        bestScore = score;
        bestV1 = v1;
        bestV2 = v2;
      }
    }
    plan[shift][p1] = bestV1;
    plan[shift][p2] = bestV2;
    return;
  }

  // 3+产品：贪心分配（按单位消耗从大到小排序，依次分配，严格使用 floor）
  const sorted = [...products].sort((a, b) => costPer[b] - costPer[a]);
  let remaining = resource;
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const maxVal = maxPerCell[`${shift}_${p}`] || 0;
    if (i === sorted.length - 1) {
      // 最后一个产品：用完剩余资源（floor 禁止超限）
      const exact = remaining / (costPer[p] * multiplier);
      plan[shift][p] = Math.max(0, Math.min(Math.floor(exact), maxVal));
    } else {
      // 分配合理份额（floor 禁止超限）
      const share = remaining / (sorted.length - i);
      const exact = share / (costPer[p] * multiplier);
      const val = Math.max(0, Math.min(Math.floor(exact), maxVal));
      plan[shift][p] = val;
      remaining -= val * costPer[p] * multiplier;
    }
  }
}

/**
 * 求解二加班多产品组合
 * 目标：二加后可用人数接近0 & 二加后可用机器尽量小
 * 约束：严格禁止超限（所有残差 >= 0）
 */
function _solveOt2Multi(
  plan: PeriodShiftPlan,
  products: ProductKey[],
  shift2Labor: number,
  machines: number,
  maxPerCell: Record<string, number>,
): void {
  const MP = getMACHINE_PER();
  const LP = getLABOR_PER();
  if (products.length === 2) {
    const [p1, p2] = products;
    const max1 = maxPerCell[`ot2_${p1}`] || 0;
    let bestScore = Infinity;
    let bestV1 = 0, bestV2 = 0;

    const step = Math.max(1, Math.floor(max1 / 300));
    for (let v1 = 0; v1 <= max1; v1 += step) {
      // 从约束1求v2（使用 floor 禁止超限）
      const v2Exact = (shift2Labor / 2 - v1 * LP[p1]) / LP[p2];
      const v2 = Math.floor(v2Exact);
      const max2 = maxPerCell[`ot2_${p2}`] || 0;
      if (v2 < 0 || v2 > max2) continue;
      const laborRemain = shift2Labor - (v1 * LP[p1] + v2 * LP[p2]) * 2;
      if (laborRemain < 0) continue; // 严格禁止超限
      const machineRemain = machines - (v1 * MP[p1] + v2 * MP[p2]) * 2;
      if (machineRemain < 0) continue; // 严格禁止超限
      // 综合评分：人数残差接近0（高权重） + 机器残差尽量小（低权重）
      const score = laborRemain * 3 + machineRemain;
      if (score < bestScore) {
        bestScore = score;
        bestV1 = v1;
        bestV2 = v2;
      }
    }
    plan.ot2[p1] = bestV1;
    plan.ot2[p2] = bestV2;
  } else {
    // 单产品或3+产品
    _solveShiftGroup(plan, 'ot2', products, shift2Labor, LP, 2, maxPerCell);
  }
}

/**
 * 通用启发式最优排产（用于无颜色标记的期数 P6-P9）
 * 保留原有的固定排产模式
 */
function _optimizeShiftPlanGeneric(
  machines: number,
  totalAvailableWorkers: number,
): PeriodShiftPlan {
  const MP = getMACHINE_PER();
  const LP = getLABOR_PER();
  const plan = emptyPeriodShiftPlan();

  // Step 1: 第一班 C + D → 一班可用机器接近0（严格禁止超限）
  let bestShift1Score = Infinity;
  let bestC = 100, bestD = 100;
  
  for (let d = 100; d <= 250; d += 1) {
    const cExact = (machines - d * MP.D) / MP.C;
    const cFloored = Math.floor(cExact); // 使用 floor 禁止超限
    if (cFloored < 100 || cFloored > 250) continue;
    const remaining = machines - cFloored * MP.C - d * MP.D;
    if (remaining < 0) continue; // 严格禁止超限
    const score = remaining; // 残差越小越好（已保证 >= 0）
    if (score < bestShift1Score) {
      bestShift1Score = score;
      bestC = cFloored;
      bestD = d;
    }
  }
  plan.shift1.C = bestC;
  plan.shift1.D = bestD;

  // Step 2: 第二班 B → 一班可用人数接近0（严格禁止超限）
  const shift1Labor = bestC * LP.C + bestD * LP.D;
  const bExact = (totalAvailableWorkers - shift1Labor) / LP.B;
  const bMachineLimit = Math.floor(machines * 0.6 / MP.B);
  let bestB = Math.max(0, Math.min(Math.floor(bExact), bMachineLimit)); // floor 禁止超限
  plan.shift2.B = bestB;

  // Step 3: 一加 A → 二班可用机器接近0（严格禁止超限）
  const aExact = (machines - bestB * MP.B) / (MP.A * 2);
  let bestA = Math.max(0, Math.floor(aExact)); // floor 禁止超限
  plan.ot1.A = bestA;

  // Step 4: 二加 D + B → 二加可用人数接近0 & 二加可用机器尽量小（严格禁止超限）
  const shift2Labor = bestB * LP.B;
  let bestOt2Score = Infinity;
  let bestD2 = 40, bestB2 = 0;
  for (let d2 = 40; d2 <= 200; d2 += 1) {
    const b2Exact = (shift2Labor / 2 - d2 * LP.D) / LP.B;
    const b2 = Math.max(0, Math.floor(b2Exact)); // 只用 floor 禁止超限
    const ot2LaborRemain = shift2Labor - (d2 * LP.D + b2 * LP.B) * 2;
    if (ot2LaborRemain < 0) continue; // 严格禁止超限
    const ot2MachineRemain = machines - (d2 * MP.D + b2 * MP.B) * 2;
    if (ot2MachineRemain < 0) continue; // 严格禁止超限
    const score = ot2LaborRemain * 3 + ot2MachineRemain;
    if (score < bestOt2Score) {
      bestOt2Score = score;
      bestD2 = d2;
      bestB2 = b2;
    }
  }
  plan.ot2.D = bestD2;
  plan.ot2.B = bestB2;

  // 最终约束验证
  _enforceConstraints(plan, machines, totalAvailableWorkers);

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
    
    // 生成本期最优排产（传入期数以查询颜色映射）
    const plan = optimizeShiftPlan(machines, totalAvailableWorkers, i + 1);
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
  const MP = getMACHINE_PER();
  const LP = getLABOR_PER();
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
  const p5OptimalPlan = optimizeShiftPlan(p5Machines, p5TotalAvailableWorkers, 5);
  
  // 计算约束
  const shift1LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.shift1[p] || 0) * LP[p], 0
  );
  const shift2LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.shift2[p] || 0) * LP[p], 0
  );
  const ot1LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.ot1[p] || 0) * LP[p] * 2, 0
  );
  const ot2LaborUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.ot2[p] || 0) * LP[p] * 2, 0
  );
  
  const shift1MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.shift1[p] || 0) * MP[p], 0
  );
  const shift2MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.shift2[p] || 0) * MP[p], 0
  );
  const ot1MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.ot1[p] || 0) * MP[p] * 2, 0
  );
  const ot2MachineUsed = PRODUCT_KEYS.reduce(
    (s, p) => s + (p5OptimalPlan.ot2[p] || 0) * MP[p] * 2, 0
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
// 黄格/橙格颜色映射（严格基于 rule.xls Excel 原始数据）
// yellow = 必填（黄格，对应 Excel 黄色 255,255,0 和金黄色 255,204,0）
// orange = 选填（橙格，对应 Excel 橙色 255,204,153）
// none = 无标记（不需要填写，公式计算或禁区）
// ============================================================
export type CellColor = 'yellow' | 'orange' | 'none';

// 每期每班次每产品的颜色标记
// key = `P${period}_${shift}_${product}`, value = CellColor
// 注意：产量区域中仅有黄色（必填），无橙色（选填）
// 橙色（选填）仅出现在右侧参数区（本期购买、本期解雇、本期雇佣）
const COLOR_MAP: Record<string, CellColor> = {
  // 第1期（6个必填格）
  'P1_ot1_A': 'yellow',
  'P1_shift2_B': 'yellow',
  'P1_ot2_B': 'yellow',
  'P1_shift1_C': 'yellow',
  'P1_shift1_D': 'yellow',
  'P1_ot2_D': 'yellow',
  // 第2期（7个必填格）
  'P2_shift1_A': 'yellow',
  'P2_ot1_A': 'yellow',
  'P2_shift1_B': 'yellow',
  'P2_shift2_C': 'yellow',
  'P2_ot2_C': 'yellow',
  'P2_shift2_D': 'yellow',
  'P2_ot2_D': 'yellow',
  // 第3期（8个必填格）
  'P3_shift1_A': 'yellow',
  'P3_ot1_A': 'yellow',
  'P3_shift1_B': 'yellow',
  'P3_shift1_C': 'yellow',
  'P3_shift2_C': 'yellow',
  'P3_ot2_C': 'yellow',
  'P3_shift2_D': 'yellow',
  'P3_ot2_D': 'yellow',
  // 第4期（6个必填格）
  'P4_shift1_A': 'yellow',
  'P4_shift1_B': 'yellow',
  'P4_shift2_C': 'yellow',
  'P4_ot2_C': 'yellow',
  'P4_shift2_D': 'yellow',
  'P4_ot2_D': 'yellow',
  // 第5期（6个必填格）
  'P5_shift1_A': 'yellow',
  'P5_shift1_B': 'yellow',
  'P5_shift2_C': 'yellow',
  'P5_ot2_C': 'yellow',
  'P5_shift2_D': 'yellow',
  'P5_ot2_D': 'yellow',
  // 第6-9期：Excel 中无颜色标记（全白），不在此映射中
};

/**
 * 获取某期某班次某产品的颜色标记
 * @param period 期数（1-based）
 * @param shift 班次名
 * @param product 产品名
 * @returns 'yellow'(必填) | 'orange'(选填) | 'none'(无标记)
 */
export function getCellColor(period: number, shift: ShiftName, product: ProductKey): CellColor {
  const key = `P${period}_${shift}_${product}`;
  return COLOR_MAP[key] || 'none';
}

/**
 * 判断某期某班次某产品是否为选填（橙格）
 */
export function isOptionalCell(period: number, shift: ShiftName, product: ProductKey): boolean {
  return getCellColor(period, shift, product) === 'orange';
}

/**
 * 判断某期某班次某产品是否为必填（黄格）
 */
export function isRequiredCell(period: number, shift: ShiftName, product: ProductKey): boolean {
  return getCellColor(period, shift, product) === 'yellow';
}

// ============================================================
// 右侧参数区颜色映射（基于 rule.xls）
// 第1期：本期机器=黄色(必填), 期初人数=黄色(必填)
// 所有期：本期购买=橙色(选填), 本期解雇=橙色(选填), 本期雇佣=橙色(选填)
// 其余（本期机器2+期、期初人数2+期、最少解雇、最大雇佣）=蓝色(公式计算)
// ============================================================
export type ParamColor = 'yellow' | 'orange' | 'blue' | 'none';

export function getParamColor(period: number, paramName: string): ParamColor {
  if (paramName === '本期机器') return period === 1 ? 'yellow' : 'blue';
  if (paramName === '期初人数') return period === 1 ? 'yellow' : 'blue';
  if (paramName === '本期购买') return 'orange';
  if (paramName === '本期解雇') return 'orange';
  if (paramName === '本期雇佣') return 'orange';
  if (paramName === '最少解雇') return 'blue';
  if (paramName === '最大雇佣') return 'blue';
  return 'none';
}
