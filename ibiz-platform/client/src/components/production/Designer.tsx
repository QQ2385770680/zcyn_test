/**
 * ProductionDesigner — 方案设计
 * 设计风格：清新简洁，表单式方案配置
 * 功能：创建/编辑生产方案，设置优化目标和约束条件
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wand2,
  Save,
  Plus,
  Target,
  Shield,
  Sparkles,
} from "lucide-react";
import React from "react";

export function ProductionDesigner() {
  const [planName, setPlanName] = React.useState("");
  const [objective, setObjective] = React.useState("max-profit");
  const [autoBalance, setAutoBalance] = React.useState(true);
  const [isOptimizing, setIsOptimizing] = React.useState(false);

  const handleOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => setIsOptimizing(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            新建方案
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
            onClick={handleOptimize}
            disabled={isOptimizing}
          >
            <Wand2 className="size-3.5" />
            {isOptimizing ? "求解中..." : "一键优化"}
          </Button>
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Save className="size-3.5" />
            保存方案
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-500" />
            方案基本信息
          </CardTitle>
          <CardDescription>设置方案名称和描述信息</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm">方案名称</Label>
              <Input
                placeholder="例如：第3期最优排产方案"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">方案描述</Label>
              <Textarea
                placeholder="描述该方案的策略和目标..."
                className="min-h-[38px] resize-none"
                rows={1}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Objective */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="size-4 text-blue-500" />
            优化目标
          </CardTitle>
          <CardDescription>选择方案的优化方向和目标函数</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm">目标函数</Label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="max-profit">最大化利润</SelectItem>
                  <SelectItem value="min-cost">最小化成本</SelectItem>
                  <SelectItem value="max-revenue">最大化收入</SelectItem>
                  <SelectItem value="max-utilization">最大化利用率</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">优化范围</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有期数</SelectItem>
                  <SelectItem value="current">仅当前期</SelectItem>
                  <SelectItem value="remaining">剩余期数</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Constraints */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4 text-amber-500" />
            约束条件
          </CardTitle>
          <CardDescription>配置方案需要满足的约束条件</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ConstraintToggle
              label="自动平衡产能"
              description="自动调整各产品产量以平衡工人和机器利用率"
              checked={autoBalance}
              onChange={setAutoBalance}
            />
            <ConstraintToggle
              label="库存安全约束"
              description="确保每期末库存不低于安全库存水平"
              checked={true}
              onChange={() => {}}
            />
            <ConstraintToggle
              label="加班限制"
              description="限制加班工时不超过正常工时的 50%"
              checked={true}
              onChange={() => {}}
            />
            <ConstraintToggle
              label="需求满足约束"
              description="优先满足市场需求预测，减少缺货惩罚"
              checked={false}
              onChange={() => {}}
            />
          </div>
        </CardContent>
      </Card>

      {/* Optimization Result Preview */}
      <Card className="border-dashed border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mb-4">
            <Wand2 className="size-6 text-purple-400" />
          </div>
          <p className="text-sm text-gray-500 mb-1">点击「一键优化」生成最优排产方案</p>
          <p className="text-xs text-gray-400">系统将根据您设置的目标和约束自动求解</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ConstraintToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
      <div className="space-y-0.5">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
