// 无双·iBizSim智能决策引擎 - 主页
// 方案一：轻量化重构 — 仅保留参数模拟器

import { motion } from 'framer-motion';
import HeroSection from '@/components/HeroSection';
import SimulatorTab from '@/components/SimulatorTab';
import { ArrowUp } from 'lucide-react';

export default function Home() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <HeroSection />

      {/* Main Content — 参数模拟器 */}
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <SimulatorTab />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/50">
        <div className="container py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              无双·iBizSim智能决策引擎 — 智能参数模拟与最优方案求解
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>产品结构 A:B:C:D = 9:6:4:3</span>
              <span className="text-gray-300">|</span>
              <span>每期 520 工时</span>
              <span className="text-gray-300">|</span>
              <span>9 期模拟</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:border-emerald-200 transition-colors z-40"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </div>
  );
}
