// iBizSim 连续排产规则计算器 - 主页
// 设计风格: 模块化控制台 (Bauhaus Functionalism + Modern SaaS Dashboard)
// 米白暖色背景(#F8F6F3) + 深色卡片对比
// 翡翠绿(#059669) / 靛蓝(#4F46E5) / 珊瑚色(#F97316)

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSection from '@/components/HeroSection';
import RulesTab from '@/components/RulesTab';
import PeriodsTab from '@/components/PeriodsTab';
import CapacityTab from '@/components/CapacityTab';
import CostTab from '@/components/CostTab';
import SimulatorTab from '@/components/SimulatorTab';
import { BookOpen, Calculator, BarChart3, Scale, Sliders, ArrowUp } from 'lucide-react';

const tabs = [
  { id: 'rules', label: '规则说明', icon: BookOpen },
  { id: 'periods', label: '期数计算', icon: Calculator },
  { id: 'capacity', label: '产能分析', icon: BarChart3 },
  { id: 'cost', label: '成本对比', icon: Scale },
  { id: 'simulator', label: '参数模拟器', icon: Sliders },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('rules');
  const contentRef = useRef<HTMLDivElement>(null);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <HeroSection onNavigate={handleNavigate} />

      {/* Tab Navigation */}
      <div ref={contentRef} className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-gray-100">
        <div className="container">
          <nav className="flex gap-1 overflow-x-auto py-2 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? tab.id === 'simulator'
                      ? 'bg-amber-50 text-amber-700 shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.id === 'simulator' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">NEW</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <main className="container py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'rules' && <RulesTab />}
            {activeTab === 'periods' && <PeriodsTab />}
            {activeTab === 'capacity' && <CapacityTab />}
            {activeTab === 'cost' && <CostTab />}
            {activeTab === 'simulator' && <SimulatorTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/50">
        <div className="container py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              iBizSim 连续排产规则计算器 — 基于 Excel 排产规则表的完整计算引擎
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
