// 第四期雇佣联动面板
// 通过滑块调整第四期雇佣人数（90-130），实时预览第五期约束影响

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  previewP4Linkage,
  batchPreviewP4Linkage,
  PRODUCT_KEYS,
  SHIFT_LABELS,
  type SimulatorParams,
  type ConstraintStatus,
  type P4LinkagePreview,
} from '@/lib/engine';
import {
  Users, Cpu, TrendingUp, AlertTriangle, CheckCircle2, XCircle,
  ArrowRight, Zap, Link2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart,
} from 'recharts';

interface P4HireLinkagePanelProps {
  params: SimulatorParams;
  onApplyHire: (hire: number) => void;
}

// 约束状态颜色和图标
function constraintColor(c: ConstraintStatus) {
  switch (c.status) {
    case 'good': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'warning': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'danger': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'over': return 'bg-red-50 text-red-700 border-red-200';
  }
}

function constraintBadge(c: ConstraintStatus) {
  switch (c.status) {
    case 'good': return <span className="flex items-center gap-0.5 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> 接近0</span>;
    case 'warning': return <span className="flex items-center gap-0.5 text-amber-600"><AlertTriangle className="w-3 h-3" /> 偏大</span>;
    case 'danger': return <span className="flex items-center gap-0.5 text-orange-600"><AlertTriangle className="w-3 h-3" /> 过大</span>;
    case 'over': return <span className="flex items-center gap-0.5 text-red-600"><XCircle className="w-3 h-3" /> 超限</span>;
  }
}

export default function P4HireLinkagePanel({ params, onApplyHire }: P4HireLinkagePanelProps) {
  const [p4Hire, setP4Hire] = useState(110);

  // 当前滑块值的预览
  const preview = useMemo(() => previewP4Linkage(params, p4Hire), [params, p4Hire]);

  // 批量预览用于图表
  const chartData = useMemo(() => {
    const previews = batchPreviewP4Linkage(params, [90, 130], 1);
    return previews.map(pv => ({
      hire: pv.p4Hire,
      p5Workers: parseFloat(pv.p5TotalAvailableWorkers.toFixed(3)),
      p5Total: pv.p5PeriodTotal,
      一班人: parseFloat(pv.p5Constraints.availWorkers_afterShift1.value.toFixed(3)),
      一班机: parseFloat(pv.p5Constraints.availMachines_afterShift1.value.toFixed(3)),
      二班机: parseFloat(pv.p5Constraints.availMachines_afterShift2.value.toFixed(3)),
      二加人: parseFloat(pv.p5Constraints.availWorkers_afterOT2.value.toFixed(3)),
      二加机: parseFloat(pv.p5Constraints.availMachines_afterOT2.value.toFixed(3)),
    }));
  }, [params]);

  // 约束总评分（越低越好）
  const constraintScore = useMemo(() => {
    const c = preview.p5Constraints;
    return Math.abs(c.availWorkers_afterShift1.value) +
      Math.abs(c.availMachines_afterShift1.value) +
      Math.abs(c.availMachines_afterShift2.value) +
      Math.abs(c.availWorkers_afterOT2.value);
  }, [preview]);

  // 找到最优雇佣人数
  const optimalHire = useMemo(() => {
    let bestHire = 90;
    let bestScore = Infinity;
    for (let h = 90; h <= 130; h++) {
      const pv = previewP4Linkage(params, h);
      const c = pv.p5Constraints;
      const score = Math.abs(c.availWorkers_afterShift1.value) +
        Math.abs(c.availMachines_afterShift1.value) +
        Math.abs(c.availMachines_afterShift2.value) +
        Math.abs(c.availWorkers_afterOT2.value) +
        (c.availWorkers_afterShift1.value < 0 ? 50 : 0) +
        (c.availMachines_afterShift1.value < 0 ? 50 : 0) +
        (c.availWorkers_afterOT2.value < 0 ? 50 : 0);
      if (score < bestScore) {
        bestScore = score;
        bestHire = h;
      }
    }
    return bestHire;
  }, [params]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/80 to-indigo-50/60 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-violet-100/80 to-indigo-100/60 border-b border-violet-200/60">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm">
              <Link2 className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-violet-900 text-sm">P4 → P5 雇佣联动分析</h4>
              <p className="text-xs text-violet-600 mt-0.5">调整第四期雇佣人数，实时预览第五期约束变化</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setP4Hire(optimalHire)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-100 border border-violet-300 rounded-lg hover:bg-violet-200 transition-colors"
            >
              <Zap className="w-3 h-3" />
              最优值: {optimalHire}
            </button>
            <button
              onClick={() => onApplyHire(p4Hire)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
            >
              应用到P4
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-violet-900">
              第四期雇佣人数
            </label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold text-violet-700">{p4Hire}</span>
              <span className="text-xs text-violet-500">人</span>
            </div>
          </div>
          <div className="relative">
            <input
              type="range"
              min={90}
              max={130}
              step={1}
              value={p4Hire}
              onChange={e => setP4Hire(parseInt(e.target.value))}
              className="w-full h-2 bg-violet-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
            <div className="flex justify-between text-xs text-violet-400 mt-1.5 px-0.5">
              <span>90</span>
              <span>100</span>
              <span>110</span>
              <span>120</span>
              <span>130</span>
            </div>
            {/* 最优标记 */}
            <div
              className="absolute top-0 -mt-1"
              style={{ left: `${((optimalHire - 90) / 40) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-1 h-4 bg-emerald-500 rounded-full" title={`最优: ${optimalHire}`} />
            </div>
          </div>
        </div>

        {/* P4 → P5 Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* P4 Summary */}
          <div className="bg-white/80 rounded-xl border border-violet-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs">P4</span>
              <span className="text-sm font-semibold text-gray-800">第四期</span>
              <ArrowRight className="w-4 h-4 text-violet-400 ml-auto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500">雇佣人数</div>
                <div className="font-mono font-bold text-violet-700 text-lg">{p4Hire}</div>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="text-xs text-gray-500">解雇人数</div>
                <div className="font-mono font-semibold text-gray-700">{preview.p5Fire > 0 ? Math.ceil(preview.p5InitialWorkers * params.fireRateMin / (1 + p4Hire / preview.p5InitialWorkers)) : '-'}</div>
                <div className="text-xs text-gray-400">P4解雇</div>
              </div>
            </div>
          </div>

          {/* P5 Summary */}
          <div className="bg-white/80 rounded-xl border border-violet-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs">P5</span>
              <span className="text-sm font-semibold text-gray-800">第五期预览</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                <div className="text-xs text-gray-500">期初人数</div>
                <div className="font-mono font-semibold text-gray-900">{Math.round(preview.p5InitialWorkers)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                <div className="text-xs text-gray-500">可用人数</div>
                <div className="font-mono font-semibold text-indigo-700">{preview.p5TotalAvailableWorkers.toFixed(3)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg px-2.5 py-2">
                <div className="text-xs text-gray-500">推荐总产量</div>
                <div className="font-mono font-bold text-emerald-700">{preview.p5PeriodTotal}</div>
              </div>
            </div>
          </div>
        </div>

        {/* P5 Optimal Plan Preview */}
        <div className="bg-white/80 rounded-xl border border-violet-100 p-4">
          <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-500" />
            第五期最优排产预览（基于P4雇佣={p4Hire}）
          </h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-3 py-2 text-left font-medium text-gray-500 w-16">班次</th>
                  {PRODUCT_KEYS.map(p => (
                    <th key={p} className="px-3 py-2 text-center font-medium text-gray-500 w-16">{p}</th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium text-gray-500 w-16">小计</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 w-28">可用人数</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500 w-28">可用机器</th>
                </tr>
              </thead>
              <tbody>
                {(['shift1', 'ot1', 'shift2', 'ot2'] as const).map((shift) => {
                  const plan = preview.p5OptimalPlan[shift];
                  const total = PRODUCT_KEYS.reduce((s, p) => s + (plan[p] || 0), 0);
                  const isOT = shift === 'ot1' || shift === 'ot2';

                  let workerC: ConstraintStatus | null = null;
                  let machineC: ConstraintStatus | null = null;
                  if (shift === 'shift1') {
                    workerC = preview.p5Constraints.availWorkers_afterShift1;
                    machineC = preview.p5Constraints.availMachines_afterShift1;
                  } else if (shift === 'ot1') {
                    workerC = preview.p5Constraints.availWorkers_afterOT1;
                    machineC = preview.p5Constraints.availMachines_afterShift2;
                  } else if (shift === 'ot2') {
                    workerC = preview.p5Constraints.availWorkers_afterOT2;
                    machineC = preview.p5Constraints.availMachines_afterOT2;
                  }

                  return (
                    <tr key={shift} className={`border-t border-gray-100 ${isOT ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                          isOT ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {SHIFT_LABELS[shift]}
                        </span>
                      </td>
                      {PRODUCT_KEYS.map(p => (
                        <td key={p} className="px-3 py-2 text-center font-mono text-sm">
                          {(plan[p] || 0) > 0 ? (
                            <span className="text-emerald-700 font-semibold">{plan[p]}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-mono font-semibold text-gray-700">{total}</td>
                      <td className="px-2 py-2">
                        {workerC && (
                          <div className={`flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono border ${constraintColor(workerC)}`}>
                            {constraintBadge(workerC)}
                            <span className="ml-1">{workerC.value.toFixed(3)}</span>
                          </div>
                        )}
                        {shift === 'shift2' && <div className="text-xs text-gray-400 text-center">见一班后</div>}
                      </td>
                      <td className="px-2 py-2">
                        {machineC && (
                          <div className={`flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono border ${constraintColor(machineC)}`}>
                            {constraintBadge(machineC)}
                            <span className="ml-1">{machineC.value.toFixed(3)}</span>
                          </div>
                        )}
                        {shift === 'shift2' && <div className="text-xs text-gray-400 text-center">见一加后</div>}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                  <td className="px-3 py-2 font-semibold text-gray-700 text-sm">合计</td>
                  {PRODUCT_KEYS.map(p => {
                    const total = (['shift1', 'ot1', 'shift2', 'ot2'] as const).reduce(
                      (s, sh) => s + (preview.p5OptimalPlan[sh][p] || 0), 0
                    );
                    return <td key={p} className="px-3 py-2 text-center font-mono font-semibold text-gray-700">{total}</td>;
                  })}
                  <td className="px-3 py-2 text-center font-mono font-bold text-emerald-700 text-base">{preview.p5PeriodTotal}</td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts: P5 constraints vs P4 hire */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1: P5 available workers & production vs P4 hire */}
          <div className="bg-white/80 rounded-xl border border-violet-100 p-4">
            <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              P5 可用人数 & 产量 随 P4 雇佣变化
            </h5>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hire" tick={{ fontSize: 11 }} label={{ value: 'P4雇佣', position: 'bottom', fontSize: 11, offset: -2 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value: number, name: string) => [value.toFixed(3), name]}
                />
                <Area yAxisId="left" type="monotone" dataKey="p5Workers" name="P5可用人数" fill="#c7d2fe" stroke="#6366f1" strokeWidth={2} fillOpacity={0.3} />
                <Line yAxisId="right" type="monotone" dataKey="p5Total" name="P5推荐产量" stroke="#059669" strokeWidth={2} dot={false} />
                <ReferenceLine x={p4Hire} yAxisId="left" stroke="#7c3aed" strokeDasharray="4 4" strokeWidth={2} />
                <ReferenceLine x={optimalHire} yAxisId="left" stroke="#10b981" strokeDasharray="2 4" strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-violet-600 inline-block" /> 当前值</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" style={{ borderTop: '1px dashed' }} /> 最优值</span>
            </div>
          </div>

          {/* Chart 2: P5 constraint residuals vs P4 hire */}
          <div className="bg-white/80 rounded-xl border border-violet-100 p-4">
            <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-500" />
              P5 约束残差 随 P4 雇佣变化
            </h5>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hire" tick={{ fontSize: 11 }} label={{ value: 'P4雇佣', position: 'bottom', fontSize: 11, offset: -2 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(value: number, name: string) => [value.toFixed(3), name]}
                />
                <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
                <Line type="monotone" dataKey="一班人" name="一班可用人数" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="一班机" name="一班可用机器" stroke="#059669" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="二班机" name="二班可用机器" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="二加人" name="二加可用人数" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                <ReferenceLine x={p4Hire} stroke="#7c3aed" strokeDasharray="4 4" strokeWidth={2} />
                <ReferenceLine x={optimalHire} stroke="#10b981" strokeDasharray="2 4" strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 inline-block" /> 一班人</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-600 inline-block" /> 一班机</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block" /> 二班机</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block" /> 二加人</span>
            </div>
          </div>
        </div>

        {/* Constraint score */}
        <div className="bg-white/80 rounded-xl border border-violet-100 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h5 className="text-sm font-semibold text-gray-800">约束综合评分</h5>
              <p className="text-xs text-gray-500 mt-0.5">所有核心约束残差绝对值之和（越低越好）</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`font-mono text-xl font-bold ${constraintScore < 5 ? 'text-emerald-600' : constraintScore < 15 ? 'text-amber-600' : 'text-red-600'}`}>
                  {constraintScore.toFixed(3)}
                </div>
                <div className="text-xs text-gray-500">当前 (P4雇佣={p4Hire})</div>
              </div>
              <div className="text-gray-300">|</div>
              <div className="text-center">
                <div className="font-mono text-xl font-bold text-emerald-600">
                  {(() => {
                    const pv = previewP4Linkage(params, optimalHire);
                    const c = pv.p5Constraints;
                    return (Math.abs(c.availWorkers_afterShift1.value) +
                      Math.abs(c.availMachines_afterShift1.value) +
                      Math.abs(c.availMachines_afterShift2.value) +
                      Math.abs(c.availWorkers_afterOT2.value)).toFixed(3);
                  })()}
                </div>
                <div className="text-xs text-gray-500">最优 (P4雇佣={optimalHire})</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
