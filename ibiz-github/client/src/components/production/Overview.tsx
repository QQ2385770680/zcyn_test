/**
 * ProductionOverview — 生产总览
 *
 * 按照用户提供的表格布局：
 * 左侧：班次产量表（第一班/一加/第二班/二加 × ABCD + 可用人数 + 可用机器）
 * 右侧：本期关键参数列（本期机器、本期购买、期初人数、最少解雇、本期解雇、最大雇佣、本期雇佣）
 * 支持 2列 / 4列 切换
 * 可用人数/可用机器颜色与 Simulator 中约束颜色完全同步
 */
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  LayoutGrid,
  Rows3,
  Package,
  TrendingUp,
  Factory,
  Users,
} from "lucide-react";

import {
  type PeriodResult,
  type PeriodProduction,
  type PeriodDecision,
  allConstraintsSatisfied,
} from "@/lib/data";
import { useConfig } from "@/lib/ConfigContext";
import { calcAllPeriods, getConstraintStatus } from "@/lib/engine";

// ============================================================
// 从 Simulator 缓存中读取排产数据
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
// 约束颜色函数（与 Simulator 完全同步）
// ============================================================

function constraintColor(value: number): string {
  if (value < -0.001) return "text-red-600 font-semibold"; // 超限
  if (value <= 5) return "text-emerald-600"; // 达标
  return "text-amber-600"; // 偏大
}

function constraintBgCell(value: number): string {
  if (value < -0.001) return "bg-red-50";
  if (value <= 5) return "";
  return "bg-amber-50";
}

// ============================================================
// 期数中文标签
// ============================================================

const PERIOD_CN = ["一", "二", "三", "四", "五", "六", "七", "八"];

// ============================================================
// 单期卡片组件（核心：按图片布局）
// ============================================================

interface PeriodTableCardProps {
  result: PeriodResult;
  periodIndex: number;
}

function PeriodTableCard({ result, periodIndex }: PeriodTableCardProps) {
  const r = result;
  const prod = r.production;
  const res = r.resources;
  const con = r.constraints;
  const passed = allConstraintsSatisfied(con);

  const fmt = (v: number) => {
    if (v === 0) return "0";
    return Number.isInteger(v) ? v.toString() : v.toFixed(3);
  };

  // 右侧参数列数据
  const rightParams = [
    { label: "本期机器", value: res.machines, highlight: "blue" as const },
    { label: "本期购买", value: res.machinesPurchased, highlight: null },
    { label: "期初人数", value: res.initialWorkers, highlight: "amber" as const },
    { label: "最少解雇", value: res.minFire, highlight: null },
    { label: "本期解雇", value: res.fired, highlight: null },
    { label: "最大雇佣", value: res.maxHire, highlight: null },
    { label: "本期雇佣", value: res.hired, highlight: null },
  ];

  // 可用人数约束值（对应4个班次列）
  const workerConstraints = [
    { val: con.c1_workersAfterShift1, show: true },
    { val: con.c2_workersAfterOt1, show: true },
    { val: null as number | null, show: false }, // 第二班无人数约束
    { val: con.c4_workersAfterOt2, show: true },
  ];

  // 可用机器约束值（对应4个班次列）
  const machineConstraints = [
    { val: con.c5_machinesAfterShift1, show: true },
    { val: null as number | null, show: false }, // 一加无机器约束
    { val: con.c7_machinesAfterShift2, show: true },
    { val: con.c8_machinesAfterOt2, show: true },
  ];

  return (
    <div className={`rounded-lg border overflow-hidden transition-shadow hover:shadow-md ${
      !passed ? "border-red-300 shadow-red-100/50" : "border-gray-200 shadow-sm"
    }`}>
      {/* 标题栏 */}
      <div className={`text-center py-1.5 font-bold text-sm border-b ${
        passed
          ? "bg-gradient-to-r from-slate-50 to-blue-50/50 text-foreground border-gray-200"
          : "bg-gradient-to-r from-red-50 to-orange-50/50 text-red-700 border-red-200"
      }`}>
        <span className="flex items-center justify-center gap-1.5">
          第{PERIOD_CN[periodIndex]}期
          {passed ? (
            <ShieldCheck className="size-3.5 text-emerald-500" />
          ) : (
            <ShieldAlert className="size-3.5 text-red-500" />
          )}
        </span>
      </div>

      {/* 主体表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          {/* 表头 */}
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="py-1.5 px-2 text-left font-semibold text-gray-600 whitespace-nowrap w-[60px]">班次</th>
              <th className="py-1.5 px-1.5 text-center font-semibold text-gray-600 whitespace-nowrap">第一班</th>
              <th className="py-1.5 px-1.5 text-center font-semibold text-gray-600 whitespace-nowrap">一加</th>
              <th className="py-1.5 px-1.5 text-center font-semibold text-gray-600 whitespace-nowrap">第二班</th>
              <th className="py-1.5 px-1.5 text-center font-semibold text-gray-600 whitespace-nowrap">二加</th>
              <th className="py-1.5 px-2 text-right font-semibold text-blue-700 whitespace-nowrap border-l border-gray-200 w-[70px]" colSpan={2}>
                {/* 右侧参数表头留空 */}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* ABCD 产量行 */}
            {(["A", "B", "C", "D"] as const).map((p, pIdx) => (
              <tr key={p} className={`border-b border-gray-100 ${pIdx % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                <td className="py-1 px-2 font-medium text-gray-700 whitespace-nowrap">{p}产量</td>
                <td className="py-1 px-1.5 text-center tabular-nums">{prod.shift1[p]}</td>
                <td className="py-1 px-1.5 text-center tabular-nums">{prod.ot1[p]}</td>
                <td className="py-1 px-1.5 text-center tabular-nums">{prod.shift2[p]}</td>
                <td className="py-1 px-1.5 text-center tabular-nums">{prod.ot2[p]}</td>
                {/* 右侧参数 */}
                <td className="py-1 px-2 text-right text-gray-600 whitespace-nowrap border-l border-gray-200 text-[10px]">
                  {rightParams[pIdx]?.label}
                </td>
                <td className={`py-1 px-2 text-right tabular-nums font-bold whitespace-nowrap min-w-[40px] ${
                  rightParams[pIdx]?.highlight === "blue"
                    ? "text-blue-700 bg-blue-50/60"
                    : rightParams[pIdx]?.highlight === "amber"
                    ? "text-amber-700 bg-amber-50/60"
                    : "text-foreground"
                }`}>
                  {rightParams[pIdx]?.value ?? ""}
                </td>
              </tr>
            ))}

            {/* 可用人数行 */}
            <tr className="border-t border-dashed border-blue-200 bg-blue-50/20">
              <td className="py-1.5 px-2 font-medium text-blue-700 whitespace-nowrap text-[11px]">可用人数</td>
              {workerConstraints.map((item, i) => (
                <td
                  key={i}
                  className={`py-1.5 px-1.5 text-center tabular-nums font-mono text-[11px] ${
                    item.show && item.val !== null ? constraintColor(item.val) : ""
                  } ${item.show && item.val !== null ? constraintBgCell(item.val) : ""}`}
                >
                  {item.show && item.val !== null ? fmt(item.val) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              ))}
              {/* 右侧参数：最少解雇 */}
              <td className="py-1.5 px-2 text-right text-gray-600 whitespace-nowrap border-l border-gray-200 text-[10px]">
                {rightParams[4]?.label}
              </td>
              <td className="py-1.5 px-2 text-right tabular-nums font-bold whitespace-nowrap">
                {rightParams[4]?.value}
              </td>
            </tr>

            {/* 可用机器行 */}
            <tr className="border-t border-dashed border-blue-200 bg-blue-50/20">
              <td className="py-1.5 px-2 font-medium text-blue-700 whitespace-nowrap text-[11px]">可用机器</td>
              {machineConstraints.map((item, i) => (
                <td
                  key={i}
                  className={`py-1.5 px-1.5 text-center tabular-nums font-mono text-[11px] ${
                    item.show && item.val !== null ? constraintColor(item.val) : ""
                  } ${item.show && item.val !== null ? constraintBgCell(item.val) : ""}`}
                >
                  {item.show && item.val !== null ? fmt(item.val) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              ))}
              {/* 右侧参数：最大雇佣 */}
              <td className="py-1.5 px-2 text-right text-gray-600 whitespace-nowrap border-l border-gray-200 text-[10px]">
                {rightParams[5]?.label}
              </td>
              <td className={`py-1.5 px-2 text-right tabular-nums font-bold whitespace-nowrap`}>
                {rightParams[5]?.value}
              </td>
            </tr>

            {/* 额外一行：本期雇佣（右侧最后一个参数） */}
            <tr className="border-t border-gray-100">
              <td colSpan={5} className="py-1 px-2">
                {/* 左侧留空或放总产量 */}
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-muted-foreground">总产量:</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D}
                  </span>
                  <span className="text-muted-foreground ml-1">A:{r.totalOutput.A}</span>
                  <span className="text-muted-foreground">B:{r.totalOutput.B}</span>
                  <span className="text-muted-foreground">C:{r.totalOutput.C}</span>
                  <span className="text-muted-foreground">D:{r.totalOutput.D}</span>
                </div>
              </td>
              <td className="py-1 px-2 text-right text-gray-600 whitespace-nowrap border-l border-gray-200 text-[10px]">
                {rightParams[6]?.label}
              </td>
              <td className="py-1 px-2 text-right tabular-nums font-bold whitespace-nowrap">
                {rightParams[6]?.value}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// 统计卡片组件
// ============================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

function StatCard({ icon, label, value, sub, accent = "text-foreground" }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-gray-100 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className={`text-lg font-bold tabular-nums leading-tight ${accent}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export function ProductionOverview() {
  const { config } = useConfig();
  const [layout, setLayout] = React.useState<2 | 4>(2);

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
  const totalA = results.reduce((s, r) => s + r.totalOutput.A, 0);
  const totalB = results.reduce((s, r) => s + r.totalOutput.B, 0);
  const totalC = results.reduce((s, r) => s + r.totalOutput.C, 0);
  const totalD = results.reduce((s, r) => s + r.totalOutput.D, 0);
  const totalProduction = totalA + totalB + totalC + totalD;
  const avgProduction = results.length > 0 ? Math.round(totalProduction / results.length) : 0;
  const allPassed = results.every((r) => allConstraintsSatisfied(r.constraints));
  const passedCount = results.filter((r) => allConstraintsSatisfied(r.constraints)).length;
  const failedCount = results.length - passedCount;
  const lastResult = results[results.length - 1];
  const maxPeriodOutput = Math.max(
    ...results.map((r) => r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D)
  );
  const maxPeriodIdx = results.findIndex(
    (r) => r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D === maxPeriodOutput
  );

  // ============================================================
  // 空状态
  // ============================================================

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 mb-5 shadow-sm">
          <BarChart3 className="size-10 text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">暂无排产数据</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          请先在「生产模拟」中配置初始参数并填写排产数据，<br />
          或加载一个方案设计，数据将自动同步到此处。
        </p>
      </div>
    );
  }

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <div className="space-y-5">
      {/* ========== 顶部统计仪表板 ========== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Package className="size-5 text-blue-600" />}
          label="8期总产量"
          value={totalProduction.toLocaleString()}
          sub={`期均 ${avgProduction.toLocaleString()}`}
          accent="text-blue-700"
        />
        <StatCard
          icon={<TrendingUp className="size-5 text-emerald-600" />}
          label="峰值产量"
          value={maxPeriodOutput.toLocaleString()}
          sub={`第${PERIOD_CN[maxPeriodIdx]}期 (P${maxPeriodIdx + 1})`}
          accent="text-emerald-700"
        />
        <StatCard
          icon={<Factory className="size-5 text-indigo-600" />}
          label="末期机器数"
          value={lastResult?.resources.machines ?? 0}
          sub={`初始 ${effectiveConfig.initialMachines} 台`}
          accent="text-indigo-700"
        />
        <StatCard
          icon={<Users className="size-5 text-amber-600" />}
          label="末期可用人数"
          value={(lastResult?.resources.totalAvailableWorkers ?? 0).toFixed(1)}
          sub={`初始 ${effectiveConfig.initialWorkers} 人`}
          accent="text-amber-700"
        />
      </div>

      {/* ========== 约束状态 + 布局切换 ========== */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">8期排产总览</span>
          {allPassed ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
              <ShieldCheck className="size-3" />
              {passedCount}/{results.length} 通过
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs gap-1">
              <ShieldAlert className="size-3" />
              {failedCount}期超限
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <Button
            variant={layout === 4 ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2.5 text-xs gap-1 ${layout === 4 ? "" : "text-muted-foreground"}`}
            onClick={() => setLayout(4)}
          >
            <LayoutGrid className="size-3" />
            4列
          </Button>
          <Button
            variant={layout === 2 ? "default" : "ghost"}
            size="sm"
            className={`h-7 px-2.5 text-xs gap-1 ${layout === 2 ? "" : "text-muted-foreground"}`}
            onClick={() => setLayout(2)}
          >
            <Rows3 className="size-3" />
            2列
          </Button>
        </div>
      </div>

      {/* ========== 8期卡片网格 ========== */}
      <div className={`grid gap-3 ${
        layout === 4 ? "grid-cols-1 md:grid-cols-2 2xl:grid-cols-4" : "grid-cols-1 xl:grid-cols-2"
      }`}>
        {results.map((result, idx) => (
          <PeriodTableCard
            key={result.period}
            result={result}
            periodIndex={idx}
          />
        ))}
      </div>
    </div>
  );
}
