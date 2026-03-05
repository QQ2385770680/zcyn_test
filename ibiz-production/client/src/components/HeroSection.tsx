// 无双·iBizSim智能决策引擎 - Hero区域
// 简洁品牌标题 + 核心数据卡片

import { motion } from 'framer-motion';
import { Factory, Cpu, Users, BarChart3, Zap } from 'lucide-react';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663387422073/SbE3HkneFVVYsm7JgTXQSv/hero-bg-WjRUABE5HfUSSWXgszZMp4.webp';

interface HeroSectionProps {
  initialMachines?: number;
  initialWorkers?: number;
  totalPeriods?: number;
}

export default function HeroSection({
  initialMachines = 157,
  initialWorkers = 113,
  totalPeriods = 8,
}: HeroSectionProps) {
  const stats = [
    { label: '模拟期数', value: `${totalPeriods}期`, icon: BarChart3, color: 'text-emerald-600' },
    { label: '产品线', value: '4种', icon: Factory, color: 'text-indigo-600' },
    { label: '初始机器', value: `${initialMachines}台`, icon: Cpu, color: 'text-orange-500' },
    { label: '初始工人', value: `${initialWorkers}人`, icon: Users, color: 'text-emerald-600' },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={HERO_BG}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/92 via-white/85 to-white/78" />
      </div>

      <div className="container relative z-10 py-12 lg:py-16">
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Left content */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-6">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">iBizSim 企业竞争模拟</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-4">
                无双
                <span className="text-gray-400 mx-1">·</span>
                <span className="text-emerald-600">智能决策引擎</span>
                <span className="text-lg lg:text-xl font-medium text-amber-500 ml-2 align-middle">「测试版」</span>
              </h1>

              <p className="text-lg text-gray-600 max-w-xl mb-4 leading-relaxed">
                覆盖 {totalPeriods} 期连续排产的智能参数模拟与最优方案求解，
                支持多班次产能分析、约束验证与一键优化，助力参赛团队快速制定最优生产决策。
              </p>
            </motion.div>
          </div>

          {/* Right stats cards */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <stat.icon className={`w-6 h-6 ${stat.color} mb-3`} />
                  <div className="text-2xl font-bold text-gray-900 font-mono">{stat.value}</div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
