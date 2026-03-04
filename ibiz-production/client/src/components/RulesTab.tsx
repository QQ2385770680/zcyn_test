// 模块化控制台设计 - 规则说明Tab
// 展示产品参数、公式、雇佣策略等基础规则

import { motion } from 'framer-motion';
import { products, productRatio, formulas, hireStrategy, notes, WORK_HOURS, groupMachineNeed, groupLaborNeed } from '@/lib/data';
import { BookOpen, Calculator, Users, AlertTriangle } from 'lucide-react';

const FACTORY_IMG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663387422073/SbE3HkneFVVYsm7JgTXQSv/factory-illustration-fDJiv2gUdG7otg2UmBHMbv.webp';

export default function RulesTab() {
  return (
    <div className="space-y-8">
      {/* Factory illustration banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden h-48 lg:h-56"
      >
        <img src={FACTORY_IMG} alt="智能工厂" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/70 via-emerald-800/50 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8 lg:px-12">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">排产规则说明</h2>
            <p className="text-emerald-100 max-w-md">
              了解 iBizSim 连续排产模式下的产品参数、资源约束与核心计算公式
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Product parameters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">产品参数</h3>
              <p className="text-xs text-gray-500">每期工作小时: {WORK_HOURS}h</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full data-table text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">产品</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">机器时</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">人力时</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">原材料</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">机器/单位</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">人力/单位</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(products).map(([key, p]) => (
                  <tr key={key} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-sm">
                        {key}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{p.machineHours}</td>
                    <td className="px-4 py-3 text-right font-mono">{p.laborHours}</td>
                    <td className="px-4 py-3 text-right font-mono">{p.materials.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">{p.machinePerUnit.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right font-mono text-indigo-600">{p.laborPerUnit.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">产品结构比例</span>
              <span className="font-mono font-medium text-gray-700">
                A:{productRatio.A} B:{productRatio.B} C:{productRatio.C} D:{productRatio.D}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-500">一组产品需求</span>
              <span className="font-mono text-gray-700">
                机器 {groupMachineNeed}台 / 人力 {groupLaborNeed}人
              </span>
            </div>
          </div>
        </motion.div>

        {/* Formulas */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Calculator className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900">核心计算公式</h3>
          </div>
          <div className="p-6 space-y-4">
            {Object.entries(formulas).map(([key, formula]) => (
              <div key={key} className="group">
                <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100 font-mono text-sm text-gray-700 group-hover:border-emerald-200 group-hover:bg-emerald-50/30 transition-colors">
                  {formula}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Hire strategy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-orange-500" />
            </div>
            <h3 className="font-semibold text-gray-900">雇佣策略</h3>
          </div>
          <div className="p-6 space-y-3">
            {Object.entries(hireStrategy).map(([period, strategy]) => (
              <div key={period} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="shrink-0 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium">
                  {period}
                </span>
                <span className="text-gray-700 text-sm leading-relaxed pt-0.5">{strategy}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Important notes */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <h3 className="font-semibold text-gray-900">重要规则说明</h3>
          </div>
          <div className="p-6 space-y-3">
            {notes.map((note, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="text-gray-700 leading-relaxed">{note}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
