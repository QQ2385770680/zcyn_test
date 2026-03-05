// 模块化控制台设计 - 自定义参数模拟器Tab v2
// 支持4班次产品分配、约束验证可视化、雇佣/解雇规则

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateProduction,
  getDefaultParams,
  emptyPeriodShiftPlan,
  optimizeAllPeriods,
  optimizeShiftPlan,
  PRODUCT_KEYS,
  SHIFT_NAMES,
  SHIFT_LABELS,
  DEFAULT_PRODUCTS,
  setActiveProducts,
  getActiveProducts,
  type ProductSpecInput,
  type SimulatorParams,
  type PeriodConfig,
  type HireStrategyType,
  type PeriodResult,
  type ShiftName,
  type ProductKey,
  type ConstraintStatus,
  getCellColor,
} from '@/lib/engine';
import {
  Sliders, RotateCcw, ChevronDown, ChevronRight, Cpu, Users, Percent,
  TrendingUp, TrendingDown, Minus, ArrowLeftRight, Zap, Factory,
  AlertTriangle, CheckCircle2, XCircle, Info, Sparkles, Wand2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, ComposedChart, Line,
} from 'recharts';
import P4HireLinkagePanel from './P4HireLinkagePanel';

const STRATEGY_OPTIONS: { value: HireStrategyType; label: string }[] = [
  { value: 'max_hire', label: '最大雇佣' },
  { value: 'no_hire', label: '不雇佣' },
  { value: 'hire_eq_fire', label: '雇佣=解雇' },
  { value: 'custom', label: '自定义' },
];

// 约束状态颜色
function constraintColor(s: ConstraintStatus) {
  switch (s.status) {
    case 'good': return 'text-emerald-600 bg-emerald-50';
    case 'warning': return 'text-amber-600 bg-amber-50';
    case 'danger': return 'text-gray-400 bg-gray-50';
    case 'over': return 'text-red-600 bg-red-50';
  }
}

function constraintIcon(s: ConstraintStatus) {
  switch (s.status) {
    case 'good': return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'warning': return <AlertTriangle className="w-3.5 h-3.5" />;
    case 'danger': return <Info className="w-3.5 h-3.5" />;
    case 'over': return <XCircle className="w-3.5 h-3.5" />;
  }
}

function constraintLabel(s: ConstraintStatus) {
  switch (s.status) {
    case 'good': return '接近0';
    case 'warning': return '偏大';
    case 'danger': return '未用';
    case 'over': return '超限';
  }
}

export default function SimulatorTab() {
  const [params, setParams] = useState<SimulatorParams>(getDefaultParams);
  const [compareMode, setCompareMode] = useState(true);
  const [showPerPeriod, setShowPerPeriod] = useState(false);
  const [expandedPeriod, setExpandedPeriod] = useState<number | null>(0);
  const [viewMode, setViewMode] = useState<'shift' | 'ratio'>('shift');
  const [showProductSpecs, setShowProductSpecs] = useState(false);
  const [productSpecs, setProductSpecs] = useState<Record<string, ProductSpecInput>>(() => ({ ...DEFAULT_PRODUCTS }));

  // 更新产品参数
  const updateProductSpec = useCallback((product: string, field: keyof ProductSpecInput, value: number) => {
    setProductSpecs(prev => {
      const next = { ...prev, [product]: { ...prev[product], [field]: value } };
      setActiveProducts(next); // 同步到 engine
      return next;
    });
    // 触发重新计算（通过更新params的引用）
    setParams(prev => ({ ...prev }));
  }, []);

  const resetProductSpecs = useCallback(() => {
    const defaults = { ...DEFAULT_PRODUCTS };
    setProductSpecs(defaults);
    setActiveProducts(defaults);
    setParams(prev => ({ ...prev }));
  }, []);

  // 确保 engine 使用最新的产品参数
  useMemo(() => {
    setActiveProducts(productSpecs);
  }, [productSpecs]);

  // 实时计算
  const result = useMemo(() => calculateProduction(params), [params, productSpecs]);
  const defaultResult = useMemo(() => {
    // 对比模式始终使用默认产品参数计算，以便与用户自定义参数对比
    const saved = getActiveProducts();
    setActiveProducts(DEFAULT_PRODUCTS);
    const r = calculateProduction(getDefaultParams());
    setActiveProducts(saved);
    return r;
  }, [productSpecs]);

  // 参数更新
  const updateParam = useCallback(<K extends keyof SimulatorParams>(key: K, value: SimulatorParams[K]) => {
    setParams(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'totalPeriods') {
        const newTotal = value as number;
        const configs = [...prev.periodConfigs];
        while (configs.length < newTotal) {
          configs.push({ hireStrategy: 'hire_eq_fire', machinePurchase: 0, shiftPlan: emptyPeriodShiftPlan() });
        }
        next.periodConfigs = configs.slice(0, newTotal);
      }
      return next;
    });
  }, []);

  const updatePeriodConfig = useCallback((index: number, updates: Partial<PeriodConfig>) => {
    setParams(prev => {
      const configs = [...prev.periodConfigs];
      configs[index] = { ...configs[index], ...updates };
      return { ...prev, periodConfigs: configs };
    });
  }, []);

  const updateShiftProduction = useCallback((periodIdx: number, shift: ShiftName, product: ProductKey, value: number) => {
    setParams(prev => {
      const configs = [...prev.periodConfigs];
      const config = { ...configs[periodIdx] };
      const plan = { ...config.shiftPlan };
      plan[shift] = { ...plan[shift], [product]: Math.max(0, value) };
      config.shiftPlan = plan;
      configs[periodIdx] = config;
      return { ...prev, periodConfigs: configs };
    });
  }, []);

  const resetParams = useCallback(() => {
    setParams(getDefaultParams());
    setExpandedPeriod(0);
    resetProductSpecs();
  }, [resetProductSpecs]);

  // 一键推荐所有期的最优排产
  const applyOptimalAll = useCallback(() => {
    setParams(prev => {
      const plans = optimizeAllPeriods(prev);
      const configs = prev.periodConfigs.map((c, i) => ({
        ...c,
        shiftPlan: plans[i] || c.shiftPlan,
      }));
      return { ...prev, periodConfigs: configs };
    });
    setExpandedPeriod(0);
  }, []);

  // 单期推荐最优排产
  const applyOptimalSingle = useCallback((periodIdx: number) => {
    setParams(prev => {
      // 先计算到该期的状态
      const tempResult = calculateProduction(prev);
      const pr = tempResult.periods[periodIdx];
      if (!pr) return prev;
      const plan = optimizeShiftPlan(pr.machines, pr.totalAvailableWorkers, periodIdx + 1);
      const configs = [...prev.periodConfigs];
      configs[periodIdx] = { ...configs[periodIdx], shiftPlan: plan };
      return { ...prev, periodConfigs: configs };
    });
  }, []);

  // 图表数据
  const chartData = result.periods.map((p, i) => {
    const dp = compareMode && i < defaultResult.periods.length ? defaultResult.periods[i] : null;
    return {
      name: `P${p.period}`,
      班次排产: p.periodTotal,
      按比例产量: p.singleShiftTotal,
      ...(dp ? { 默认按比例: dp.singleShiftTotal } : {}),
      可用人数: p.totalAvailableWorkers,
      ...(dp ? { 默认可用人数: dp.totalAvailableWorkers } : {}),
      机器: p.machines,
    };
  });

  // 总产量
  const totalShiftProd = result.periods.reduce((s, p) => s + p.periodTotal, 0);
  const totalRatioProd = result.periods.reduce((s, p) => s + p.singleShiftTotal, 0);
  const defTotalRatio = defaultResult.periods.reduce((s, p) => s + p.singleShiftTotal, 0);
  const diff = totalRatioProd - defTotalRatio;
  const diffPct = defTotalRatio > 0 ? ((diff / defTotalRatio) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            自定义参数模拟器
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            调整参数和各期班次排产，实时验证约束条件
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={compareMode}
              onChange={e => setCompareMode(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            对比默认方案
          </label>
          <button
            onClick={applyOptimalAll}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-lg hover:from-violet-700 hover:to-indigo-700 shadow-sm hover:shadow-md transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            一键最优排产
          </button>
          <button
            onClick={resetParams}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置参数
          </button>
        </div>
      </div>

      {/* Product Specs - ABCD 作为列标题 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <button
          onClick={() => setShowProductSpecs(!showProductSpecs)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors border-b border-gray-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Factory className="w-4 h-4 text-violet-600" />
            </div>
            <h3 className="font-semibold text-gray-900">产品规格参数</h3>
            <span className="text-[10px] text-gray-400">机器时 / 人力时 / 原材料</span>
            {Object.entries(productSpecs).some(([k, v]) => 
              v.machineHours !== DEFAULT_PRODUCTS[k].machineHours ||
              v.laborHours !== DEFAULT_PRODUCTS[k].laborHours ||
              v.materials !== DEFAULT_PRODUCTS[k].materials
            ) && (
              <span className="text-[10px] font-medium text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full border border-violet-200">已修改</span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProductSpecs ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {showProductSpecs && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-2 py-2 text-left w-24">参数</th>
                        {PRODUCT_KEYS.map(pk => (
                          <th key={pk} className="px-2 py-2 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${
                              pk === 'A' ? 'bg-blue-100 text-blue-700' :
                              pk === 'B' ? 'bg-emerald-100 text-emerald-700' :
                              pk === 'C' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>{pk}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(['machineHours', 'laborHours', 'materials'] as const).map(field => {
                        const fieldLabel = field === 'machineHours' ? '机器时' : field === 'laborHours' ? '人力时' : '原材料';
                        return (
                          <tr key={field} className="border-t border-gray-50">
                            <td className="px-2 py-1.5 text-xs font-medium text-gray-600">{fieldLabel}</td>
                            {PRODUCT_KEYS.map(pk => {
                              const spec = productSpecs[pk];
                              const def = DEFAULT_PRODUCTS[pk];
                              const isModified = spec[field] !== def[field];
                              return (
                                <td key={pk} className="px-2 py-1.5">
                                  <input
                                    type="number"
                                    min={1}
                                    max={field === 'materials' ? 99999 : 9999}
                                    value={spec[field]}
                                    onChange={e => updateProductSpec(pk, field, Math.max(1, parseInt(e.target.value) || 1))}
                                    className={`w-full px-2 py-1 rounded border text-center font-mono text-sm transition-all outline-none ${
                                      isModified
                                        ? 'border-violet-300 bg-violet-50/50 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
                                        : 'border-gray-200 bg-gray-50/80 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                                    }`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      <tr className="border-t border-gray-100">
                        <td className="px-2 py-1.5 text-xs font-medium text-violet-500">机器/单位</td>
                        {PRODUCT_KEYS.map(pk => (
                          <td key={pk} className="px-2 py-1.5 text-center font-mono text-xs text-violet-500 font-medium">
                            {(productSpecs[pk].machineHours / 520).toFixed(4)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-t border-gray-50">
                        <td className="px-2 py-1.5 text-xs font-medium text-violet-500">人力/单位</td>
                        {PRODUCT_KEYS.map(pk => (
                          <td key={pk} className="px-2 py-1.5 text-center font-mono text-xs text-violet-500 font-medium">
                            {(productSpecs[pk].laborHours / 520).toFixed(4)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                  <div className="text-[11px] text-gray-400">
                    修改产品参数后，所有排产计算、约束验证、最优求解均实时联动更新
                  </div>
                  <button
                    onClick={resetProductSpecs}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    恢复默认
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Global Parameters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Sliders className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="font-semibold text-gray-900">全局参数</h3>
        </div>
        <div className="p-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Cpu className="w-4 h-4 text-emerald-500" />
                初始机器数量
                <span className="text-[9px] font-bold text-yellow-500 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200">必填</span>
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={params.initialMachines}
                onChange={e => updateParam('initialMachines', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 rounded-lg border border-yellow-300 bg-yellow-50/50 font-mono text-sm focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 focus:bg-white transition-all outline-none"
              />
              <div className="text-xs text-gray-400 mt-1">默认: 157（对应 Excel 第1期本期机器）</div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 text-indigo-500" />
                初始工人数量
                <span className="text-[9px] font-bold text-yellow-500 bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-200">必填</span>
              </label>
              <input
                type="number"
                min={1}
                max={9999}
                value={params.initialWorkers}
                onChange={e => updateParam('initialWorkers', Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2.5 rounded-lg border border-yellow-300 bg-yellow-50/50 font-mono text-sm focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 focus:bg-white transition-all outline-none"
              />
              <div className="text-xs text-gray-400 mt-1">默认: 113（对应 Excel 第1期期初人数）</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">模拟期数</label>
              <input
                type="number"
                min={1}
                max={20}
                value={params.totalPeriods}
                onChange={e => updateParam('totalPeriods', Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 font-mono text-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 focus:bg-white transition-all outline-none"
              />
              <div className="text-xs text-gray-400 mt-1">默认: 9 (范围: 1-20)</div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Percent className="w-4 h-4 text-red-400" />
                解雇比例范围
              </label>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 w-6">最低</span>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={params.fireRateMin * 100}
                  onChange={e => updateParam('fireRateMin', parseInt(e.target.value) / 100)}
                  className="flex-1 accent-red-500"
                />
                <span className="font-mono w-10 text-right">{(params.fireRateMin * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <span className="text-gray-500 w-6">最高</span>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={params.fireRateMax * 100}
                  onChange={e => updateParam('fireRateMax', parseInt(e.target.value) / 100)}
                  className="flex-1 accent-orange-500"
                />
                <span className="font-mono w-10 text-right">{(params.fireRateMax * 100).toFixed(0)}%</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">默认: 3%~10%</div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Percent className="w-4 h-4 text-emerald-400" />
                最大雇佣比例
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={params.hireRate * 100}
                  onChange={e => updateParam('hireRate', parseInt(e.target.value) / 100)}
                  className="flex-1 accent-emerald-500"
                />
                <span className="font-mono text-sm w-12 text-right">{(params.hireRate * 100).toFixed(0)}%</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">默认: 50%（期初人数的50%）</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">新工人效率</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={params.newWorkerEfficiency * 100}
                  onChange={e => updateParam('newWorkerEfficiency', parseInt(e.target.value) / 100)}
                  className="flex-1 accent-indigo-500"
                />
                <span className="font-mono text-sm w-12 text-right">{(params.newWorkerEfficiency * 100).toFixed(0)}%</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">默认: 25%</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Per-period strategy config */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <button
          onClick={() => setShowPerPeriod(!showPerPeriod)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">各期雇佣策略</h3>
              <p className="text-xs text-gray-500 mt-0.5">设置每期的雇佣策略、解雇人数和机器购买</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showPerPeriod ? 'rotate-180' : ''}`} />
        </button>

        {showPerPeriod && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80">
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-16">期数</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500">雇佣策略</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-24">自定义雇佣</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-24">自定义解雇</th>
                    <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-24">购买机器</th>
                    <th className="px-3 py-2.5 text-right font-medium text-gray-500 w-24">期初人数</th>
                    <th className="px-3 py-2.5 text-right font-medium text-gray-500 w-28">解雇范围</th>
                    <th className="px-3 py-2.5 text-right font-medium text-gray-500 w-24">最大雇佣</th>
                  </tr>
                </thead>
                <tbody>
                  {params.periodConfigs.map((config, i) => {
                    const pr = result.periods[i];
                    return (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs">
                            P{i + 1}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={config.hireStrategy}
                            onChange={e => updatePeriodConfig(i, { hireStrategy: e.target.value as HireStrategyType })}
                            className="px-2.5 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-sm focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 outline-none"
                          >
                            {STRATEGY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 relative">
                          <span className="absolute -top-0.5 right-1 text-[8px] font-bold text-orange-500">选填</span>
                          <input
                            type="number"
                            min={0}
                            disabled={config.hireStrategy !== 'custom'}
                            value={config.customHire || 0}
                            onChange={e => updatePeriodConfig(i, { customHire: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full px-2.5 py-1.5 rounded-md border border-orange-300 bg-orange-50/50 font-mono text-sm disabled:opacity-40 disabled:cursor-not-allowed focus:border-orange-400 focus:ring-1 focus:ring-orange-100 outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 relative">
                          <span className="absolute -top-0.5 right-1 text-[8px] font-bold text-orange-500">选填</span>
                          <input
                            type="number"
                            min={pr ? pr.minFire : 0}
                            max={pr ? pr.maxFire : 999}
                            value={config.customFire ?? (pr ? pr.minFire : 0)}
                            onChange={e => updatePeriodConfig(i, { customFire: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full px-2.5 py-1.5 rounded-md border border-orange-300 bg-orange-50/50 font-mono text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-100 outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 relative">
                          <span className="absolute -top-0.5 right-1 text-[8px] font-bold text-orange-500">选填</span>
                          <input
                            type="number"
                            min={0}
                            value={config.machinePurchase || 0}
                            onChange={e => updatePeriodConfig(i, { machinePurchase: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full px-2.5 py-1.5 rounded-md border border-orange-300 bg-orange-50/50 font-mono text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-100 outline-none"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={`font-mono px-2 py-1 rounded-md text-sm ${
                            i === 0
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}>
                            {pr ? Math.round(pr.initialWorkers) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-mono text-xs px-2 py-1 rounded-md bg-sky-50 text-sky-600 border border-sky-200">
                            {pr ? `${pr.minFire}~${pr.maxFire}` : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="font-mono px-2 py-1 rounded-md text-sm bg-sky-50 text-sky-700 border border-sky-200">
                            {pr ? pr.maxHire : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </motion.div>

      {/* Period Shift Planning - Main Feature */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Factory className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">班次排产计划</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                设置每期4个班次的产品产量，实时验证可用人数/机器约束
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" /> 接近0
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-600">
              <AlertTriangle className="w-3 h-3" /> 偏大
            </span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-600">
              <XCircle className="w-3 h-3" /> 超限
            </span>
          </div>
        </div>
        {/* Color legend - 统一显示一次，严格对应 Excel 颜色 */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border-2 border-yellow-400 bg-yellow-50"></span>
            <span className="text-gray-600">黄格 = 必填</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border-2 border-orange-400 bg-orange-50"></span>
            <span className="text-gray-600">橙格 = 选填</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border-2 border-sky-400 bg-sky-50"></span>
            <span className="text-gray-600">蓝格 = 公式</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded border border-gray-200 bg-gray-50/50"></span>
            <span className="text-gray-400">灰色 = 不填</span>
          </span>
        </div>

        <div className="divide-y divide-gray-50">
          {result.periods.map((pr, i) => {
            const isExpanded = expandedPeriod === i;
            const config = params.periodConfigs[i];
            const hasProduction = pr.periodTotal > 0;

            return (
              <div key={i}>
                <button
                  onClick={() => setExpandedPeriod(isExpanded ? null : i)}
                  className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 text-gray-400" />
                    }
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">
                      P{i + 1}
                    </span>
                    <div className="text-left">
                      <div className="text-sm font-medium text-gray-900">
                        第{i + 1}期
                        <span className="text-gray-400 font-normal ml-2">
                          机器:{pr.machines} | 可用人数:{pr.totalAvailableWorkers}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {pr.hireStrategy} | 解雇:{pr.fire} | 雇佣:{pr.hire}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasProduction && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 6个约束状态指示器 — 严格对应 Excel rule.xls 中的6个检查点 */}
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${constraintColor(pr.availWorkers_afterShift1)}`}>
                          {constraintIcon(pr.availWorkers_afterShift1)}
                          <span>一班人</span>
                        </div>
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${constraintColor(pr.availMachines_afterShift1)}`}>
                          {constraintIcon(pr.availMachines_afterShift1)}
                          <span>一班机</span>
                        </div>
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${constraintColor(pr.availWorkers_afterOT1)}`}>
                          {constraintIcon(pr.availWorkers_afterOT1)}
                          <span>一加人</span>
                        </div>
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${constraintColor(pr.availMachines_afterShift2)}`}>
                          {constraintIcon(pr.availMachines_afterShift2)}
                          <span>二班机</span>
                        </div>
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${constraintColor(pr.availWorkers_afterOT2)}`}>
                          {constraintIcon(pr.availWorkers_afterOT2)}
                          <span>二加人</span>
                        </div>
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs ${constraintColor(pr.availMachines_afterOT2)}`}>
                          {constraintIcon(pr.availMachines_afterOT2)}
                          <span>二加机</span>
                        </div>
                      </div>
                    )}
                    <span className="font-mono text-sm font-semibold text-gray-700">
                      总产量: {pr.periodTotal}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); applyOptimalSingle(i); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors"
                    >
                      <Wand2 className="w-3 h-3" />
                      本期最优
                    </button>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6">
                        {/* Period info bar - 颜色对应 Excel: 黄=必填, 橙=选填, 蓝=公式 */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
                          <div className={`rounded-lg px-3 py-2 border ${
                            i === 0
                              ? 'bg-yellow-50 border-yellow-300'
                              : 'bg-sky-50 border-sky-200'
                          }`}>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              本期机器
                              <span className={`text-[8px] font-bold ${
                                i === 0 ? 'text-yellow-500' : 'text-sky-500'
                              }`}>
                                {i === 0 ? '必填' : '公式'}
                              </span>
                            </div>
                            <div className="font-mono font-semibold text-gray-900">{pr.machines}</div>
                          </div>
                          <div className={`rounded-lg px-3 py-2 border ${
                            i === 0
                              ? 'bg-yellow-50 border-yellow-300'
                              : 'bg-sky-50 border-sky-200'
                          }`}>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              期初人数
                              <span className={`text-[8px] font-bold ${
                                i === 0 ? 'text-yellow-500' : 'text-sky-500'
                              }`}>
                                {i === 0 ? '必填' : '公式'}
                              </span>
                            </div>
                            <div className="font-mono font-semibold text-gray-900">{Math.round(pr.initialWorkers)}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            <div className="text-xs text-gray-500">可用人数</div>
                            <div className="font-mono font-semibold text-gray-900">{pr.totalAvailableWorkers}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            <div className="text-xs text-gray-500">解雇/雇佣</div>
                            <div className="font-mono font-semibold">
                              <span className="text-red-500">-{pr.fire}</span>
                              <span className="text-gray-300 mx-1">/</span>
                              <span className="text-emerald-600">+{pr.hire}</span>
                            </div>
                          </div>
                          <div className="bg-sky-50 rounded-lg px-3 py-2 border border-sky-200">
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              解雇范围
                              <span className="text-[8px] font-bold text-sky-500">公式</span>
                            </div>
                            <div className="font-mono font-semibold text-gray-900">{pr.minFire}~{pr.maxFire}</div>
                          </div>
                          <div className="bg-sky-50 rounded-lg px-3 py-2 border border-sky-200">
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              最大雇佣
                              <span className="text-[8px] font-bold text-sky-500">公式</span>
                            </div>
                            <div className="font-mono font-semibold text-gray-900">{pr.maxHire}</div>
                          </div>
                        </div>

                        {/* Shift production table - 班次作为列标题 */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border border-gray-100 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-3 py-2.5 text-left font-medium text-gray-500 w-20">产品</th>
                                {SHIFT_NAMES.map(shift => {
                                  const isOT = shift === 'ot1' || shift === 'ot2';
                                  return (
                                    <th key={shift} className="px-3 py-2.5 text-center font-medium text-gray-500 w-24">
                                      <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                                        isOT ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                      }`}>
                                        {SHIFT_LABELS[shift]}
                                      </span>
                                    </th>
                                  );
                                })}
                                <th className="px-3 py-2.5 text-center font-medium text-gray-500 w-20">合计</th>
                              </tr>
                            </thead>
                            <tbody>
                              {PRODUCT_KEYS.map(p => {
                                const productTotal = SHIFT_NAMES.reduce((s, sh) => s + (config.shiftPlan[sh][p] || 0), 0);
                                return (
                                  <tr key={p} className="border-t border-gray-100">
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${
                                        p === 'A' ? 'bg-blue-100 text-blue-700' :
                                        p === 'B' ? 'bg-emerald-100 text-emerald-700' :
                                        p === 'C' ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>{p}</span>
                                    </td>
                                    {SHIFT_NAMES.map(shift => {
                                      const plan = config.shiftPlan[shift];
                                      const cellColor = getCellColor(i + 1, shift, p);
                                      const hasValue = (plan[p] || 0) > 0;
                                      let inputStyle = '';
                                      if (hasValue) {
                                        inputStyle = 'border-emerald-300 bg-emerald-50/50 text-emerald-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100';
                                      } else if (cellColor === 'yellow') {
                                        inputStyle = 'border-yellow-400 bg-yellow-50 text-yellow-700 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 ring-1 ring-yellow-200';
                                      } else if (cellColor === 'orange') {
                                        inputStyle = 'border-orange-400 bg-orange-50 text-orange-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 ring-1 ring-orange-200';
                                      } else {
                                        inputStyle = 'border-gray-200 bg-gray-50/50 text-gray-300 focus:border-gray-300 focus:ring-2 focus:ring-gray-100';
                                      }
                                      return (
                                        <td key={shift} className="px-2 py-1.5 relative">
                                          {cellColor !== 'none' && !hasValue && (
                                            <span className={`absolute top-0.5 right-1 text-[9px] font-bold ${
                                              cellColor === 'yellow' ? 'text-yellow-500' : 'text-orange-500'
                                            }`}>
                                              {cellColor === 'yellow' ? '必填' : '选填'}
                                            </span>
                                          )}
                                          <input
                                            type="number"
                                            min={0}
                                            max={999}
                                            value={plan[p] || ''}
                                            onChange={e => updateShiftProduction(i, shift, p, parseInt(e.target.value) || 0)}
                                            onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                                            className={`w-full px-2 py-1.5 rounded-md border text-center font-mono text-sm transition-all outline-none ${inputStyle}`}
                                          />
                                        </td>
                                      );
                                    })}
                                    <td className="px-3 py-2 text-center font-mono font-semibold text-gray-700">
                                      {productTotal}
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* 班次小计行 */}
                              <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                                <td className="px-3 py-2 font-semibold text-gray-700 text-sm">小计</td>
                                {SHIFT_NAMES.map(shift => {
                                  const shiftTotal = PRODUCT_KEYS.reduce((s, p) => s + (config.shiftPlan[shift][p] || 0), 0);
                                  return (
                                    <td key={shift} className="px-3 py-2 text-center font-mono font-semibold text-gray-700">
                                      {shiftTotal}
                                    </td>
                                  );
                                })}
                                <td className="px-3 py-2 text-center font-mono font-bold text-emerald-700 text-base">
                                  {pr.periodTotal}
                                </td>
                              </tr>
                              {/* 可用人数行 */}
                              <tr className="border-t border-gray-100">
                                <td className="px-3 py-2 text-xs font-medium text-gray-500">可用人数</td>
                                {SHIFT_NAMES.map(shift => {
                                  let constraint: ConstraintStatus | null = null;
                                  let label = '';
                                  if (shift === 'shift1') { constraint = pr.availWorkers_afterShift1; label = '一班后'; }
                                  else if (shift === 'ot1') { constraint = pr.availWorkers_afterOT1; label = '一加后'; }
                                  else if (shift === 'shift2') { constraint = null; }
                                  else if (shift === 'ot2') { constraint = pr.availWorkers_afterOT2; label = '二加后'; }
                                  return (
                                    <td key={shift} className="px-2 py-2">
                                      {constraint && (
                                        <div className="flex flex-col items-center gap-0.5">
                                          <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-mono ${constraintColor(constraint)}`}>
                                            {constraintIcon(constraint)}
                                            <span>{constraint.value.toFixed(3)}</span>
                                          </div>
                                          <span className="text-[9px] text-gray-400">{label}</span>
                                          {shift === 'ot2' && (
                                            <div className="text-[9px] text-violet-500 font-mono">
                                              上限:{pr.ot2_maxWorkers.toFixed(1)} 已用:{pr.ot2_usedWorkers.toFixed(1)}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td></td>
                              </tr>
                              {/* 可用机器行 */}
                              <tr className="border-t border-gray-100">
                                <td className="px-3 py-2 text-xs font-medium text-gray-500">可用机器</td>
                                {SHIFT_NAMES.map(shift => {
                                  let constraint: ConstraintStatus | null = null;
                                  let label = '';
                                  if (shift === 'shift1') { constraint = pr.availMachines_afterShift1; label = '一班后'; }
                                  else if (shift === 'ot1') { constraint = pr.availMachines_afterShift2; label = '二班后'; }
                                  else if (shift === 'shift2') { constraint = null; }
                                  else if (shift === 'ot2') { constraint = pr.availMachines_afterOT2; label = '二加后'; }
                                  return (
                                    <td key={shift} className="px-2 py-2">
                                      {constraint && (
                                        <div className="flex flex-col items-center gap-0.5">
                                          <div className={`flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-mono ${constraintColor(constraint)}`}>
                                            {constraintIcon(constraint)}
                                            <span>{constraint.value.toFixed(3)}</span>
                                          </div>
                                          <span className="text-[9px] text-gray-400">{label}</span>
                                          {shift === 'ot2' && (
                                            <div className="text-[9px] text-violet-500 font-mono">
                                              上限:{pr.ot2_maxMachines.toFixed(1)} 已用:{pr.ot2_usedMachines.toFixed(1)}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>


                        {/* P4 Hire Linkage Panel */}
                        {i === 3 && (
                          <P4HireLinkagePanel
                            params={params}
                            onApplyHire={(hire) => {
                              updatePeriodConfig(3, { hireStrategy: 'custom', customHire: hire });
                            }}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* View mode toggle + Summary */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('shift')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'shift' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            班次排产
          </button>
          <button
            onClick={() => setViewMode('ratio')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'ratio' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            按比例产能
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <div className="text-xs text-gray-500 mb-1">
            {viewMode === 'shift' ? '班次排产总量' : '按比例总产量'}
          </div>
          <div className="text-2xl font-bold font-mono text-gray-900">
            {viewMode === 'shift' ? totalShiftProd.toLocaleString() : totalRatioProd.toLocaleString()}
          </div>
          {compareMode && viewMode === 'ratio' && (
            <div className={`text-xs mt-1 font-mono flex items-center gap-1 ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {diff > 0 ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              {diff > 0 ? '+' : ''}{diff} ({diffPct}%)
            </div>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <div className="text-xs text-gray-500 mb-1">末期可用人数</div>
          <div className="text-2xl font-bold font-mono text-gray-900">
            {result.periods[result.periods.length - 1]?.totalAvailableWorkers.toFixed(3) || '-'}
          </div>
          <div className="text-xs text-gray-400 mt-1">第{params.totalPeriods}期</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <div className="text-xs text-gray-500 mb-1">末期机器数</div>
          <div className="text-2xl font-bold font-mono text-gray-900">
            {result.periods[result.periods.length - 1]?.machines || '-'}
          </div>
          <div className="text-xs text-gray-400 mt-1">含购买生效</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <div className="text-xs text-gray-500 mb-1">按比例单期产量</div>
          <div className="text-2xl font-bold font-mono text-gray-900">
            {result.periods[result.periods.length - 1]?.singleShiftTotal || '-'}
          </div>
          <div className="text-xs text-gray-400 mt-1">单班模式</div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">
            产量趋势
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend />
              {viewMode === 'shift' ? (
                <Bar dataKey="班次排产" fill="#059669" radius={[4, 4, 0, 0]} barSize={32} />
              ) : (
                <>
                  <Bar dataKey="按比例产量" fill="#059669" radius={[4, 4, 0, 0]} barSize={compareMode ? 20 : 32} />
                  {compareMode && (
                    <Bar dataKey="默认按比例" fill="#d1d5db" radius={[4, 4, 0, 0]} barSize={20} />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">
            人力与机器趋势{compareMode ? '（对比）' : ''}
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="可用人数" fill="#4F46E5" fillOpacity={0.1} stroke="#4F46E5" strokeWidth={2} />
              {compareMode && (
                <Line type="monotone" dataKey="默认可用人数" stroke="#d1d5db" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              )}
              <Line type="monotone" dataKey="机器" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Result table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">详细计算结果</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-3 py-3 text-left font-medium text-gray-500 sticky left-0 bg-gray-50/80 z-10">期数</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">机器</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">期初人数</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">解雇</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">雇佣</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">策略</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">可用人数</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">班次产量</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">比例产量</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">机器%</th>
                <th className="px-3 py-3 text-right font-medium text-gray-500">人力%</th>
                <th className="px-3 py-3 text-left font-medium text-gray-500">瓶颈</th>
              </tr>
            </thead>
            <tbody>
              {result.periods.map((p) => (
                <tr key={p.period} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2.5 sticky left-0 bg-white z-10">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs">
                      P{p.period}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{p.machines}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{Math.round(p.initialWorkers)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-500">-{p.fire}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-600">+{p.hire}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{p.hireStrategy}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{p.totalAvailableWorkers}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-700">{p.periodTotal}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{p.singleShiftTotal}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-600">{p.singleMachineUtil}%</td>
                  <td className="px-3 py-2.5 text-right font-mono text-indigo-600">{p.singleLaborUtil}%</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.singleShiftBottleneck === '机器' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {p.singleShiftBottleneck}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}


