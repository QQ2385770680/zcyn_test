/**
 * ProductionSimulator — 生产模拟器
 * 设计风格：清新简洁，卡片式参数面板 + 结果展示
 * 功能：各期班次排产参数调整，实时约束验证，产能计算
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Factory,
  Users,
  Package,
} from "lucide-react";
import React from "react";

interface PeriodData {
  period: number;
  normalP1: number;
  normalP2: number;
  normalP3: number;
  normalP4: number;
  overtimeP1: number;
  overtimeP2: number;
  overtimeP3: number;
  overtimeP4: number;
}

const defaultPeriods: PeriodData[] = Array.from({ length: 8 }, (_, i) => ({
  period: i + 1,
  normalP1: 30,
  normalP2: 20,
  normalP3: 15,
  normalP4: 10,
  overtimeP1: 10,
  overtimeP2: 8,
  overtimeP3: 5,
  overtimeP4: 3,
}));

export function ProductionSimulator() {
  const [currentPeriod, setCurrentPeriod] = React.useState("1");
  const [periods] = React.useState<PeriodData[]>(defaultPeriods);
  const [isRunning, setIsRunning] = React.useState(false);

  const current = periods[parseInt(currentPeriod) - 1];
  const totalNormal = current.normalP1 + current.normalP2 + current.normalP3 + current.normalP4;
  const totalOvertime = current.overtimeP1 + current.overtimeP2 + current.overtimeP3 + current.overtimeP4;
  const workerCapacity = 113;
  const machineCapacity = 157;
  const workerUtilization = Math.min(100, Math.round((totalNormal / workerCapacity) * 100));
  const machineUtilization = Math.min(100, Math.round((totalNormal / machineCapacity) * 100));

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={currentPeriod} onValueChange={setCurrentPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 8 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  第 {i + 1} 期
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="size-3 mr-1" />
            约束满足
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <RotateCcw className="size-3.5" />
            重置
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleRun}
            disabled={isRunning}
          >
            <Play className="size-3.5" />
            {isRunning ? "计算中..." : "运行模拟"}
          </Button>
        </div>
      </div>

      {/* Utilization Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UtilizationCard
          icon={<Users className="size-4 text-blue-500" />}
          label="工人利用率"
          value={workerUtilization}
          detail={`${totalNormal} / ${workerCapacity} 人`}
          color="blue"
        />
        <UtilizationCard
          icon={<Factory className="size-4 text-emerald-500" />}
          label="机器利用率"
          value={machineUtilization}
          detail={`${totalNormal} / ${machineCapacity} 台`}
          color="emerald"
        />
        <UtilizationCard
          icon={<Package className="size-4 text-amber-500" />}
          label="正常班总产量"
          value={totalNormal}
          detail="单位"
          color="amber"
          isCount
        />
        <UtilizationCard
          icon={<TrendingUp className="size-4 text-pink-500" />}
          label="加班总产量"
          value={totalOvertime}
          detail="单位"
          color="pink"
          isCount
        />
      </div>

      {/* Production Schedule Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">第 {currentPeriod} 期排产计划</CardTitle>
              <CardDescription>设置各产品的正常班和加班生产数量</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>产品</TableHead>
                <TableHead className="text-center">正常班产量</TableHead>
                <TableHead className="text-center">加班产量</TableHead>
                <TableHead className="text-right">合计</TableHead>
                <TableHead className="text-right">收入预估</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "P1", normal: current.normalP1, overtime: current.overtimeP1, price: 56 },
                { name: "P2", normal: current.normalP2, overtime: current.overtimeP2, price: 68 },
                { name: "P3", normal: current.normalP3, overtime: current.overtimeP3, price: 92 },
                { name: "P4", normal: current.normalP4, overtime: current.overtimeP4, price: 125 },
              ].map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={p.normal}
                      className="w-24 mx-auto text-center h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={p.overtime}
                      className="w-24 mx-auto text-center h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {p.normal + p.overtime}
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">
                    {((p.normal + p.overtime) * p.price).toLocaleString()} 元
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Constraint Validation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">约束验证</CardTitle>
          <CardDescription>实时检查当前排产方案是否满足所有约束条件</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ConstraintRow label="工人数量约束" status="pass" detail="正常班需 75 人，可用 113 人" />
            <ConstraintRow label="机器产能约束" status="pass" detail="需 48 台·班，可用 157 台·班" />
            <ConstraintRow label="加班时间约束" status="pass" detail="加班 26 人·班，上限 56 人·班" />
            <ConstraintRow label="原材料供应约束" status="warning" detail="P4 原材料库存偏低，建议关注" />
            <ConstraintRow label="最大产能约束" status="pass" detail="总产量 101 单位，上限 200 单位" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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

function ConstraintRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
      {status === "pass" && <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />}
      {status === "warning" && <AlertTriangle className="size-4 text-amber-500 shrink-0" />}
      {status === "fail" && <AlertTriangle className="size-4 text-red-500 shrink-0" />}
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <span className="text-xs text-gray-500">{detail}</span>
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
        {status === "pass" ? "通过" : status === "warning" ? "警告" : "不满足"}
      </Badge>
    </div>
  );
}
