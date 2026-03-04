// 模块化控制台设计 - 期数计算Tab
// 展示9期连续排产的人力规划和产能数据

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { periods } from '@/lib/data';
import { ChevronDown, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ComposedChart, Line,
} from 'recharts';

export default function PeriodsTab() {
  const [expandedPeriod, setExpandedPeriod] = useState<number | null>(null);
  const [shiftMode, setShiftMode] = useState<'single' | 'double'>('single');

  // Chart data
  const workforceData = periods.map(p => ({
    name: `第${p.period}期`,
    期初人数: p.initialWorkers,
    雇佣: p.hire,
    解雇: p.fire,
    可用人数: p.availableWorkers,
  }));

  const productionData = periods.map(p => {
    const prod = shiftMode === 'single' ? p.singleShiftProduction : p.doubleShiftProduction;
    return {
      name: `第${p.period}期`,
      A: prod.A,
      B: prod.B,
      C: prod.C,
      D: prod.D,
      总产量: shiftMode === 'single' ? p.singleShiftTotal : p.doubleShiftTotal,
    };
  });

  const utilizationData = periods.map(p => ({
    name: `第${p.period}期`,
    机器利用率: shiftMode === 'single' ? p.singleMachineUtil : p.doubleMachineUtil,
    人力利用率: shiftMode === 'single' ? p.singleLaborUtil : p.doubleLaborUtil,
  }));

  const getTrend = (current: number, prev: number) => {
    if (current > prev) return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
    if (current < prev) return <TrendingDown className="w-3.5 h-3.5 text-red-500" />;
    return <Minus className="w-3.5 h-3.5 text-gray-400" />;
  };

  return (
    <div className="space-y-8">
      {/* Shift mode toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">9期连续排产计算</h2>
          <p className="text-sm text-gray-500 mt-1">查看各期人力规划与产能数据</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setShiftMode('single')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              shiftMode === 'single'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            单班
          </button>
          <button
            onClick={() => setShiftMode('double')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              shiftMode === 'double'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            双班
          </button>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Workforce chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">人力变化趋势</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={workforceData}>
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
              <Area type="monotone" dataKey="期初人数" fill="#059669" fillOpacity={0.1} stroke="#059669" strokeWidth={2} />
              <Area type="monotone" dataKey="可用人数" fill="#4F46E5" fillOpacity={0.1} stroke="#4F46E5" strokeWidth={2} />
              <Bar dataKey="雇佣" fill="#059669" radius={[2, 2, 0, 0]} barSize={16} />
              <Bar dataKey="解雇" fill="#EF4444" radius={[2, 2, 0, 0]} barSize={16} />
            </ComposedChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Production chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">
            产量分布（{shiftMode === 'single' ? '单班' : '双班'}）
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={productionData}>
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
              <Bar dataKey="A" stackId="prod" fill="#059669" radius={[0, 0, 0, 0]} />
              <Bar dataKey="B" stackId="prod" fill="#4F46E5" radius={[0, 0, 0, 0]} />
              <Bar dataKey="C" stackId="prod" fill="#F97316" radius={[0, 0, 0, 0]} />
              <Bar dataKey="D" stackId="prod" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Utilization chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
      >
        <h3 className="font-semibold text-gray-900 mb-4">
          资源利用率（{shiftMode === 'single' ? '单班' : '双班'}）
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={utilizationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number) => `${value}%`}
            />
            <Legend />
            <Area type="monotone" dataKey="机器利用率" fill="#059669" fillOpacity={0.15} stroke="#059669" strokeWidth={2} />
            <Area type="monotone" dataKey="人力利用率" fill="#4F46E5" fillOpacity={0.15} stroke="#4F46E5" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Period detail cards */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">各期详细数据</h3>
        {periods.map((p, i) => {
          const isExpanded = expandedPeriod === p.period;
          const prod = shiftMode === 'single' ? p.singleShiftProduction : p.doubleShiftProduction;
          const total = shiftMode === 'single' ? p.singleShiftTotal : p.doubleShiftTotal;
          const machUtil = shiftMode === 'single' ? p.singleMachineUtil : p.doubleMachineUtil;
          const laborUtil = shiftMode === 'single' ? p.singleLaborUtil : p.doubleLaborUtil;
          const matTotal = shiftMode === 'single' ? p.singleMaterialsTotal : p.doubleMaterialsTotal;

          return (
            <motion.div
              key={p.period}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpandedPeriod(isExpanded ? null : p.period)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-sm">
                    P{p.period}
                  </span>
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">第 {p.period} 期</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{p.hireStrategy}</span>
                      <span className="text-gray-300">|</span>
                      <span>瓶颈: {shiftMode === 'single' ? p.singleShiftBottleneck : p.doubleShiftBottleneck}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden sm:flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="text-gray-500 text-xs">可用人数</div>
                      <div className="font-mono font-medium flex items-center gap-1">
                        {p.availableWorkers}
                        {i > 0 && getTrend(p.availableWorkers, periods[i - 1].availableWorkers)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 text-xs">总产量</div>
                      <div className="font-mono font-medium">{total}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 text-xs">机器利用率</div>
                      <div className="font-mono font-medium text-emerald-600">{machUtil}%</div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="p-3 rounded-lg bg-gray-50">
                          <div className="text-xs text-gray-500 mb-1">期初人数</div>
                          <div className="text-lg font-bold font-mono">{p.initialWorkers}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-50">
                          <div className="text-xs text-emerald-600 mb-1">雇佣 / 解雇</div>
                          <div className="text-lg font-bold font-mono text-emerald-700">
                            +{p.hire} / -{p.fire}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-indigo-50">
                          <div className="text-xs text-indigo-600 mb-1">人机比</div>
                          <div className="text-lg font-bold font-mono text-indigo-700">{p.workerMachineRatio}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-orange-50">
                          <div className="text-xs text-orange-600 mb-1">材料总需求</div>
                          <div className="text-lg font-bold font-mono text-orange-700">{matTotal.toLocaleString()}</div>
                        </div>
                      </div>

                      {/* Production detail */}
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        产量明细
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-500 font-normal">
                          {shiftMode === 'single' ? '单班' : '双班'}模式
                        </span>
                      </h4>
                      <div className="grid grid-cols-4 gap-3">
                        {(['A', 'B', 'C', 'D'] as const).map(product => {
                          const colors: Record<string, string> = {
                            A: 'bg-emerald-500', B: 'bg-indigo-500', C: 'bg-orange-500', D: 'bg-purple-500'
                          };
                          const mats = shiftMode === 'single' ? p.singleMaterials : p.doubleMaterials;
                          return (
                            <div key={product} className="text-center p-3 rounded-lg bg-gray-50">
                              <div className={`w-8 h-8 rounded-lg ${colors[product]} text-white font-bold text-sm flex items-center justify-center mx-auto mb-2`}>
                                {product}
                              </div>
                              <div className="text-lg font-bold font-mono">{prod[product]}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                材料: {mats[product].toLocaleString()}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Utilization bars */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-20">机器利用率</span>
                          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${machUtil}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-medium w-12 text-right">{machUtil}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-20">人力利用率</span>
                          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                              style={{ width: `${laborUtil}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-medium w-12 text-right">{laborUtil}%</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
