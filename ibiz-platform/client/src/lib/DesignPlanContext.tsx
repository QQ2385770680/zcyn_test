/**
 * DesignPlanContext — 方案设计器与模拟器的共享状态层
 *
 * 功能：
 * - 存储当前活跃的设计方案配置（DesignPlanConfig）
 * - 提供 applyToSimulator 方法，将设计方案转换为模拟器可用的 productions + decisions
 * - 提供 navigateToSimulator 信号，让 DecisionDomainLayout 切换到模拟器 Tab
 */
import React from "react";
import type {
  DesignPlanConfig,
  PeriodProductionConfig,
  PeriodHiringConfig,
  PeriodMachineConfig,
} from "./designerTypes";
import type {
  PeriodProduction,
  PeriodDecision,
  GlobalConfig,
} from "./data";
import { emptyPeriodProduction } from "./data";

// ============================================================
// 1. 转换函数：设计方案 → 模拟器数据
// ============================================================

/**
 * 将设计方案的产量配置转换为模拟器的排产数据
 * - fixed 模式：使用 fixedValue
 * - blank 模式：产量为 0
 * - required/optional 模式：使用 range.min 作为初始值（用户可在模拟器中调整）
 */
export function designToProductions(
  designProductions: PeriodProductionConfig[]
): PeriodProduction[] {
  return designProductions.map((period) => {
    const prod = emptyPeriodProduction();
    for (const shiftKey of ["shift1", "ot1", "shift2", "ot2"] as const) {
      for (const product of ["A", "B", "C", "D"] as const) {
        const cell = period[shiftKey][product];
        if (cell.mode === "fixed") {
          prod[shiftKey][product] = cell.fixedValue;
        } else if (cell.mode === "blank") {
          prod[shiftKey][product] = 0;
        } else {
          // required / optional: 使用范围最小值作为起始值
          prod[shiftKey][product] = cell.range.min;
        }
      }
    }
    return prod;
  });
}

/**
 * 将设计方案的雇佣策略和机器购买配置转换为模拟器的资源决策
 * 需要 config 来计算每期的 minFire / maxHire
 */
export function designToDecisions(
  designHiring: PeriodHiringConfig[],
  designMachines: PeriodMachineConfig[],
  config: GlobalConfig
): PeriodDecision[] {
  const decisions: PeriodDecision[] = [];
  let currentInitialWorkers = config.initialWorkers;

  for (let i = 0; i < designHiring.length; i++) {
    const hiring = designHiring[i];
    const machine = designMachines[i];

    const minFire = Math.ceil(currentInitialWorkers * (config.minFireRate / 100));
    const maxHire = Math.floor(currentInitialWorkers * (config.maxHireRate / 100));

    let fired: number;
    let hired: number;

    switch (hiring.mode) {
      case "max-hire":
        fired = minFire;
        hired = maxHire;
        break;
      case "min-fire":
        fired = minFire;
        hired = 0;
        break;
      case "balance":
        fired = minFire;
        hired = minFire;
        break;
      case "no-hire":
        fired = minFire;
        hired = 0;
        break;
      case "custom":
        fired = hiring.customFired;
        hired = hiring.customHired;
        break;
      default:
        fired = minFire;
        hired = 0;
    }

    let machinesPurchased = 0;
    if (machine.mode === "fixed") {
      machinesPurchased = machine.fixedCount;
    } else if (machine.mode === "range") {
      machinesPurchased = machine.rangeMin; // 使用范围最小值作为起始
    }

    decisions.push({ machinesPurchased, fired, hired });

    // 迭代计算下一期的期初人数
    currentInitialWorkers = currentInitialWorkers + hired - fired;
  }

  return decisions;
}

// ============================================================
// 2. Context 定义
// ============================================================

interface SimulatorInitData {
  productions: PeriodProduction[];
  decisions: PeriodDecision[];
  designPlan: DesignPlanConfig;
}

interface DesignPlanContextType {
  /** 待应用到模拟器的初始数据（一次性消费） */
  pendingSimData: SimulatorInitData | null;
  /** 设计器调用：将当前方案转换并推送到模拟器 */
  applyToSimulator: (plan: DesignPlanConfig, config: GlobalConfig) => void;
  /** 模拟器调用：消费待应用数据 */
  consumeSimData: () => SimulatorInitData | null;
  /** 切换到模拟器 Tab 的信号 */
  switchToSimulator: boolean;
  /** 重置切换信号 */
  resetSwitchSignal: () => void;
}

const DesignPlanContext = React.createContext<DesignPlanContextType | null>(null);

// ============================================================
// 3. Provider
// ============================================================

export function DesignPlanProvider({ children }: { children: React.ReactNode }) {
  const [pendingSimData, setPendingSimData] = React.useState<SimulatorInitData | null>(null);
  const [switchToSimulator, setSwitchToSimulator] = React.useState(false);

  const applyToSimulator = React.useCallback((plan: DesignPlanConfig, config: GlobalConfig) => {
    const productions = designToProductions(plan.periodProductions);
    const decisions = designToDecisions(plan.periodHiring, plan.periodMachines, config);
    setPendingSimData({ productions, decisions, designPlan: plan });
    setSwitchToSimulator(true);
  }, []);

  const consumeSimData = React.useCallback(() => {
    const data = pendingSimData;
    setPendingSimData(null);
    return data;
  }, [pendingSimData]);

  const resetSwitchSignal = React.useCallback(() => {
    setSwitchToSimulator(false);
  }, []);

  return (
    <DesignPlanContext.Provider value={{
      pendingSimData,
      applyToSimulator,
      consumeSimData,
      switchToSimulator,
      resetSwitchSignal,
    }}>
      {children}
    </DesignPlanContext.Provider>
  );
}

// ============================================================
// 4. Hook
// ============================================================

export function useDesignPlan() {
  const ctx = React.useContext(DesignPlanContext);
  if (!ctx) throw new Error("useDesignPlan must be used within DesignPlanProvider");
  return ctx;
}
