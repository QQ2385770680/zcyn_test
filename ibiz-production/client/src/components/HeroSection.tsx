// 模块化控制台设计 - Hero区域
// 米白背景 + 翡翠绿/靛蓝/珊瑚色点缀

import { motion } from 'framer-motion';
import { Factory, Cpu, Users, BarChart3 } from 'lucide-react';

const HERO_BG = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663387422073/SbE3HkneFVVYsm7JgTXQSv/hero-bg-WjRUABE5HfUSSWXgszZMp4.webp';

interface HeroSectionProps {
  onNavigate: (tab: string) => void;
}

export default function HeroSection({ onNavigate }: HeroSectionProps) {
  const stats = [
    { label: '模拟期数', value: '9期', icon: BarChart3, color: 'text-emerald-600' },
    { label: '产品线', value: '4种', icon: Factory, color: 'text-indigo-600' },
    { label: '初始机器', value: '157台', icon: Cpu, color: 'text-orange-500' },
    { label: '初始工人', value: '113人', icon: Users, color: 'text-emerald-600' },
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

      <div className="container relative z-10 py-16 lg:py-24">
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          {/* Left content */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-emerald-700">iBizSim 企业竞争模拟</span>
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-4">
                连续排产规则
                <br />
                <span className="text-emerald-600">计算与分析</span>
              </h1>

              <p className="text-lg text-gray-600 max-w-xl mb-8 leading-relaxed">
                基于 Excel 排产规则表的完整计算引擎，覆盖 9 期连续排产的人力规划、机器产能、
                多班次分析与排班成本对比，帮助参赛团队快速制定最优生产决策。
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('periods')}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  查看排产计算
                </button>
                <button
                  onClick={() => onNavigate('rules')}
                  className="px-6 py-3 bg-white text-gray-700 rounded-lg font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  了解规则
                </button>
              </div>
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
