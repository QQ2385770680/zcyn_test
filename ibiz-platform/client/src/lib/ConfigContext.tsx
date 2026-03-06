/**
 * ConfigContext — 全局配置上下文
 *
 * 功能：
 * - 提供全局配置的 React Context
 * - 自动从 localStorage 读取/保存配置
 * - 支持重置为默认值
 * - 所有子组件可通过 useConfig() 访问和修改配置
 */
import React from "react";
import { type GlobalConfig, DEFAULT_CONFIG, DEFAULT_PRODUCTS } from "./data";

const STORAGE_KEY = "ibiz-global-config";

interface ConfigContextType {
  /** 当前全局配置 */
  config: GlobalConfig;
  /** 更新配置（部分更新） */
  updateConfig: (patch: Partial<GlobalConfig>) => void;
  /** 重置为默认配置 */
  resetConfig: () => void;
  /** 配置是否已修改（与默认值不同） */
  isDirty: boolean;
}

const ConfigContext = React.createContext<ConfigContextType | null>(null);

/** 从 localStorage 读取配置 */
function loadConfig(): GlobalConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 确保所有字段都存在，缺失的用默认值补齐
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // 解析失败，使用默认值
  }
  return { ...DEFAULT_CONFIG, products: [...DEFAULT_PRODUCTS] };
}

/** 保存配置到 localStorage */
function saveConfig(config: GlobalConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // 存储失败（如 localStorage 已满），静默忽略
  }
}

/** 检查配置是否与默认值不同 */
function isConfigDirty(config: GlobalConfig): boolean {
  return (
    config.initialMachines !== DEFAULT_CONFIG.initialMachines ||
    config.initialWorkers !== DEFAULT_CONFIG.initialWorkers ||
    config.periods !== DEFAULT_CONFIG.periods ||
    config.minFireRate !== DEFAULT_CONFIG.minFireRate ||
    config.maxHireRate !== DEFAULT_CONFIG.maxHireRate ||
    config.newWorkerEfficiency !== DEFAULT_CONFIG.newWorkerEfficiency ||
    JSON.stringify(config.products) !== JSON.stringify(DEFAULT_PRODUCTS)
  );
}

/** 全局配置 Provider */
export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<GlobalConfig>(loadConfig);

  // 配置变更时自动保存到 localStorage
  React.useEffect(() => {
    saveConfig(config);
  }, [config]);

  const updateConfig = React.useCallback((patch: Partial<GlobalConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetConfig = React.useCallback(() => {
    const defaultCfg = { ...DEFAULT_CONFIG, products: [...DEFAULT_PRODUCTS] };
    setConfig(defaultCfg);
  }, []);

  const isDirty = isConfigDirty(config);

  const value = React.useMemo(
    () => ({ config, updateConfig, resetConfig, isDirty }),
    [config, updateConfig, resetConfig, isDirty]
  );

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

/** 使用全局配置的 Hook */
export function useConfig(): ConfigContextType {
  const ctx = React.useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return ctx;
}
