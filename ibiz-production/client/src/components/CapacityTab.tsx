// 模块化控制台设计 - 产能分析Tab
// 对比单班/双班产能，展示资源利用率和材料需求

import { motion } from 'framer-motion';
import { periods, products, productRatio, groupMachineNeed, groupLaborNeed } from '@/lib/data';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell,
} from 'recharts';

const DATA_PATTERN = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663387422073/SbE3HkneFVVYsm7JgTXQSv/data-pattern-DAhL7FATKxuDJ2ZRMhjvAq.webp';

export default function CapacityTab() {
  // Comparison data: single vs double shift
  const comparisonData = periods.map(p => ({
    name: `P${p.period}`,
    单班产量: p.singleShiftTotal,
    双班产量: p.doubleShiftTotal,
    增幅: p.doubleShiftTotal - p.singleShiftTotal,
  }));

  // Steady state (period 5+) product distribution
  const steadyStateSingle = periods[4].singleShiftProduction;
  const steadyStateDouble = periods[4].doubleShiftProduction;

  const pieDataSingle = Object.entries(steadyStateSingle).map(([key, val]) => ({
    name: `产品${key}`,
    value: val,
  }));
  const pieDataDouble = Object.entries(steadyStateDouble).map(([key, val]) => ({
    name: `产品${key}`,
    value: val,
  }));

  const COLORS = ['#059669', '#4F46E5', '#F97316', '#8B5CF6'];

  // Radar data for resource efficiency
  const radarData = [
    {
      metric: '机器利用率',
      单班: periods[4].singleMachineUtil,
      双班: periods[4].doubleMachineUtil,
    },
    {
      metric: '人力利用率',
      单班: periods[4].singleLaborUtil,
      双班: periods[4].doubleLaborUtil,
    },
    {
      metric: '产量效率',
      单班: (periods[4].singleShiftTotal / 1034) * 100,
      双班: (periods[4].doubleShiftTotal / 1034) * 100,
    },
    {
      metric: '人机比合理性',
      单班: Math.min(periods[4].workerMachineRatio / 2.5 * 100, 100),
      双班: Math.min(periods[4].workerMachineRatio / 2.5 * 100, 100),
    },
  ];

  // Material comparison
  const materialData = (['A', 'B', 'C', 'D'] as const).map(p => ({
    name: `产品${p}`,
    单班材料: periods[4].singleMaterials[p],
    双班材料: periods[4].doubleMaterials[p],
    单价: products[p].materials,
  }));

  // Product resource needs
  const resourceData = Object.entries(products).map(([key, p]) => ({
    name: key,
    机器时: p.machineHours,
    人力时: p.laborHours,
    比例: productRatio[key as keyof typeof productRatio],
  }));

  return (
    <div className="space-y-8">
      {/* Header banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden h-40"
      >
        <img src={DATA_PATTERN} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/60 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8 lg:px-12">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">产能分析</h2>
            <p className="text-gray-300 max-w-md text-sm">
              单班与双班模式的产能对比，资源利用效率分析，帮助选择最优排产方案
            </p>
          </div>
        </div>
      </motion.div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '单班稳态产量', value: '517', sub: '件/期', color: 'emerald' },
          { label: '双班稳态产量', value: '1,034', sub: '件/期', color: 'indigo' },
          { label: '产量提升', value: '100%', sub: '双班 vs 单班', color: 'orange' },
          { label: '稳态期', value: '第3期起', sub: '双班满产', color: 'purple' },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
          >
            <div className="text-sm text-gray-500 mb-2">{m.label}</div>
            <div className="text-2xl font-bold font-mono text-gray-900">{m.value}</div>
            <div className={`text-xs mt-1 text-${m.color}-500`}>{m.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Single vs Double shift comparison */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">单班 vs 双班产量对比</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonData}>
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
              <Bar dataKey="单班产量" fill="#059669" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="双班产量" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Radar chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">资源效率雷达图（稳态期）</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="单班" dataKey="单班" stroke="#059669" fill="#059669" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="双班" dataKey="双班" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.15} strokeWidth={2} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pie charts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-2">单班产品分布</h3>
          <p className="text-xs text-gray-500 mb-4">稳态期各产品产量占比</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieDataSingle}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieDataSingle.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-2">双班产品分布</h3>
          <p className="text-xs text-gray-500 mb-4">稳态期各产品产量占比</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieDataDouble}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieDataDouble.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Resource per product */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-2">单位产品资源需求</h3>
          <p className="text-xs text-gray-500 mb-4">各产品的机器时与人力时</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={resourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={30} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              />
              <Legend />
              <Bar dataKey="机器时" fill="#059669" radius={[0, 4, 4, 0]} barSize={14} />
              <Bar dataKey="人力时" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Material needs table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">原材料需求对比（稳态期）</h3>
          <p className="text-xs text-gray-500 mt-1">
            一组产品需要: 机器 {groupMachineNeed} 台, 人力 {groupLaborNeed} 人
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-6 py-3 text-left font-medium text-gray-500">产品</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">单价</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">单班产量</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">单班材料</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">双班产量</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">双班材料</th>
                <th className="px-6 py-3 text-right font-medium text-gray-500">增幅</th>
              </tr>
            </thead>
            <tbody>
              {(['A', 'B', 'C', 'D'] as const).map(p => {
                const sp = periods[4].singleShiftProduction[p];
                const dp = periods[4].doubleShiftProduction[p];
                const sm = periods[4].singleMaterials[p];
                const dm = periods[4].doubleMaterials[p];
                return (
                  <tr key={p} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-sm">
                        {p}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-mono">{products[p].materials.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right font-mono">{sp}</td>
                    <td className="px-6 py-3 text-right font-mono text-emerald-600">{sm.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right font-mono">{dp}</td>
                    <td className="px-6 py-3 text-right font-mono text-indigo-600">{dm.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right font-mono text-orange-500">
                      +{((dm - sm) / sm * 100).toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50/50 font-semibold">
                <td className="px-6 py-3">合计</td>
                <td className="px-6 py-3 text-right">-</td>
                <td className="px-6 py-3 text-right font-mono">{periods[4].singleShiftTotal}</td>
                <td className="px-6 py-3 text-right font-mono text-emerald-600">{periods[4].singleMaterialsTotal.toLocaleString()}</td>
                <td className="px-6 py-3 text-right font-mono">{periods[4].doubleShiftTotal}</td>
                <td className="px-6 py-3 text-right font-mono text-indigo-600">{periods[4].doubleMaterialsTotal.toLocaleString()}</td>
                <td className="px-6 py-3 text-right font-mono text-orange-500">
                  +{((periods[4].doubleMaterialsTotal - periods[4].singleMaterialsTotal) / periods[4].singleMaterialsTotal * 100).toFixed(0)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
