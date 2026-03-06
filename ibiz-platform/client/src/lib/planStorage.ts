/**
 * planStorage.ts — 方案存储服务
 *
 * 使用 localStorage 实现方案的 CRUD 操作。
 * 未来可替换为后端 API 调用，接口保持不变。
 */

import {
  type ProductionPlan,
  type PeriodProduction,
  type PeriodDecision,
  type GlobalConfig,
  generateId,
  emptyPeriodProduction,
} from "./data";

const STORAGE_KEY = "ibiz-production-plans";
const USAGE_KEY = "ibiz-plan-usage-stats";

/** 使用次数统计 */
export interface PlanUsageStats {
  [planId: string]: {
    loadCount: number;
    lastUsedAt: string;
  };
}

/** 读取使用次数统计 */
export function loadUsageStats(): PlanUsageStats {
  try {
    const saved = localStorage.getItem(USAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {};
}

/** 记录方案被加载一次 */
export function recordPlanUsage(planId: string): void {
  try {
    const stats = loadUsageStats();
    const existing = stats[planId] || { loadCount: 0, lastUsedAt: "" };
    stats[planId] = {
      loadCount: existing.loadCount + 1,
      lastUsedAt: new Date().toISOString(),
    };
    localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

/** 读取所有方案 */
export function loadPlans(): ProductionPlan[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // 解析失败
  }
  return [];
}

/** 保存所有方案 */
function savePlans(plans: ProductionPlan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // 存储失败
  }
}

/** 创建新方案 */
export function createPlan(
  name: string,
  description: string,
  config: GlobalConfig,
  productions?: PeriodProduction[],
  decisions?: PeriodDecision[]
): ProductionPlan {
  const now = new Date().toISOString();
  const plan: ProductionPlan = {
    id: generateId(),
    name,
    description,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    starred: false,
    config: { ...config },
    periodProductions:
      productions || Array.from({ length: config.periods }, () => emptyPeriodProduction()),
    periodDecisions:
      decisions ||
      Array.from({ length: config.periods }, () => ({
        machinesPurchased: 0,
        fired: 0,
        hired: 0,
      })),
  };

  const plans = loadPlans();
  plans.unshift(plan);
  savePlans(plans);
  return plan;
}

/** 更新方案 */
export function updatePlan(
  id: string,
  updates: Partial<Omit<ProductionPlan, "id" | "createdAt">>
): ProductionPlan | null {
  const plans = loadPlans();
  const index = plans.findIndex((p) => p.id === id);
  if (index === -1) return null;

  plans[index] = {
    ...plans[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  savePlans(plans);
  return plans[index];
}

/** 删除方案 */
export function deletePlan(id: string): boolean {
  const plans = loadPlans();
  const filtered = plans.filter((p) => p.id !== id);
  if (filtered.length === plans.length) return false;
  savePlans(filtered);
  return true;
}

/** 复制方案 */
export function duplicatePlan(id: string): ProductionPlan | null {
  const plans = loadPlans();
  const source = plans.find((p) => p.id === id);
  if (!source) return null;

  const now = new Date().toISOString();
  const copy: ProductionPlan = {
    ...JSON.parse(JSON.stringify(source)),
    id: generateId(),
    name: `${source.name} (副本)`,
    createdAt: now,
    updatedAt: now,
    status: "draft",
    starred: false,
  };

  plans.unshift(copy);
  savePlans(plans);
  return copy;
}

/** 切换方案收藏状态 */
export function toggleStarPlan(id: string): boolean {
  const plans = loadPlans();
  const plan = plans.find((p) => p.id === id);
  if (!plan) return false;
  plan.starred = !plan.starred;
  savePlans(plans);
  return plan.starred;
}

/** 获取单个方案 */
export function getPlan(id: string): ProductionPlan | null {
  const plans = loadPlans();
  return plans.find((p) => p.id === id) || null;
}

/** 格式化相对时间 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 30) return `${diffDay} 天前`;
  return date.toLocaleDateString("zh-CN");
}
