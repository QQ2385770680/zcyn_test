// 模块化控制台设计 - 排班成本对比Tab
// 展示两种排班方案的产量、成本和资源消耗对比

import { useState } from 'react';
import { motion } from 'framer-motion';
import { costPlans } from '@/lib/data';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { Scale, TrendingUp, DollarSign, Package } from 'lucide-react';

export default function CostTab() {
  const [selectedPlan, setSelectedPlan] = useState(0);

  const plan = costPlans[selectedPlan];

  // Stacked bar: production by shift
  const shiftData = (['A', 'B', 'C', 'D'] as const).map(p => ({
    name: `产品${p}`,
    一正: plan.production[p].shift1,
    一加: plan.production[p].ot1,
    二正: plan.production[p].shift2,
    二加: plan.production[p].ot2,
    总计: plan.totals[p],
  }));

  // Unit cost comparison
  const costCompData = (['A', 'B', 'C', 'D'] as const).map(p => ({
    name: `产品${p}`,
    方案一: costPlans[0].unitCost[p],
    方案二: costPlans[1].unitCost[p],
    差额: costPlans[1].unitCost[p] - costPlans[0].unitCost[p],
  }));

  // Total production comparison
  const totalCompData = [
    { name: '方案一', value: costPlans[0].totalProduction, fill: '#059669' },
    { name: '方案二', value: costPlans[1].totalProduction, fill: '#4F46E5' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">排班成本对比</h2>
        <p className="text-sm text-gray-500 mt-1">两种排班方案的产量分配、单位成本与总成本对比分析</p>
      </div>

      {/* Plan selector */}
      <div className="grid sm:grid-cols-2 gap-4">
        {costPlans.map((cp, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => setSelectedPlan(i)}
            className={`text-left p-6 rounded-xl border-2 transition-all ${
              selectedPlan === i
                ? 'border-emerald-500 bg-emerald-50/50 shadow-md'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{cp.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{cp.description}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedPlan === i ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
              }`}>
                {selectedPlan === i && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs text-gray-500">总产量</div>
                <div className="text-lg font-bold font-mono">{cp.totalProduction.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">总成本</div>
                <div className="text-lg font-bold font-mono">{(cp.totalCost / 10000).toFixed(1)}万</div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Comparison summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <Package className="w-5 h-5 text-emerald-500 mb-2" />
          <div className="text-xs text-gray-500">产量差异</div>
          <div className="text-xl font-bold font-mono mt-1">
            {costPlans[1].totalProduction - costPlans[0].totalProduction > 0 ? '+' : ''}
            {costPlans[1].totalProduction - costPlans[0].totalProduction}
          </div>
          <div className="text-xs text-gray-400 mt-1">方案二 vs 方案一</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <DollarSign className="w-5 h-5 text-indigo-500 mb-2" />
          <div className="text-xs text-gray-500">成本差异</div>
          <div className="text-xl font-bold font-mono mt-1">
            +{((costPlans[1].totalCost - costPlans[0].totalCost) / 10000).toFixed(1)}万
          </div>
          <div className="text-xs text-gray-400 mt-1">方案二更高</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <TrendingUp className="w-5 h-5 text-orange-500 mb-2" />
          <div className="text-xs text-gray-500">单位成本(A)</div>
          <div className="text-xl font-bold font-mono mt-1">
            {costPlans[selectedPlan].unitCost.A.toFixed(0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">当前方案</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
        >
          <Scale className="w-5 h-5 text-purple-500 mb-2" />
          <div className="text-xs text-gray-500">每单位成本</div>
          <div className="text-xl font-bold font-mono mt-1">
            {(costPlans[selectedPlan].totalCost / costPlans[selectedPlan].totalProduction).toFixed(0)}
          </div>
          <div className="text-xs text-gray-400 mt-1">平均单位成本</div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shift distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-1">{plan.name} - 班次产量分配</h3>
          <p className="text-xs text-gray-500 mb-4">各产品在不同班次的产量分布</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={shiftData}>
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
              <Bar dataKey="一正" stackId="shift" fill="#059669" />
              <Bar dataKey="一加" stackId="shift" fill="#34D399" />
              <Bar dataKey="二正" stackId="shift" fill="#4F46E5" />
              <Bar dataKey="二加" stackId="shift" fill="#818CF8" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Unit cost comparison */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-1">单位成本对比</h3>
          <p className="text-xs text-gray-500 mb-4">两种方案各产品的单位生产成本</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costCompData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Legend />
              <Bar dataKey="方案一" fill="#059669" radius={[4, 4, 0, 0]} barSize={28} />
              <Bar dataKey="方案二" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Detailed table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{plan.name} - 详细数据</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-4 py-3 text-left font-medium text-gray-500">产品</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">一正</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">一加</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">二正</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">二加</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">总产量</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">单位成本</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">小计成本</th>
              </tr>
            </thead>
            <tbody>
              {(['A', 'B', 'C', 'D'] as const).map(p => {
                const prod = plan.production[p];
                const subtotal = plan.unitCost[p] * plan.totals[p];
                return (
                  <tr key={p} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-sm">
                        {p}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{prod.shift1}</td>
                    <td className="px-4 py-3 text-right font-mono">{prod.ot1}</td>
                    <td className="px-4 py-3 text-right font-mono">{prod.shift2}</td>
                    <td className="px-4 py-3 text-right font-mono">{prod.ot2}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{plan.totals[p]}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">{plan.unitCost[p].toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-indigo-600">{subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50/50 font-semibold">
                <td className="px-4 py-3">合计</td>
                <td className="px-4 py-3 text-right font-mono">
                  {(['A','B','C','D'] as const).reduce((s, p) => s + plan.production[p].shift1, 0)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {(['A','B','C','D'] as const).reduce((s, p) => s + plan.production[p].ot1, 0)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {(['A','B','C','D'] as const).reduce((s, p) => s + plan.production[p].shift2, 0)}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {(['A','B','C','D'] as const).reduce((s, p) => s + plan.production[p].ot2, 0)}
                </td>
                <td className="px-4 py-3 text-right font-mono">{plan.totalProduction}</td>
                <td className="px-4 py-3 text-right font-mono">-</td>
                <td className="px-4 py-3 text-right font-mono text-indigo-600">{plan.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>

      {/* Analysis insight */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="bg-gradient-to-br from-emerald-50 to-indigo-50 rounded-xl border border-emerald-100 p-6"
      >
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Scale className="w-5 h-5 text-emerald-600" />
          方案对比分析
        </h3>
        <div className="grid sm:grid-cols-2 gap-6 text-sm text-gray-700 leading-relaxed">
          <div>
            <h4 className="font-medium text-emerald-700 mb-2">方案一（均衡排班）优势</h4>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                总成本更低（约480.6万 vs 496.1万）
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                产品C、D单位成本更低
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                各产品产量均衡，适合稳定市场需求
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">方案二（集中排班）优势</h4>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                总产量更高（1450 vs 1055）
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                产品A、B单位成本更低
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                A产品产量大幅领先，适合A产品需求旺盛的市场
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
