// iBizSim 连续排产规则 - 完整计算数据
// 设计风格: 模块化控制台 (Bauhaus Functionalism + Modern SaaS Dashboard)

export const WORK_HOURS = 520;

export interface ProductSpec {
  name: string;
  machineHours: number;
  laborHours: number;
  materials: number;
  machinePerUnit: number;
  laborPerUnit: number;
}

// 默认产品参数（可被用户修改）
export const DEFAULT_PRODUCT_SPECS: Record<string, { machineHours: number; laborHours: number; materials: number }> = {
  A: { machineHours: 110, laborHours: 80, materials: 500 },
  B: { machineHours: 150, laborHours: 100, materials: 800 },
  C: { machineHours: 180, laborHours: 110, materials: 1600 },
  D: { machineHours: 280, laborHours: 140, materials: 2500 },
};

// 根据输入参数计算完整的ProductSpec（含派生字段）
export function buildProductSpecs(input: Record<string, { machineHours: number; laborHours: number; materials: number }>): Record<string, ProductSpec> {
  const result: Record<string, ProductSpec> = {};
  for (const [key, spec] of Object.entries(input)) {
    result[key] = {
      name: key,
      machineHours: spec.machineHours,
      laborHours: spec.laborHours,
      materials: spec.materials,
      machinePerUnit: spec.machineHours / WORK_HOURS,
      laborPerUnit: spec.laborHours / WORK_HOURS,
    };
  }
  return result;
}

export const products: Record<string, ProductSpec> = buildProductSpecs(DEFAULT_PRODUCT_SPECS);

export const productRatio = { A: 9, B: 6, C: 4, D: 3 };
export const totalRatio = 22;
export const groupMachineNeed = 6.6346;
export const groupLaborNeed = 4.1923;

export interface PeriodData {
  period: number;
  machines: number;
  initialWorkers: number;
  minFire: number;
  fire: number;
  maxHire: number;
  hire: number;
  hireStrategy: string;
  availableWorkers: number;
  availableMachines: number;
  workerMachineRatio: number;
  singleShiftGroups: number;
  singleShiftBottleneck: string;
  singleShiftProduction: Record<string, number>;
  singleShiftTotal: number;
  doubleShiftGroupsPerShift: number;
  doubleShiftBottleneck: string;
  doubleShiftProduction: Record<string, number>;
  doubleShiftTotal: number;
  singleMachineUtil: number;
  singleLaborUtil: number;
  doubleMachineUtil: number;
  doubleLaborUtil: number;
  singleMaterials: Record<string, number>;
  singleMaterialsTotal: number;
  doubleMaterials: Record<string, number>;
  doubleMaterialsTotal: number;
}

export const periods: PeriodData[] = [
  {
    period: 1, machines: 157, initialWorkers: 113, minFire: 4, fire: 4, maxHire: 56, hire: 56,
    hireStrategy: '最大雇佣', availableWorkers: 123, availableMachines: 157, workerMachineRatio: 0.7834,
    singleShiftGroups: 23.66, singleShiftBottleneck: '机器',
    singleShiftProduction: { A: 212, B: 141, C: 94, D: 70 }, singleShiftTotal: 517,
    doubleShiftGroupsPerShift: 14.67, doubleShiftBottleneck: '人力',
    doubleShiftProduction: { A: 264, B: 176, C: 116, D: 88 }, doubleShiftTotal: 644,
    singleMachineUtil: 99.2, singleLaborUtil: 80.1, doubleMachineUtil: 61.8, doubleLaborUtil: 99.7,
    singleMaterials: { A: 106000, B: 112800, C: 150400, D: 175000 }, singleMaterialsTotal: 544200,
    doubleMaterials: { A: 132000, B: 140800, C: 185600, D: 220000 }, doubleMaterialsTotal: 678400,
  },
  {
    period: 2, machines: 157, initialWorkers: 165, minFire: 5, fire: 5, maxHire: 82, hire: 82,
    hireStrategy: '最大雇佣', availableWorkers: 180.5, availableMachines: 157, workerMachineRatio: 1.1497,
    singleShiftGroups: 23.66, singleShiftBottleneck: '机器',
    singleShiftProduction: { A: 212, B: 141, C: 94, D: 70 }, singleShiftTotal: 517,
    doubleShiftGroupsPerShift: 21.53, doubleShiftBottleneck: '人力',
    doubleShiftProduction: { A: 386, B: 258, C: 172, D: 128 }, doubleShiftTotal: 944,
    singleMachineUtil: 99.2, singleLaborUtil: 54.5, doubleMachineUtil: 90.6, doubleLaborUtil: 99.6,
    singleMaterials: { A: 106000, B: 112800, C: 150400, D: 175000 }, singleMaterialsTotal: 544200,
    doubleMaterials: { A: 193000, B: 206400, C: 275200, D: 320000 }, doubleMaterialsTotal: 994600,
  },
  {
    period: 3, machines: 157, initialWorkers: 242, minFire: 8, fire: 8, maxHire: 121, hire: 121,
    hireStrategy: '最大雇佣', availableWorkers: 264.25, availableMachines: 157, workerMachineRatio: 1.6831,
    singleShiftGroups: 23.66, singleShiftBottleneck: '机器',
    singleShiftProduction: { A: 212, B: 141, C: 94, D: 70 }, singleShiftTotal: 517,
    doubleShiftGroupsPerShift: 23.66, doubleShiftBottleneck: '机器',
    doubleShiftProduction: { A: 424, B: 282, C: 188, D: 140 }, doubleShiftTotal: 1034,
    singleMachineUtil: 99.2, singleLaborUtil: 37.3, doubleMachineUtil: 99.2, doubleLaborUtil: 74.5,
    singleMaterials: { A: 106000, B: 112800, C: 150400, D: 175000 }, singleMaterialsTotal: 544200,
    doubleMaterials: { A: 212000, B: 225600, C: 300800, D: 350000 }, doubleMaterialsTotal: 1088400,
  },
  {
    period: 4, machines: 157, initialWorkers: 355, minFire: 11, fire: 11, maxHire: 177, hire: 0,
    hireStrategy: '不雇佣', availableWorkers: 344, availableMachines: 157, workerMachineRatio: 2.1911,
    singleShiftGroups: 23.66, singleShiftBottleneck: '机器',
    singleShiftProduction: { A: 212, B: 141, C: 94, D: 70 }, singleShiftTotal: 517,
    doubleShiftGroupsPerShift: 23.66, doubleShiftBottleneck: '机器',
    doubleShiftProduction: { A: 424, B: 282, C: 188, D: 140 }, doubleShiftTotal: 1034,
    singleMachineUtil: 99.2, singleLaborUtil: 28.6, doubleMachineUtil: 99.2, doubleLaborUtil: 57.2,
    singleMaterials: { A: 106000, B: 112800, C: 150400, D: 175000 }, singleMaterialsTotal: 544200,
    doubleMaterials: { A: 212000, B: 225600, C: 300800, D: 350000 }, doubleMaterialsTotal: 1088400,
  },
  {
    period: 5, machines: 157, initialWorkers: 344, minFire: 11, fire: 11, maxHire: 172, hire: 11,
    hireStrategy: '雇佣=解雇', availableWorkers: 335.75, availableMachines: 157, workerMachineRatio: 2.1385,
    singleShiftGroups: 23.66, singleShiftBottleneck: '机器',
    singleShiftProduction: { A: 212, B: 141, C: 94, D: 70 }, singleShiftTotal: 517,
    doubleShiftGroupsPerShift: 23.66, doubleShiftBottleneck: '机器',
    doubleShiftProduction: { A: 424, B: 282, C: 188, D: 140 }, doubleShiftTotal: 1034,
    singleMachineUtil: 99.2, singleLaborUtil: 29.3, doubleMachineUtil: 99.2, doubleLaborUtil: 58.7,
    singleMaterials: { A: 106000, B: 112800, C: 150400, D: 175000 }, singleMaterialsTotal: 544200,
    doubleMaterials: { A: 212000, B: 225600, C: 300800, D: 350000 }, doubleMaterialsTotal: 1088400,
  },
  {
    period: 6, machines: 157, initialWorkers: 344, minFire: 11, fire: 11, maxHire: 172, hire: 11,
    hireStrategy: '雇佣=解雇', availableWorkers: 335.75, availableMachines: 157, workerMachineRatio: 2.1385,
    singleShiftGroups: 23.66, singleShiftBottleneck: '机器',
    singleShiftProduction: { A: 212, B: 141, C: 94, D: 70 }, singleShiftTotal: 517,
    doubleShiftGroupsPerShift: 23.66, doubleShiftBottleneck: '机器',
    doubleShiftProduction: { A: 424, B: 282, C: 188, D: 140 }, doubleShiftTotal: 1034,
    singleMachineUtil: 99.2, singleLaborUtil: 29.3, doubleMachineUtil: 99.2, doubleLaborUtil: 58.7,
    singleMaterials: { A: 106000, B: 112800, C: 150400, D: 175000 }, singleMaterialsTotal: 544200,
    doubleMaterials: { A: 212000, B: 225600, C: 300800, D: 350000 }, doubleMaterialsTotal: 1088400,
  },
  {
    period: 7, machines: 157, initialWorkers: 344, minFire: 11, fire: 11, maxHire: 172, hire: 11,
    hireStrategy: '雇佣=解雇', availableWorkers: 335.75, availableMachines: 157, workerMachineRatio: 2.1385,
    singleShiftGroups: 23.66, singleShiftBottleneck: '机器',
    singleShiftProduction: { A: 212, B: 141, C: 94, D: 70 }, singleShiftTotal: 517,
    doubleShiftGroupsPerShift: 23.66, doubleShiftBottleneck: '机器',
    doubleShiftProduction: { A: 424, B: 282, C: 188, D: 140 }, doubleShiftTotal: 1034,
    singleMachineUtil: 99.2, singleLaborUtil: 29.3, doubleMachineUtil: 99.2, doubleLaborUtil: 58.7,
    singleMaterials: { A: 106000, B: 112800, C: 150400, D: 175000 }, singleMaterialsTotal: 544200,
    doubleMaterials: { A: 212000, B: 225600, C: 300800, D: 350000 }, doubleMaterialsTotal: 1088400,
  },
  {
    period: 8, machines: 157, initialWorkers: 344, minFire: 11, fire: 11, maxHire: 172, hire: 11,
    hireStrategy: '雇佣=解雇', availableWorkers: 335.75, availableMachines: 157, workerMachineRatio: 2.1385,
    singleShiftGroups: 23.66, singleShiftBottleneck: '机器',
    singleShiftProduction: { A: 212, B: 141, C: 94, D: 70 }, singleShiftTotal: 517,
    doubleShiftGroupsPerShift: 23.66, doubleShiftBottleneck: '机器',
    doubleShiftProduction: { A: 424, B: 282, C: 188, D: 140 }, doubleShiftTotal: 1034,
    singleMachineUtil: 99.2, singleLaborUtil: 29.3, doubleMachineUtil: 99.2, doubleLaborUtil: 58.7,
    singleMaterials: { A: 106000, B: 112800, C: 150400, D: 175000 }, singleMaterialsTotal: 544200,
    doubleMaterials: { A: 212000, B: 225600, C: 300800, D: 350000 }, doubleMaterialsTotal: 1088400,
  },
  {
    period: 9, machines: 157, initialWorkers: 344, minFire: 11, fire: 11, maxHire: 172, hire: 11,
    hireStrategy: '雇佣=解雇', availableWorkers: 335.75, availableMachines: 157, workerMachineRatio: 2.1385,
    singleShiftGroups: 23.66, singleShiftBottleneck: '机器',
    singleShiftProduction: { A: 212, B: 141, C: 94, D: 70 }, singleShiftTotal: 517,
    doubleShiftGroupsPerShift: 23.66, doubleShiftBottleneck: '机器',
    doubleShiftProduction: { A: 424, B: 282, C: 188, D: 140 }, doubleShiftTotal: 1034,
    singleMachineUtil: 99.2, singleLaborUtil: 29.3, doubleMachineUtil: 99.2, doubleLaborUtil: 58.7,
    singleMaterials: { A: 106000, B: 112800, C: 150400, D: 175000 }, singleMaterialsTotal: 544200,
    doubleMaterials: { A: 212000, B: 225600, C: 300800, D: 350000 }, doubleMaterialsTotal: 1088400,
  },
];

export interface CostPlan {
  name: string;
  description: string;
  production: Record<string, { shift1: number; ot1: number; shift2: number; ot2: number }>;
  unitCost: Record<string, number>;
  totals: Record<string, number>;
  totalProduction: number;
  totalCost: number;
}

export const costPlans: CostPlan[] = [
  {
    name: '方案一：均衡排班',
    description: '四个产品均匀分配到各班次',
    production: {
      A: { shift1: 150, ot1: 30, shift2: 150, ot2: 75 },
      B: { shift1: 100, ot1: 0, shift2: 100, ot2: 50 },
      C: { shift1: 80, ot1: 0, shift2: 80, ot2: 40 },
      D: { shift1: 80, ot1: 0, shift2: 80, ot2: 40 },
    },
    unitCost: { A: 2368.66, B: 3782.77, C: 6651.15, D: 7851.92 },
    totals: { A: 405, B: 250, C: 200, D: 200 },
    totalProduction: 1055,
    totalCost: 4805613.80,
  },
  {
    name: '方案二：集中排班',
    description: 'A产品集中第一班，其他产品分配到后续班次',
    production: {
      A: { shift1: 504, ot1: 0, shift2: 300, ot2: 100 },
      B: { shift1: 196, ot1: 0, shift2: 56, ot2: 79 },
      C: { shift1: 0, ot1: 0, shift2: 76, ot2: 31 },
      D: { shift1: 0, ot1: 0, shift2: 76, ot2: 32 },
    },
    unitCost: { A: 2350.00, B: 3747.08, C: 6829.33, D: 8019.14 },
    totals: { A: 904, B: 331, C: 107, D: 108 },
    totalProduction: 1450,
    totalCost: 4961488.91,
  },
];

export const formulas = {
  initialWorkers: '期初人数 = 上期期初人数 + 上期雇佣 - 上期解雇',
  minFire: '最少解雇 = ⌈期初人数 × 3%⌉',
  maxHire: '最大雇佣 = ⌊期初人数 × 50%⌋',
  availableWorkers: '可用人数 = 期初人数 - 解雇 + 雇佣 × 0.25',
  machines: '本期机器 = 上期机器 + 上上期购买数',
};

export const hireStrategy: Record<string, string> = {
  '第1-3期': '最大雇佣（期初人数的50%取整）',
  '第4期': '不雇佣',
  '第5-9期': '雇佣人数 = 解雇人数',
};

export const notes = [
  '新雇佣工人效率仅为25%（乘以0.25系数）',
  '加班时机器和人力消耗为正常的2倍',
  '所有期数解雇均为最低解雇（期初人数的3%向上取整）',
  '机器在第一班和第二班之间可以复用（两班倒）',
  '人力在各班次之间不可复用（需要分配不同工人）',
];
