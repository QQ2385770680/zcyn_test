/**
 * GlobalConfig — 全局配置页面
 * 设计风格：清新简洁，卡片式布局，延续 wuushuang.com 的滑块和输入框风格
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings2, RotateCcw, Save } from "lucide-react";
import React from "react";

export default function GlobalConfig() {
  const [machines, setMachines] = React.useState("157");
  const [workers, setWorkers] = React.useState("113");
  const [periods, setPeriods] = React.useState(8);
  const [fireMin, setFireMin] = React.useState(3);
  const [fireMax, setFireMax] = React.useState(10);
  const [maxHire, setMaxHire] = React.useState(50);
  const [newEfficiency, setNewEfficiency] = React.useState(25);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Settings2 className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">全局配置</h1>
            <p className="text-sm text-gray-500">设置模拟的全局参数，影响所有决策域的计算</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <RotateCcw className="size-3.5" />
            重置默认
          </Button>
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            <Save className="size-3.5" />
            保存配置
          </Button>
        </div>
      </div>

      {/* Basic Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">基础参数</CardTitle>
          <CardDescription>设置企业初始的机器数量、工人数量和模拟期数</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-sm">
                初始机器数量
                <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">必填</Badge>
              </Label>
              <Input
                type="number"
                value={machines}
                onChange={(e) => setMachines(e.target.value)}
                className="field-required"
              />
              <p className="text-xs text-gray-400">企业初始拥有的机器台数</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">
                初始工人数量
                <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">必填</Badge>
              </Label>
              <Input
                type="number"
                value={workers}
                onChange={(e) => setWorkers(e.target.value)}
                className="field-required"
              />
              <p className="text-xs text-gray-400">企业初始拥有的工人人数</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">模拟期数</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[periods]}
                  onValueChange={([v]) => setPeriods(v)}
                  min={1}
                  max={20}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 w-8 text-right">{periods}</span>
              </div>
              <p className="text-xs text-gray-400">默认: 8 (范围: 1-20)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* HR Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">人力资源参数</CardTitle>
          <CardDescription>设置解雇比例范围、最大雇佣比例和新工人效率</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label className="text-sm">解雇比例范围</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-8">最低</span>
                  <Slider
                    value={[fireMin]}
                    onValueChange={([v]) => setFireMin(v)}
                    min={0}
                    max={20}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-gray-700 w-10 text-right">{fireMin}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-8">最高</span>
                  <Slider
                    value={[fireMax]}
                    onValueChange={([v]) => setFireMax(v)}
                    min={0}
                    max={30}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-gray-700 w-10 text-right">{fireMax}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-400">默认: 3%~10%</p>
            </div>
            <div className="space-y-3">
              <Label className="text-sm">最大雇佣比例</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[maxHire]}
                  onValueChange={([v]) => setMaxHire(v)}
                  min={0}
                  max={100}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 w-10 text-right">{maxHire}%</span>
              </div>
              <p className="text-xs text-gray-400">默认: 50%（期初人数的50%）</p>
            </div>
            <div className="space-y-3">
              <Label className="text-sm">新工人效率</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[newEfficiency]}
                  onValueChange={([v]) => setNewEfficiency(v)}
                  min={0}
                  max={100}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 w-10 text-right">{newEfficiency}%</span>
              </div>
              <p className="text-xs text-gray-400">默认: 25%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
