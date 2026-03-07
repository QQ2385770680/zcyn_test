/**
 * algorithms.ts — iBizSim 求解算法注册表
 *
 * 策略模式：每个算法是一个标准化的 AlgorithmProfile 对象。
 * 新增算法只需：
 *   1. 在此文件中注册新的 AlgorithmProfile
 *   2. 在 solver.ts 的 solvePeriodProduction 中添加对应分支
 */

// ============================================================
// 类型定义
// ============================================================

/** 算法特性评分（1-5 星） */
export interface AlgorithmTraits {
  /** 资源利用率：残差越小越高 */
  resourceUtilization: number;
  /** 产品均衡性：产品间差异越小越高 */
  productBalance: number;
  /** 总产量：同等资源下产出越多越高 */
  totalOutput: number;
  /** 稳定性：行为可预测程度 */
  stability: number;
}

/** 算法档案 */
export interface AlgorithmProfile {
  /** 唯一标识（用于代码内部传递） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 操作栏简称（2-4字） */
  shortName: string;
  /** 图标（emoji） */
  icon: string;
  /** 一句话描述 */
  description: string;
  /** 详细说明（多行） */
  detail: string;
  /** 四维特性评分 */
  traits: AlgorithmTraits;
  /** 优点列表 */
  pros: string[];
  /** 缺点列表 */
  cons: string[];
  /** 最佳适用场景 */
  bestFor: string;
  /** 求解策略标识（solver.ts 内部使用） */
  solverStrategy: string;
}

// ============================================================
// 算法注册表
// ============================================================

export const ALGORITHMS: AlgorithmProfile[] = [
  {
    id: "balanced",
    name: "均衡排产",
    shortName: "均衡",
    icon: "⚖️",
    description: "产品间产量严格均匀，总产量最大化",
    detail:
      "采用 Round-Robin 轮询式分配，每轮给每个活跃产品各加 1，直到资源耗尽。" +
      "保证产品间产量差异极小（极差 ≤ 3），总产量在均衡约束下达到最大。" +
      "行为完全可预测，适合需要各产品均匀生产的常规竞赛场景。",
    traits: {
      resourceUtilization: 3,
      productBalance: 5,
      totalOutput: 5,
      stability: 5,
    },
    pros: [
      "产品间差异极小（极差 ≤ 3）",
      "总产量在均衡约束下最大",
      "行为完全可预测，结果稳定",
      "不会出现某产品被清零的情况",
    ],
    cons: [
      "机器/人力可能有较大剩余（残差偏大）",
      "无法针对特定资源瓶颈做精细优化",
      "在资源紧张时可能浪费宝贵的机器产能",
    ],
    bestFor: "需要各产品均匀生产的常规竞赛，追求稳定可控的排产结果",
    solverStrategy: "roundRobin",
  },
  {
    id: "maxutil",
    name: "极限利用",
    shortName: "极限",
    icon: "🎯",
    description: "资源残差逼近零，机器/人力利用率最大化",
    detail:
      "在 Round-Robin 均匀分配基础上，增加「减 N 换 M」批量交换优化阶段。" +
      "通过将低效率产品的产量转移给高效率产品（效率比 = 机器消耗/人力消耗），" +
      "使 primary 资源（机器或人力）的残差逼近 0。" +
      "D 的效率比最高（2.0），优化倾向于增加 D 的产量。",
    traits: {
      resourceUtilization: 5,
      productBalance: 2,
      totalOutput: 3,
      stability: 3,
    },
    pros: [
      "C5/C7/C8 残差逼近 0，资源零浪费",
      "在资源紧张时能榨干每一台机器",
      "适合特定产品组合（如只有 CD）的极限优化",
    ],
    cons: [
      "产品间差异大（可能某产品被大幅削减）",
      "总产量可能下降（高效率产品的人力成本更高）",
      "结果受产品组合影响较大，不够稳定",
    ],
    bestFor: "资源极度紧张、需要榨干每一台机器的极限场景，或仅生产少数产品时",
    solverStrategy: "roundRobinOptimized",
  },
];

// ============================================================
// 工具函数
// ============================================================

/** 默认算法 ID */
export const DEFAULT_ALGORITHM_ID = "balanced";

/** 根据 ID 获取算法档案 */
export function getAlgorithm(id: string): AlgorithmProfile {
  return ALGORITHMS.find((a) => a.id === id) || ALGORITHMS[0];
}

/** 获取所有算法 ID 列表 */
export function getAlgorithmIds(): string[] {
  return ALGORITHMS.map((a) => a.id);
}

/** 特性维度的中文标签 */
export const TRAIT_LABELS: Record<keyof AlgorithmTraits, string> = {
  resourceUtilization: "资源利用率",
  productBalance: "产品均衡性",
  totalOutput: "总产量",
  stability: "稳定性",
};

/** 特性维度的图标 */
export const TRAIT_ICONS: Record<keyof AlgorithmTraits, string> = {
  resourceUtilization: "⚡",
  productBalance: "⚖️",
  totalOutput: "📦",
  stability: "🛡️",
};
