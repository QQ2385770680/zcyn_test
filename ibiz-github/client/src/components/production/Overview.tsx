/**
 * ProductionOverview — 生产总览（卡片式布局）
 *
 * 8 期排产数据以卡片网格展示（每排 2 个），每张卡片包含：
 * - 左侧：班次产量表（第一班/一加/第二班/二加 × A/B/C/D + 可用人数/可用机器）
 * - 右侧：本期关键参数（机器数、购买、期初人数、最少解雇、本期解雇、最大雇佣、本期雇佣）
 */
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

import { type PeriodResult, allConstraintsSatisfied } from "@/lib/data";
import { useConfig } from "@/lib/ConfigContext";
import { calcAllPeriods } from "@/lib/engine";

// ============================================================
// 辅助：从 Simulator 缓存中读取当前排产数据
// ============================================================

function loadSimCache() {
  try {
    const raw = localStorage.getItem("ibiz-sim-cache");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ============================================================
// 约束值颜色
// ============================================================

function constraintColor(val: number): string {
  if (val < -0.001) return "text-red-600 font-semibold";
  if (val < 1) return "text-amber-600";
  return "text-emerald-700";
}

// ============================================================
// 单期卡片组件
// ============================================================

interface PeriodCardProps {
  result: PeriodResult;
  periodIndex: number;
}

const PERIOD_LABELS = ["一", "二", "三", "四", "五", "六", "七", "八"];

function PeriodCard({ result, periodIndex }: PeriodCardProps) {
  const r = result;
  const prod = r.production;
  const res = r.resources;
  const con = r.constraints;
  const passed = allConstraintsSatisfied(con);

  const totalA = prod.shift1.A + prod.ot1.A + prod.shift2.A + prod.ot2.A;
  const totalB = prod.shift1.B + prod.ot1.B + prod.shift2.B + prod.ot2.B;
  const totalC = prod.shift1.C + prod.ot1.C + prod.shift2.C + prod.ot2.C;
  const totalD = prod.shift1.D + prod.ot1.D + prod.shift2.D + prod.ot2.D;
  const totalAll = totalA + totalB + totalC + totalD;

  // 格式化约束值
  const fmt = (v: number) => {
    if (v === 0) return "0";
    return Number.isInteger(v) ? v.toString() : v.toFixed(3);
  };

  return (
    <Card className={`overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-200 ${
      !passed ? "border-red-300 bg-red-50/30" : "border-gray-200/80"
    }`}>
      {/* 卡片标题栏 */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${
        passed ? "bg-gradient-to-r from-blue-50 to-blue-100/50" : "bg-gradient-to-r from-red-50 to-red-100/50"
      }`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold text-white ${
            passed ? "bg-blue-600" : "bg-red-500"
          }`}>
            P{r.period}
          </span>
          <span className="text-sm font-bold text-foreground">第{PERIOD_LABELS[periodIndex]}期</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            产量: <span className="font-bold text-foreground tabular-nums">{totalAll}</span>
          </span>
          {passed ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 gap-0.5">
              <ShieldCheck className="size-2.5" />通过
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] px-1.5 py-0 gap-0.5">
              <ShieldAlert className="size-2.5" />超限
            </Badge>
          )}
        </div>
      </div>

      {/* 卡片内容：左侧表格 + 右侧参数 */}
      <div className="flex">
        {/* 左侧：班次产量表 */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="text-left py-1.5 px-2 font-semibold text-blue-800 whitespace-nowrap w-[60px]">班次</th>
                <th className="text-center py-1.5 px-1.5 font-semibold text-blue-700 whitespace-nowrap">第一班</th>
                <th className="text-center py-1.5 px-1.5 font-semibold text-blue-700 whitespace-nowrap">一加</th>
                <th className="text-center py-1.5 px-1.5 font-semibold text-blue-700 whitespace-nowrap">第二班</th>
                <th className="text-center py-1.5 px-1.5 font-semibold text-blue-700 whitespace-nowrap">二加</th>
              </tr>
            </thead>
            <tbody>
              {/* A产量 */}
              <tr className="border-b border-gray-100">
                <td className="py-1 px-2 font-medium text-foreground">A产量</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.shift1.A || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.ot1.A || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.shift2.A || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.ot2.A || 0}</td>
              </tr>
              {/* B产量 */}
              <tr className="border-b border-gray-100">
                <td className="py-1 px-2 font-medium text-foreground">B产量</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.shift1.B || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.ot1.B || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.shift2.B || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.ot2.B || 0}</td>
              </tr>
              {/* C产量 */}
              <tr className="border-b border-gray-100">
                <td className="py-1 px-2 font-medium text-foreground">C产量</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.shift1.C || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.ot1.C || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.shift2.C || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.ot2.C || 0}</td>
              </tr>
              {/* D产量 */}
              <tr className="border-b border-gray-100">
                <td className="py-1 px-2 font-medium text-foreground">D产量</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.shift1.D || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.ot1.D || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.shift2.D || 0}</td>
                <td className="text-center py-1 px-1.5 tabular-nums">{prod.ot2.D || 0}</td>
              </tr>
              {/* 可用人数 */}
              <tr className="border-b border-gray-100 bg-amber-50/40">
                <td className="py-1 px-2 font-medium text-amber-800">可用人数</td>
                <td className={`text-center py-1 px-1.5 tabular-nums ${constraintColor(con.c1_workersAfterShift1)}`}>
                  {fmt(con.c1_workersAfterShift1)}
                </td>
                <td className={`text-center py-1 px-1.5 tabular-nums ${constraintColor(con.c2_workersAfterOt1)}`}>
                  {fmt(con.c2_workersAfterOt1)}
                </td>
                <td className="text-center py-1 px-1.5 tabular-nums text-muted-foreground">—</td>
                <td className={`text-center py-1 px-1.5 tabular-nums ${constraintColor(con.c4_workersAfterOt2)}`}>
                  {fmt(con.c4_workersAfterOt2)}
                </td>
              </tr>
              {/* 可用机器 */}
              <tr className="bg-blue-50/40">
                <td className="py-1 px-2 font-medium text-blue-800">可用机器</td>
                <td className={`text-center py-1 px-1.5 tabular-nums ${constraintColor(con.c5_machinesAfterShift1)}`}>
                  {fmt(con.c5_machinesAfterShift1)}
                </td>
                <td className="text-center py-1 px-1.5 tabular-nums text-muted-foreground">—</td>
                <td className={`text-center py-1 px-1.5 tabular-nums ${constraintColor(con.c7_machinesAfterShift2)}`}>
                  {fmt(con.c7_machinesAfterShift2)}
                </td>
                <td className={`text-center py-1 px-1.5 tabular-nums ${constraintColor(con.c8_machinesAfterOt2)}`}>
                  {fmt(con.c8_machinesAfterOt2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 右侧分隔线 */}
        <div className="w-px bg-gray-200 shrink-0" />

        {/* 右侧：关键参数 */}
        <div className="w-[140px] shrink-0">
          <table className="w-full text-xs border-collapse">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1 px-2 text-muted-foreground whitespace-nowrap">本期机器</td>
                <td className="py-1 px-2 text-right tabular-nums font-bold text-blue-700">{res.machines}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 px-2 text-muted-foreground whitespace-nowrap">本期购买</td>
                <td className="py-1 px-2 text-right tabular-nums font-medium">
                  {res.machinesPurchased > 0 ? (
                    <span className="text-blue-600">+{res.machinesPurchased}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 px-2 text-muted-foreground whitespace-nowrap">期初人数</td>
                <td className="py-1 px-2 text-right tabular-nums font-bold text-amber-700">{res.initialWorkers}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 px-2 text-muted-foreground whitespace-nowrap">最少解雇</td>
                <td className="py-1 px-2 text-right tabular-nums text-red-500">{res.minFire}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 px-2 text-muted-foreground whitespace-nowrap">本期解雇</td>
                <td className="py-1 px-2 text-right tabular-nums font-medium text-red-600">{res.fired}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1 px-2 text-muted-foreground whitespace-nowrap">最大雇佣</td>
                <td className="py-1 px-2 text-right tabular-nums text-emerald-500">{res.maxHire}</td>
              </tr>
              <tr>
                <td className="py-1 px-2 text-muted-foreground whitespace-nowrap">本期雇佣</td>
                <td className="py-1 px-2 text-right tabular-nums font-medium text-emerald-600">{res.hired}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

// ============================================================
// 主组件
// ============================================================

export function ProductionOverview() {
  const { config } = useConfig();

  // 从 Simulator 缓存中读取排产数据
  const cachedSim = React.useMemo(() => loadSimCache(), []);

  const { productions, decisions } = React.useMemo(() => {
    if (cachedSim?.productions && cachedSim?.decisions) {
      return { productions: cachedSim.productions, decisions: cachedSim.decisions };
    }
    const emptyProd = Array.from({ length: config.periods }, () => ({
      shift1: { A: 0, B: 0, C: 0, D: 0 },
      ot1: { A: 0, B: 0, C: 0, D: 0 },
      shift2: { A: 0, B: 0, C: 0, D: 0 },
      ot2: { A: 0, B: 0, C: 0, D: 0 },
    }));
    const emptyDec = Array.from({ length: config.periods }, () => ({
      machinesPurchased: 0,
      fired: 0,
      hired: 0,
    }));
    return { productions: emptyProd, decisions: emptyDec };
  }, [cachedSim, config.periods]);

  const effectiveConfig = React.useMemo(() => {
    if (cachedSim?.initialMachines !== undefined && cachedSim?.initialWorkers !== undefined) {
      return {
        ...config,
        initialMachines: cachedSim.initialMachines,
        initialWorkers: cachedSim.initialWorkers,
      };
    }
    return config;
  }, [config, cachedSim]);

  // 计算所有期数结果
  const results: PeriodResult[] = React.useMemo(
    () => calcAllPeriods(effectiveConfig, productions, decisions),
    [effectiveConfig, productions, decisions]
  );

  // 判断是否有数据
  const hasData = results.some(
    (r) => r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D > 0
  );

  // 汇总统计
  const totalProduction = results.reduce(
    (sum, r) => sum + r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D,
    0
  );
  const allPassed = results.every((r) => allConstraintsSatisfied(r.constraints));
  const failedCount = results.filter((r) => !allConstraintsSatisfied(r.constraints)).length;

  // ============================================================
  // 空状态
  // ============================================================

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 mb-4">
          <BarChart3 className="size-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">暂无排产数据</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          请先在「生产模拟」中配置初始参数并填写排产数据，或加载一个方案设计，数据将自动同步到此处。
        </p>
      </div>
    );
  }

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="space-y-4">
      {/* 顶部汇总条 */}
      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-100/50 border border-gray-200/80">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">8期总产量</span>
            <span className="text-xl font-bold text-foreground tabular-nums">{totalProduction.toLocaleString()}</span>
          </div>
          <div className="w-px h-6 bg-gray-300" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">约束状态</span>
            {allPassed ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
                <ShieldCheck className="size-3" />
                8期全部通过
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs gap-1">
                <ShieldAlert className="size-3" />
                {failedCount}期存在超限
              </Badge>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          初始机器 <span className="font-semibold text-foreground">{effectiveConfig.initialMachines}</span> 台 · 
          初始人数 <span className="font-semibold text-foreground">{effectiveConfig.initialWorkers}</span> 人
        </div>
      </div>

      {/* 8期卡片网格：每排2个 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {results.map((result, idx) => (
          <PeriodCard key={result.period} result={result} periodIndex={idx} />
        ))}
      </div>
    </div>
  );
}
