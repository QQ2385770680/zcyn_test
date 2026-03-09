/**
 * ProductionOverview — 生产总览（优化布局 + 视觉体验）
 *
 * 顶部：汇总统计仪表板（总产量、产品分布、约束状态、资源概览）
 * 中部：8 期卡片网格（支持 4列/2列 切换），每张卡片含产量表 + 关键参数
 * 底部：8 期汇总明细表
 */
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  ShieldCheck,
  ShieldAlert,
  Factory,
  Users,
  TrendingUp,
  LayoutGrid,
  Rows3,
  Package,
  Zap,
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
// 约束值颜色（与 Simulator 统一）
// ============================================================

function constraintColor(val: number): string {
  if (val < -0.001) return "text-red-600 font-semibold";
  if (val < 1) return "text-amber-600";
  return "text-emerald-700";
}

function constraintIcon(val: number): string {
  if (val < -0.001) return "⊗";
  if (val < 1) return "△";
  return "⊙";
}

function constraintBg(val: number): string {
  if (val < -0.001) return "bg-red-50";
  if (val < 1) return "bg-amber-50";
  return "bg-emerald-50/50";
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
// 单期卡片组件（紧凑版）
// ============================================================

const PERIOD_LABELS = ["一", "二", "三", "四", "五", "六", "七", "八"];

interface PeriodCardProps {
  result: PeriodResult;
  periodIndex: number;
  compact?: boolean;
}

function PeriodCard({ result, periodIndex, compact }: PeriodCardProps) {
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

  const fmt = (v: number) => {
    if (v === 0) return "0";
    return Number.isInteger(v) ? v.toString() : v.toFixed(3);
  };

  // 约束值列表
  const constraintItems = [
    { label: "人-一班", val: con.c1_workersAfterShift1 },
    { label: "人-一加", val: con.c2_workersAfterOt1 },
    { label: "人-二加", val: con.c4_workersAfterOt2 },
    { label: "机-一班", val: con.c5_machinesAfterShift1 },
    { label: "机-二班", val: con.c7_machinesAfterShift2 },
    { label: "机-二加", val: con.c8_machinesAfterOt2 },
  ];

  return (
    <Card className={`overflow-hidden border transition-all duration-200 hover:shadow-md ${
      !passed ? "border-red-300/80 bg-red-50/20 shadow-red-100/50" : "border-gray-200/60 shadow-sm"
    }`}>
      {/* 卡片标题栏 */}
      <div className={`flex items-center justify-between px-3 py-2 ${
        passed
          ? "bg-gradient-to-r from-emerald-50/80 to-blue-50/50 border-b border-gray-100"
          : "bg-gradient-to-r from-red-50/80 to-orange-50/50 border-b border-red-100"
      }`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold text-white ${
            passed ? "bg-emerald-600" : "bg-red-500"
          }`}>
            P{r.period}
          </span>
          <span className="text-xs font-bold text-foreground">第{PERIOD_LABELS[periodIndex]}期</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold tabular-nums text-foreground">{totalAll}</span>
          {passed ? (
            <ShieldCheck className="size-3.5 text-emerald-600" />
          ) : (
            <ShieldAlert className="size-3.5 text-red-500" />
          )}
        </div>
      </div>

      <div className={compact ? "p-2" : "p-2.5"}>
        {/* 产品分布条 */}
        <div className="flex items-center gap-1 mb-2">
          {[
            { label: "A", val: totalA, color: "bg-blue-500" },
            { label: "B", val: totalB, color: "bg-emerald-500" },
            { label: "C", val: totalC, color: "bg-amber-500" },
            { label: "D", val: totalD, color: "bg-purple-500" },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-0.5 text-[10px]">
              <span className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
              <span className="text-muted-foreground">{p.label}:</span>
              <span className="tabular-nums font-medium">{p.val}</span>
            </div>
          ))}
        </div>

        {/* 资源信息 */}
        <div className="flex items-center gap-3 mb-2 text-[10px]">
          <div className="flex items-center gap-1">
            <Factory className="size-3 text-blue-500" />
            <span className="text-muted-foreground">机器</span>
            <span className="font-bold tabular-nums text-blue-700">{res.machines}</span>
            {res.machinesPurchased > 0 && (
              <span className="text-blue-500 font-medium">(+{res.machinesPurchased})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Users className="size-3 text-amber-500" />
            <span className="text-muted-foreground">人数</span>
            <span className="font-bold tabular-nums text-amber-700">{res.totalAvailableWorkers.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">解雇/雇佣</span>
            <span className="tabular-nums">
              <span className="text-red-500">-{res.fired}</span>
              /
              <span className="text-emerald-500">+{res.hired}</span>
            </span>
          </div>
        </div>

        {/* 约束指标网格 */}
        <div className="grid grid-cols-3 gap-1">
          {constraintItems.map((item) => (
            <div
              key={item.label}
              className={`flex items-center justify-between px-1.5 py-0.5 rounded text-[10px] ${constraintBg(item.val)}`}
            >
              <span className="text-muted-foreground truncate">{item.label}</span>
              <span className={`tabular-nums font-medium ${constraintColor(item.val)}`}>
                {constraintIcon(item.val)}{fmt(item.val)}
              </span>
            </div>
          ))}
        </div>

        {/* 班次产量明细（非紧凑模式展开） */}
        {!compact && (
          <details className="mt-2 group">
            <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
              展开班次明细 ▾
            </summary>
            <table className="w-full text-[10px] border-collapse mt-1">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left py-1 px-1.5 font-semibold text-gray-600">产品</th>
                  <th className="text-center py-1 px-1 font-semibold text-gray-600">第一班</th>
                  <th className="text-center py-1 px-1 font-semibold text-gray-600">一加</th>
                  <th className="text-center py-1 px-1 font-semibold text-gray-600">第二班</th>
                  <th className="text-center py-1 px-1 font-semibold text-gray-600">二加</th>
                  <th className="text-center py-1 px-1 font-semibold text-blue-700">合计</th>
                </tr>
              </thead>
              <tbody>
                {(["A", "B", "C", "D"] as const).map((p) => (
                  <tr key={p} className="border-t border-gray-100">
                    <td className="py-0.5 px-1.5 font-medium">{p}</td>
                    <td className="text-center py-0.5 px-1 tabular-nums">{prod.shift1[p]}</td>
                    <td className="text-center py-0.5 px-1 tabular-nums">{prod.ot1[p]}</td>
                    <td className="text-center py-0.5 px-1 tabular-nums">{prod.shift2[p]}</td>
                    <td className="text-center py-0.5 px-1 tabular-nums">{prod.ot2[p]}</td>
                    <td className="text-center py-0.5 px-1 tabular-nums font-bold text-blue-700">
                      {prod.shift1[p] + prod.ot1[p] + prod.shift2[p] + prod.ot2[p]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// 主组件
// ============================================================

export function ProductionOverview() {
  const { config } = useConfig();
  const [layout, setLayout] = React.useState<2 | 4>(4);

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
          sub={`第${PERIOD_LABELS[maxPeriodIdx]}期 (P${maxPeriodIdx + 1})`}
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

      {/* ========== 产品分布 + 约束状态 ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 产品分布 */}
        <Card className="p-4 border-gray-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-foreground">产品分布</h4>
            <span className="text-xs text-muted-foreground">8期累计</span>
          </div>
          <div className="space-y-2">
            {[
              { label: "产品A", val: totalA, color: "bg-blue-500", track: "bg-blue-100" },
              { label: "产品B", val: totalB, color: "bg-emerald-500", track: "bg-emerald-100" },
              { label: "产品C", val: totalC, color: "bg-amber-500", track: "bg-amber-100" },
              { label: "产品D", val: totalD, color: "bg-purple-500", track: "bg-purple-100" },
            ].map((p) => {
              const pct = totalProduction > 0 ? (p.val / totalProduction) * 100 : 0;
              return (
                <div key={p.label} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-10 shrink-0">{p.label}</span>
                  <div className={`flex-1 h-5 rounded-full ${p.track} overflow-hidden`}>
                    <div
                      className={`h-full rounded-full ${p.color} transition-all duration-500`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-14 text-right">{p.val.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 约束状态 */}
        <Card className="p-4 border-gray-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-foreground">约束状态</h4>
            {allPassed ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
                <ShieldCheck className="size-3" />
                全部通过
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs gap-1">
                <ShieldAlert className="size-3" />
                {failedCount}期超限
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {results.map((r, idx) => {
              const ok = allConstraintsSatisfied(r.constraints);
              return (
                <div
                  key={r.period}
                  className={`flex flex-col items-center py-2 rounded-lg border transition-colors ${
                    ok
                      ? "bg-emerald-50/50 border-emerald-200/50"
                      : "bg-red-50/50 border-red-200/50"
                  }`}
                >
                  <span className={`text-[10px] font-bold ${ok ? "text-emerald-700" : "text-red-600"}`}>
                    P{r.period}
                  </span>
                  <span className="text-xs font-bold tabular-nums mt-0.5">
                    {(r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D).toLocaleString()}
                  </span>
                  {ok ? (
                    <ShieldCheck className="size-3 text-emerald-500 mt-0.5" />
                  ) : (
                    <ShieldAlert className="size-3 text-red-500 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* ========== 8期卡片网格 ========== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="size-4 text-blue-600" />
            8期排产详情
          </h4>
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

        <div className={`grid gap-3 ${
          layout === 4 ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-1 xl:grid-cols-2"
        }`}>
          {results.map((result, idx) => (
            <PeriodCard
              key={result.period}
              result={result}
              periodIndex={idx}
              compact={layout === 4}
            />
          ))}
        </div>
      </div>

      {/* ========== 底部汇总明细表 ========== */}
      <Card className="overflow-hidden border-gray-200/60 shadow-sm">
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
          <h4 className="text-sm font-bold text-foreground">8期汇总明细</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-700 whitespace-nowrap sticky left-0 bg-gray-50/80 z-10">期数</th>
                <th className="text-center py-2 px-2 font-semibold text-blue-700 whitespace-nowrap">机器</th>
                <th className="text-center py-2 px-2 font-semibold text-amber-700 whitespace-nowrap">期初人数</th>
                <th className="text-center py-2 px-2 font-semibold text-red-600 whitespace-nowrap">解雇</th>
                <th className="text-center py-2 px-2 font-semibold text-emerald-600 whitespace-nowrap">雇佣</th>
                <th className="text-center py-2 px-2 font-semibold text-amber-700 whitespace-nowrap">可用人数</th>
                <th className="text-center py-2 px-2 font-semibold text-blue-600 whitespace-nowrap">A</th>
                <th className="text-center py-2 px-2 font-semibold text-emerald-600 whitespace-nowrap">B</th>
                <th className="text-center py-2 px-2 font-semibold text-amber-600 whitespace-nowrap">C</th>
                <th className="text-center py-2 px-2 font-semibold text-purple-600 whitespace-nowrap">D</th>
                <th className="text-center py-2 px-2 font-semibold text-foreground whitespace-nowrap">总产量</th>
                <th className="text-center py-2 px-2 font-semibold text-gray-600 whitespace-nowrap">状态</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, idx) => {
                const total = r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D;
                const ok = allConstraintsSatisfied(r.constraints);
                return (
                  <tr
                    key={r.period}
                    className={`border-b border-gray-100 transition-colors hover:bg-gray-50/50 ${
                      !ok ? "bg-red-50/30" : idx % 2 === 0 ? "" : "bg-gray-50/30"
                    }`}
                  >
                    <td className="py-1.5 px-3 font-bold text-foreground whitespace-nowrap sticky left-0 bg-inherit z-10">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white mr-1.5 ${
                        ok ? "bg-emerald-600" : "bg-red-500"
                      }`}>
                        {r.period}
                      </span>
                      P{r.period}
                    </td>
                    <td className="text-center py-1.5 px-2 tabular-nums font-medium text-blue-700">{r.resources.machines}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums">{r.resources.initialWorkers}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums text-red-600">-{r.resources.fired}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums text-emerald-600">+{r.resources.hired}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums font-medium text-amber-700">{r.resources.totalAvailableWorkers.toFixed(1)}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums">{r.totalOutput.A}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums">{r.totalOutput.B}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums">{r.totalOutput.C}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums">{r.totalOutput.D}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums font-bold">{total}</td>
                    <td className="text-center py-1.5 px-2">
                      {ok ? (
                        <ShieldCheck className="size-3.5 text-emerald-500 mx-auto" />
                      ) : (
                        <ShieldAlert className="size-3.5 text-red-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* 合计行 */}
              <tr className="bg-gradient-to-r from-blue-50/50 to-slate-50/50 border-t-2 border-gray-300 font-bold">
                <td className="py-2 px-3 text-foreground sticky left-0 bg-blue-50/50 z-10">合计</td>
                <td className="text-center py-2 px-2 tabular-nums text-blue-700">{lastResult?.resources.machines ?? 0}</td>
                <td className="text-center py-2 px-2" />
                <td className="text-center py-2 px-2 tabular-nums text-red-600">
                  -{results.reduce((s, r) => s + r.resources.fired, 0)}
                </td>
                <td className="text-center py-2 px-2 tabular-nums text-emerald-600">
                  +{results.reduce((s, r) => s + r.resources.hired, 0)}
                </td>
                <td className="text-center py-2 px-2" />
                <td className="text-center py-2 px-2 tabular-nums text-blue-600">{totalA}</td>
                <td className="text-center py-2 px-2 tabular-nums text-emerald-600">{totalB}</td>
                <td className="text-center py-2 px-2 tabular-nums text-amber-600">{totalC}</td>
                <td className="text-center py-2 px-2 tabular-nums text-purple-600">{totalD}</td>
                <td className="text-center py-2 px-2 tabular-nums text-foreground">{totalProduction}</td>
                <td className="text-center py-2 px-2">
                  <span className={`text-[10px] font-bold ${allPassed ? "text-emerald-600" : "text-red-600"}`}>
                    {passedCount}/{results.length}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
