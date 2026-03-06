/**
 * ProductionSimulator — 生产模拟器（真实计算引擎版）
 *
 * 功能：
 * - 各期四班次（一班/一加/二班/二加）× 四产品（A/B/C/D）排产输入
 * - 资源参数面板（机器数、工人数、雇佣/解雇决策）
 * - 实时约束验证（6个约束检查点）
 * - 利用率概览卡片
 * - 颜色映射标识（必填/选填/自由）
 *
 * 设计风格：清新简洁，延续 wuushuang.com 风格
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Factory,
  Users,
  Package,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import React from "react";

import {
  type PeriodProduction,
  type PeriodDecision,
  type PeriodResult,
  type GlobalConfig,
  type CellColor,
  DEFAULT_CONFIG,
  PERIOD_COLOR_MAPS,
  emptyPeriodProduction,
  allConstraintsSatisfied,
} from "@/lib/data";
import { useConfig } from "@/lib/ConfigContext";

import {
  calcAllPeriods,
  generateDefaultDecisions,
  getConstraintStatus,
  calcWorkerUtilization,
  calcMachineUtilization,
  calcTotalProduction,
} from "@/lib/engine";

// ============================================================
// 主组件
// ============================================================

export function ProductionSimulator() {
  // 全局配置（来自 ConfigContext，自动持久化）
  const { config } = useConfig();

  // 当前选中的期数
  const [currentPeriod, setCurrentPeriod] = React.useState("1");

  // 各期排产数据
  const [productions, setProductions] = React.useState<PeriodProduction[]>(() =>
    Array.from({ length: config.periods }, () => emptyPeriodProduction())
  );

  // 各期资源决策
  const [decisions, setDecisions] = React.useState<PeriodDecision[]>(() =>
    generateDefaultDecisions(config)
  );

  // 资源面板展开/折叠
  const [resourcesExpanded, setResourcesExpanded] = React.useState(false);

  // 计算所有期数结果
  const results = React.useMemo(
    () => calcAllPeriods(config, productions, decisions),
    [config, productions, decisions]
  );

  // 当前期结果
  const periodIdx = parseInt(currentPeriod) - 1;
  const currentResult = results[periodIdx];
  const currentProduction = productions[periodIdx];
  const currentDecision = decisions[periodIdx];
  const colorMap = PERIOD_COLOR_MAPS[parseInt(currentPeriod)] || PERIOD_COLOR_MAPS[8];

  // 约束是否全部满足
  const constraintsPassed = currentResult
    ? allConstraintsSatisfied(currentResult.constraints)
    : true;

  // 更新排产数据
  const updateProduction = (
    shift: keyof PeriodProduction,
    product: "A" | "B" | "C" | "D",
    value: number
  ) => {
    setProductions((prev) => {
      const next = [...prev];
      next[periodIdx] = {
        ...next[periodIdx],
        [shift]: {
          ...next[periodIdx][shift],
          [product]: Math.max(0, Math.floor(value) || 0),
        },
      };
      return next;
    });
  };

  // 更新资源决策
  const updateDecision = (field: keyof PeriodDecision, value: number) => {
    setDecisions((prev) => {
      const next = [...prev];
      next[periodIdx] = {
        ...next[periodIdx],
        [field]: Math.max(0, Math.floor(value) || 0),
      };
      return next;
    });
  };

  // 重置当前期
  const handleReset = () => {
    setProductions((prev) => {
      const next = [...prev];
      next[periodIdx] = emptyPeriodProduction();
      return next;
    });
    const defaultDecs = generateDefaultDecisions(config);
    setDecisions((prev) => {
      const next = [...prev];
      next[periodIdx] = defaultDecs[periodIdx];
      return next;
    });
  };

  // 重置全部
  const handleResetAll = () => {
    setProductions(Array.from({ length: config.periods }, () => emptyPeriodProduction()));
    setDecisions(generateDefaultDecisions(config));
  };

  if (!currentResult) return null;

  const workerUtil = calcWorkerUtilization(currentResult);
  const machineUtil = calcMachineUtilization(currentResult);
  const totalProd = calcTotalProduction(currentResult);
  const totalOt =
    currentResult.totalOutput.A -
    currentResult.production.shift1.A -
    currentResult.production.shift2.A +
    currentResult.totalOutput.B -
    currentResult.production.shift1.B -
    currentResult.production.shift2.B +
    currentResult.totalOutput.C -
    currentResult.production.shift1.C -
    currentResult.production.shift2.C +
    currentResult.totalOutput.D -
    currentResult.production.shift1.D -
    currentResult.production.shift2.D;

  // 正班总产量
  const normalTotal =
    currentResult.production.shift1.A + currentResult.production.shift1.B +
    currentResult.production.shift1.C + currentResult.production.shift1.D +
    currentResult.production.shift2.A + currentResult.production.shift2.B +
    currentResult.production.shift2.C + currentResult.production.shift2.D;

  return (
    <div className="space-y-6">
      {/* ===== 控制栏 ===== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Select value={currentPeriod} onValueChange={setCurrentPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: config.periods }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  第 {i + 1} 期
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge
            variant="outline"
            className={
              constraintsPassed
                ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                : "text-red-600 border-red-200 bg-red-50"
            }
          >
            {constraintsPassed ? (
              <><CheckCircle2 className="size-3 mr-1" />约束满足</>
            ) : (
              <><XCircle className="size-3 mr-1" />约束超限</>
            )}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
            <RotateCcw className="size-3.5" />
            重置本期
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleResetAll}>
            <RotateCcw className="size-3.5" />
            重置全部
          </Button>
        </div>
      </div>

      {/* ===== 利用率概览 ===== */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UtilizationCard
          icon={<Users className="size-4 text-blue-500" />}
          label="工人利用率"
          value={workerUtil}
          detail={`${currentResult.resources.totalAvailableWorkers.toFixed(1)} 人可用`}
          color="blue"
        />
        <UtilizationCard
          icon={<Factory className="size-4 text-emerald-500" />}
          label="机器利用率"
          value={machineUtil}
          detail={`${currentResult.resources.machines} 台可用`}
          color="emerald"
        />
        <UtilizationCard
          icon={<Package className="size-4 text-amber-500" />}
          label="正班总产量"
          value={normalTotal}
          detail="单位"
          color="amber"
          isCount
        />
        <UtilizationCard
          icon={<TrendingUp className="size-4 text-pink-500" />}
          label="加班总产量"
          value={totalOt}
          detail="单位"
          color="pink"
          isCount
        />
      </div>

      {/* ===== 资源参数面板（可折叠） ===== */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setResourcesExpanded(!resourcesExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="size-4 text-emerald-500" />
              <CardTitle className="text-base">第 {currentPeriod} 期资源参数</CardTitle>
            </div>
            {resourcesExpanded ? (
              <ChevronUp className="size-4 text-gray-400" />
            ) : (
              <ChevronDown className="size-4 text-gray-400" />
            )}
          </div>
          <CardDescription>
            机器 {currentResult.resources.machines} 台 · 期初工人 {currentResult.resources.initialWorkers} 人 · 可用工人 {currentResult.resources.totalAvailableWorkers.toFixed(1)} 人
          </CardDescription>
        </CardHeader>
        {resourcesExpanded && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ResourceField
                label="本期机器"
                value={currentResult.resources.machines}
                readOnly
                hint={parseInt(currentPeriod) === 1 ? "初始值" : "自动计算"}
              />
              <ResourceField
                label="本期购买机器"
                value={currentDecision.machinesPurchased}
                onChange={(v) => updateDecision("machinesPurchased", v)}
                hint="两期后到货"
                isDecision
              />
              <ResourceField
                label="期初人数"
                value={currentResult.resources.initialWorkers}
                readOnly
                hint={parseInt(currentPeriod) === 1 ? "初始值" : "自动计算"}
              />
              <ResourceField
                label="总可用人数"
                value={parseFloat(currentResult.resources.totalAvailableWorkers.toFixed(2))}
                readOnly
                hint="期初 - 解雇 + 雇佣×25%"
              />
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ResourceField
                label="最少解雇"
                value={currentResult.resources.minFire}
                readOnly
                hint={`⌈${currentResult.resources.initialWorkers} × ${config.minFireRate}%⌉`}
              />
              <ResourceField
                label="本期解雇"
                value={currentDecision.fired}
                onChange={(v) => updateDecision("fired", v)}
                hint={`≥ ${currentResult.resources.minFire}`}
                isDecision
              />
              <ResourceField
                label="最大雇佣"
                value={currentResult.resources.maxHire}
                readOnly
                hint={`⌊${currentResult.resources.initialWorkers} × ${config.maxHireRate}%⌋`}
              />
              <ResourceField
                label="本期雇佣"
                value={currentDecision.hired}
                onChange={(v) => updateDecision("hired", v)}
                hint={`≤ ${currentResult.resources.maxHire}`}
                isDecision
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ===== 排产计划表格 ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">第 {currentPeriod} 期排产计划</CardTitle>
          <CardDescription>
            设置各产品在四个班次的生产数量。
            <span className="inline-flex items-center gap-2 ml-2">
              <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" /> 必填
              <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-300" /> 选填
              <span className="inline-block w-3 h-3 rounded bg-gray-50 border border-gray-200" /> 自由
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 w-16">产品</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">第一班</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">一加</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">第二班</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">二加</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 w-20">合计</th>
                </tr>
              </thead>
              <tbody>
                {(["A", "B", "C", "D"] as const).map((product) => {
                  const total =
                    currentProduction.shift1[product] +
                    currentProduction.ot1[product] +
                    currentProduction.shift2[product] +
                    currentProduction.ot2[product];
                  return (
                    <tr key={product} className="border-b border-gray-50">
                      <td className="py-2 px-3 font-semibold text-gray-700">{product}</td>
                      {(["shift1", "ot1", "shift2", "ot2"] as const).map((shift) => {
                        const cellColor = colorMap[product]?.[shift] || "free";
                        return (
                          <td key={shift} className="py-2 px-3">
                            <ProductionInput
                              value={currentProduction[shift][product]}
                              onChange={(v) => updateProduction(shift, product, v)}
                              cellColor={cellColor}
                            />
                          </td>
                        );
                      })}
                      <td className="py-2 px-3 text-right font-medium text-gray-700">{total}</td>
                    </tr>
                  );
                })}
                {/* 班次小计行 */}
                <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                  <td className="py-2 px-3 font-medium text-gray-500 text-xs">小计</td>
                  {(["shift1", "ot1", "shift2", "ot2"] as const).map((shift) => {
                    const sum =
                      currentProduction[shift].A +
                      currentProduction[shift].B +
                      currentProduction[shift].C +
                      currentProduction[shift].D;
                    return (
                      <td key={shift} className="py-2 px-3 text-center font-medium text-gray-600 text-xs">
                        {sum}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right font-bold text-gray-800">{totalProd}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ===== 约束验证 ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">约束验证</CardTitle>
          <CardDescription>实时检查当前排产方案是否满足所有约束条件（值 ≥ 0 为通过）</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ConstraintRow
              label="C1: 可用人数-一班后"
              value={currentResult.constraints.c1_workersAfterShift1}
              formula="总可用人数 - 一正消耗人力 - 二正消耗人力"
            />
            <ConstraintRow
              label="C2: 可用人数-一加后"
              value={currentResult.constraints.c2_workersAfterOt1}
              formula="一正消耗人力 - 一加消耗人力 × 2"
            />
            <ConstraintRow
              label="C4: 可用人数-二加后"
              value={currentResult.constraints.c4_workersAfterOt2}
              formula="二正消耗人力 - 二加消耗人力 × 2"
            />
            <ConstraintRow
              label="C5: 可用机器-一班后"
              value={currentResult.constraints.c5_machinesAfterShift1}
              formula="本期机器 - 一正消耗机器"
            />
            <ConstraintRow
              label="C7: 可用机器-二班后"
              value={currentResult.constraints.c7_machinesAfterShift2}
              formula="本期机器 - 二正消耗机器 - 一加消耗机器 × 2"
            />
            <ConstraintRow
              label="C8: 可用机器-二加后"
              value={currentResult.constraints.c8_machinesAfterOt2}
              formula="本期机器 - 二加消耗机器 × 2"
            />
          </div>
        </CardContent>
      </Card>

      {/* ===== 资源消耗明细 ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">资源消耗明细</CardTitle>
          <CardDescription>各班次的人力和机器消耗详情</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">资源</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">第一班</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">一加</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">第二班</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">二加</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-2 px-3 font-medium text-blue-600">
                    <span className="flex items-center gap-1.5">
                      <Users className="size-3.5" /> 人力消耗
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">{currentResult.laborUsed.shift1.toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">{currentResult.laborUsed.ot1.toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">{currentResult.laborUsed.shift2.toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">{currentResult.laborUsed.ot2.toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-50">
                  <td className="py-2 px-3 font-medium text-emerald-600">
                    <span className="flex items-center gap-1.5">
                      <Factory className="size-3.5" /> 机器消耗
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">{currentResult.machineUsed.shift1.toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">{currentResult.machineUsed.ot1.toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">{currentResult.machineUsed.shift2.toFixed(2)}</td>
                  <td className="py-2 px-3 text-center">{currentResult.machineUsed.ot2.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// 子组件
// ============================================================

/** 利用率卡片 */
function UtilizationCard({
  icon,
  label,
  value,
  detail,
  color,
  isCount,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  color: string;
  isCount?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    pink: "bg-pink-500",
  };

  return (
    <Card className="border-gray-100">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{label}</span>
          {icon}
        </div>
        {isCount ? (
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        ) : (
          <>
            <div className="text-2xl font-bold text-gray-900">{value}%</div>
            <Progress value={value} className={`h-1.5 [&>div]:${colorMap[color]}`} />
          </>
        )}
        <div className="text-xs text-gray-400">{detail}</div>
      </CardContent>
    </Card>
  );
}

/** 排产输入框（带颜色标识） */
function ProductionInput({
  value,
  onChange,
  cellColor,
}: {
  value: number;
  onChange: (v: number) => void;
  cellColor: CellColor;
}) {
  const bgClass =
    cellColor === "required"
      ? "bg-amber-50 border-amber-300 focus-within:ring-amber-200"
      : cellColor === "optional"
        ? "bg-blue-50 border-blue-300 focus-within:ring-blue-200"
        : cellColor === "disabled"
          ? "bg-gray-100 border-gray-200 opacity-50"
          : "bg-white border-gray-200";

  return (
    <Input
      type="number"
      value={value || ""}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      className={`w-20 mx-auto text-center h-8 text-sm ${bgClass}`}
      disabled={cellColor === "disabled"}
      min={0}
      placeholder="0"
    />
  );
}

/** 资源参数字段 */
function ResourceField({
  label,
  value,
  readOnly,
  onChange,
  hint,
  isDecision,
}: {
  label: string;
  value: number;
  readOnly?: boolean;
  onChange?: (v: number) => void;
  hint?: string;
  isDecision?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-500 flex items-center gap-1.5">
        {label}
        {isDecision && (
          <Badge className="text-[9px] px-1 py-0 bg-orange-100 text-orange-700 border-0">
            决策
          </Badge>
        )}
      </Label>
      {readOnly ? (
        <div className="h-8 flex items-center px-3 rounded-md bg-gray-50 border border-gray-100 text-sm font-medium text-gray-700">
          {typeof value === "number" && !Number.isInteger(value) ? value.toFixed(2) : value}
        </div>
      ) : (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange?.(parseInt(e.target.value) || 0)}
          className="h-8 text-sm border-orange-200 bg-orange-50/50"
          min={0}
        />
      )}
      {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}

/** 约束验证行 */
function ConstraintRow({
  label,
  value,
  formula,
}: {
  label: string;
  value: number;
  formula: string;
}) {
  const status = getConstraintStatus(value);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
      {status === "pass" && <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />}
      {status === "warning" && <AlertTriangle className="size-4 text-amber-500 shrink-0" />}
      {status === "fail" && <XCircle className="size-4 text-red-500 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <p className="text-[10px] text-gray-400 truncate">{formula}</p>
      </div>
      <span
        className={`text-sm font-mono font-medium ${
          status === "fail"
            ? "text-red-600"
            : status === "warning"
              ? "text-amber-600"
              : "text-emerald-600"
        }`}
      >
        {value.toFixed(3)}
      </span>
      <Badge
        variant="outline"
        className={
          status === "pass"
            ? "text-emerald-600 border-emerald-200 bg-emerald-50"
            : status === "warning"
              ? "text-amber-600 border-amber-200 bg-amber-50"
              : "text-red-600 border-red-200 bg-red-50"
        }
      >
        {status === "pass" ? "通过" : status === "warning" ? "警告" : "超限"}
      </Badge>
    </div>
  );
}
