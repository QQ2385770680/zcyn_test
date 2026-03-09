/**
 * ProductionOverview — 全局总览
 * 
 * 跨8期排产数据的直观可视化总览视图：
 * - 顶部 KPI 卡片：总产量、机器峰值、人力峰值、约束状态
 * - 8期产量堆叠柱状图（按产品 A/B/C/D 分色）
 * - 8期资源趋势折线图（机器数 + 可用人数）
 * - 完整数据矩阵表格（8期 × 全维度）
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Factory,
  Users,
  Package,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";

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
// 产品颜色定义
// ============================================================

const PRODUCT_COLORS = {
  A: { fill: "#10b981", stroke: "#059669", label: "产品A" },
  B: { fill: "#3b82f6", stroke: "#2563eb", label: "产品B" },
  C: { fill: "#f59e0b", stroke: "#d97706", label: "产品C" },
  D: { fill: "#8b5cf6", stroke: "#7c3aed", label: "产品D" },
};

// ============================================================
// KPI 卡片组件
// ============================================================

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accentColor: string;
}

function KpiCard({ title, value, subtitle, icon, trend, trendLabel, accentColor }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden border-gray-200/80 shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {subtitle && (
              <div className="flex items-center gap-1.5">
                {trend === "up" && <ArrowUpRight className="size-3.5 text-emerald-500" />}
                {trend === "down" && <ArrowDownRight className="size-3.5 text-red-500" />}
                {trend === "neutral" && <Minus className="size-3.5 text-gray-400" />}
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              </div>
            )}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accentColor}`}>
            {icon}
          </div>
        </div>
      </CardContent>
      {/* 底部装饰条 */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${accentColor.replace("bg-", "bg-").replace("/10", "")}`} />
    </Card>
  );
}

// ============================================================
// 自定义 Tooltip
// ============================================================

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-medium tabular-nums">{p.value}</span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between text-sm">
        <span className="font-medium text-foreground">合计</span>
        <span className="font-bold tabular-nums">{total}</span>
      </div>
    </div>
  );
}

function CustomLineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: p.stroke || p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-medium tabular-nums">
            {typeof p.value === "number" ? (Number.isInteger(p.value) ? p.value : p.value.toFixed(1)) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// 约束状态徽章
// ============================================================

function ConstraintBadge({ satisfied }: { satisfied: boolean }) {
  return satisfied ? (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
      <ShieldCheck className="size-3" />
      通过
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs gap-1">
      <ShieldAlert className="size-3" />
      超限
    </Badge>
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
    // 无缓存时返回空数据
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

  // 使用缓存中保存的初始参数
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

  // ---- KPI 计算 ----
  const totalProduction = results.reduce(
    (sum, r) => sum + r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D,
    0
  );
  const peakMachines = Math.max(...results.map((r) => r.resources.machines));
  const peakWorkers = Math.max(...results.map((r) => r.resources.totalAvailableWorkers));
  const allConstraintsPassed = results.every((r) => allConstraintsSatisfied(r.constraints));
  const failedPeriods = results.filter((r) => !allConstraintsSatisfied(r.constraints)).length;

  // ---- 图表数据 ----
  const barChartData = results.map((r) => ({
    name: `P${r.period}`,
    A: r.totalOutput.A,
    B: r.totalOutput.B,
    C: r.totalOutput.C,
    D: r.totalOutput.D,
    total: r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D,
  }));

  const lineChartData = results.map((r) => ({
    name: `P${r.period}`,
    machines: r.resources.machines,
    workers: Number(r.resources.totalAvailableWorkers.toFixed(1)),
    initialWorkers: r.resources.initialWorkers,
    hired: r.resources.hired,
    fired: r.resources.fired,
  }));

  // ---- 数据矩阵 ----
  const matrixData = results.map((r) => {
    const totalOut = r.totalOutput.A + r.totalOutput.B + r.totalOutput.C + r.totalOutput.D;
    const laborUtil =
      r.resources.totalAvailableWorkers > 0
        ? (
            ((r.laborUsed.shift1 + r.laborUsed.shift2 + r.laborUsed.ot1 + r.laborUsed.ot2) /
              r.resources.totalAvailableWorkers) *
            100
          ).toFixed(0)
        : "0";
    const machineUtil =
      r.resources.machines > 0
        ? (
            ((r.machineUsed.shift1 + r.machineUsed.shift2 + r.machineUsed.ot1 + r.machineUsed.ot2) /
              r.resources.machines) *
            100
          ).toFixed(0)
        : "0";
    return {
      period: r.period,
      machines: r.resources.machines,
      purchased: r.resources.machinesPurchased,
      initialWorkers: r.resources.initialWorkers,
      fired: r.resources.fired,
      hired: r.resources.hired,
      availableWorkers: r.resources.totalAvailableWorkers.toFixed(1),
      outputA: r.totalOutput.A,
      outputB: r.totalOutput.B,
      outputC: r.totalOutput.C,
      outputD: r.totalOutput.D,
      totalOutput: totalOut,
      laborUtil,
      machineUtil,
      constraintOk: allConstraintsSatisfied(r.constraints),
    };
  });

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
    <div className="space-y-6">
      {/* KPI 卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="总产量（8期合计）"
          value={totalProduction.toLocaleString()}
          subtitle={`平均每期 ${Math.round(totalProduction / config.periods).toLocaleString()}`}
          icon={<Package className="size-5 text-emerald-600" />}
          trend="neutral"
          accentColor="bg-emerald-50"
        />
        <KpiCard
          title="机器峰值"
          value={peakMachines}
          subtitle={`初始 ${effectiveConfig.initialMachines} 台`}
          icon={<Factory className="size-5 text-blue-600" />}
          trend={peakMachines > effectiveConfig.initialMachines ? "up" : "neutral"}
          accentColor="bg-blue-50"
        />
        <KpiCard
          title="人力峰值"
          value={peakWorkers.toFixed(1)}
          subtitle={`初始 ${effectiveConfig.initialWorkers} 人`}
          icon={<Users className="size-5 text-amber-600" />}
          trend={peakWorkers > effectiveConfig.initialWorkers ? "up" : "neutral"}
          accentColor="bg-amber-50"
        />
        <KpiCard
          title="约束状态"
          value={allConstraintsPassed ? "全部通过" : `${failedPeriods}期超限`}
          subtitle={allConstraintsPassed ? "8期约束均满足" : "存在资源约束违规"}
          icon={
            allConstraintsPassed ? (
              <ShieldCheck className="size-5 text-emerald-600" />
            ) : (
              <ShieldAlert className="size-5 text-red-600" />
            )
          }
          trend={allConstraintsPassed ? "up" : "down"}
          accentColor={allConstraintsPassed ? "bg-emerald-50" : "bg-red-50"}
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 产量堆叠柱状图 */}
        <Card className="border-gray-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="size-4 text-emerald-600" />
              各期产量分布
            </CardTitle>
            <p className="text-xs text-muted-foreground">按产品 A/B/C/D 堆叠显示各期总产量</p>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Bar dataKey="A" name="产品A" stackId="stack" fill={PRODUCT_COLORS.A.fill} radius={[0, 0, 0, 0]} />
                <Bar dataKey="B" name="产品B" stackId="stack" fill={PRODUCT_COLORS.B.fill} />
                <Bar dataKey="C" name="产品C" stackId="stack" fill={PRODUCT_COLORS.C.fill} />
                <Bar dataKey="D" name="产品D" stackId="stack" fill={PRODUCT_COLORS.D.fill} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 资源趋势图 */}
        <Card className="border-gray-200/80 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-600" />
              资源变化趋势
            </CardTitle>
            <p className="text-xs text-muted-foreground">机器数量与可用人数的8期变化趋势</p>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#3b82f6" }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "#10b981" }} />
                <Tooltip content={<CustomLineTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="workers"
                  name="可用人数"
                  fill="#10b98120"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#10b981" }}
                />
                <Line
                  yAxisId="left"
                  type="stepAfter"
                  dataKey="machines"
                  name="机器数"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 完整数据矩阵 */}
      <Card className="border-gray-200/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="size-4 text-violet-600" />
            8期数据总览
          </CardTitle>
          <p className="text-xs text-muted-foreground">各期资源配置、产量分布与利用率一览</p>
        </CardHeader>
        <CardContent className="pt-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="text-left py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">期数</th>
                <th className="text-center py-2.5 px-3 font-semibold text-blue-700 whitespace-nowrap">机器</th>
                <th className="text-center py-2.5 px-3 font-semibold text-blue-700 whitespace-nowrap">购买</th>
                <th className="text-center py-2.5 px-3 font-semibold text-amber-700 whitespace-nowrap">期初人数</th>
                <th className="text-center py-2.5 px-3 font-semibold text-red-700 whitespace-nowrap">解雇</th>
                <th className="text-center py-2.5 px-3 font-semibold text-emerald-700 whitespace-nowrap">雇佣</th>
                <th className="text-center py-2.5 px-3 font-semibold text-amber-700 whitespace-nowrap">可用人数</th>
                <th className="text-center py-2.5 px-3 font-semibold whitespace-nowrap" style={{ color: PRODUCT_COLORS.A.stroke }}>A</th>
                <th className="text-center py-2.5 px-3 font-semibold whitespace-nowrap" style={{ color: PRODUCT_COLORS.B.stroke }}>B</th>
                <th className="text-center py-2.5 px-3 font-semibold whitespace-nowrap" style={{ color: PRODUCT_COLORS.C.stroke }}>C</th>
                <th className="text-center py-2.5 px-3 font-semibold whitespace-nowrap" style={{ color: PRODUCT_COLORS.D.stroke }}>D</th>
                <th className="text-center py-2.5 px-3 font-bold text-foreground whitespace-nowrap">合计</th>
                <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground whitespace-nowrap">人力%</th>
                <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground whitespace-nowrap">机器%</th>
                <th className="text-center py-2.5 px-3 font-semibold text-muted-foreground whitespace-nowrap">约束</th>
              </tr>
            </thead>
            <tbody>
              {matrixData.map((row) => (
                <tr
                  key={row.period}
                  className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-2.5 px-3 font-semibold text-foreground">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 text-xs font-bold">
                      P{row.period}
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-3 tabular-nums font-medium text-blue-700">{row.machines}</td>
                  <td className="text-center py-2.5 px-3 tabular-nums text-muted-foreground">
                    {row.purchased > 0 ? <span className="text-blue-600">+{row.purchased}</span> : "—"}
                  </td>
                  <td className="text-center py-2.5 px-3 tabular-nums">{row.initialWorkers}</td>
                  <td className="text-center py-2.5 px-3 tabular-nums">
                    {row.fired > 0 ? <span className="text-red-600">-{row.fired}</span> : "—"}
                  </td>
                  <td className="text-center py-2.5 px-3 tabular-nums">
                    {row.hired > 0 ? <span className="text-emerald-600">+{row.hired}</span> : "—"}
                  </td>
                  <td className="text-center py-2.5 px-3 tabular-nums font-medium text-amber-700">{row.availableWorkers}</td>
                  <td className="text-center py-2.5 px-3 tabular-nums">{row.outputA || "—"}</td>
                  <td className="text-center py-2.5 px-3 tabular-nums">{row.outputB || "—"}</td>
                  <td className="text-center py-2.5 px-3 tabular-nums">{row.outputC || "—"}</td>
                  <td className="text-center py-2.5 px-3 tabular-nums">{row.outputD || "—"}</td>
                  <td className="text-center py-2.5 px-3 tabular-nums font-bold">{row.totalOutput || "—"}</td>
                  <td className="text-center py-2.5 px-3 tabular-nums">
                    <span className={`${Number(row.laborUtil) > 90 ? "text-red-600 font-medium" : Number(row.laborUtil) > 70 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {row.laborUtil}%
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-3 tabular-nums">
                    <span className={`${Number(row.machineUtil) > 90 ? "text-red-600 font-medium" : Number(row.machineUtil) > 70 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {row.machineUtil}%
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-3">
                    <ConstraintBadge satisfied={row.constraintOk} />
                  </td>
                </tr>
              ))}
            </tbody>
            {/* 合计行 */}
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50/80 font-semibold">
                <td className="py-2.5 px-3 text-foreground">合计</td>
                <td className="text-center py-2.5 px-3 text-blue-700">—</td>
                <td className="text-center py-2.5 px-3 text-blue-600">
                  +{matrixData.reduce((s, r) => s + r.purchased, 0) || "—"}
                </td>
                <td className="text-center py-2.5 px-3">—</td>
                <td className="text-center py-2.5 px-3 text-red-600">
                  -{matrixData.reduce((s, r) => s + r.fired, 0)}
                </td>
                <td className="text-center py-2.5 px-3 text-emerald-600">
                  +{matrixData.reduce((s, r) => s + r.hired, 0)}
                </td>
                <td className="text-center py-2.5 px-3">—</td>
                <td className="text-center py-2.5 px-3 tabular-nums">{matrixData.reduce((s, r) => s + r.outputA, 0) || "—"}</td>
                <td className="text-center py-2.5 px-3 tabular-nums">{matrixData.reduce((s, r) => s + r.outputB, 0) || "—"}</td>
                <td className="text-center py-2.5 px-3 tabular-nums">{matrixData.reduce((s, r) => s + r.outputC, 0) || "—"}</td>
                <td className="text-center py-2.5 px-3 tabular-nums">{matrixData.reduce((s, r) => s + r.outputD, 0) || "—"}</td>
                <td className="text-center py-2.5 px-3 tabular-nums font-bold text-foreground">{totalProduction.toLocaleString()}</td>
                <td className="text-center py-2.5 px-3">—</td>
                <td className="text-center py-2.5 px-3">—</td>
                <td className="text-center py-2.5 px-3">
                  {allConstraintsPassed ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">全通过</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">{failedPeriods}期超限</Badge>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
