/**
 * GlobalConfig — 全局配置页面
 *
 * 功能：
 * - 设置初始机器数量、初始工人数量、模拟期数
 * - 设置人力资源参数（解雇比例、雇佣比例、新工人效率）
 * - 设置产品规格参数（A/B/C/D 的机器时/人力时/原材料）
 * - 所有配置自动持久化到 localStorage
 * - 支持重置为默认值
 *
 * 设计风格：清新简洁，卡片式布局，翠绿主色调
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings2, RotateCcw, Save, CheckCircle2, Package } from "lucide-react";
import React from "react";
import { useConfig } from "@/lib/ConfigContext";
import { DEFAULT_PRODUCTS, type ProductSpec } from "@/lib/data";

export default function GlobalConfig() {
  const { config, updateConfig, resetConfig, isDirty } = useConfig();
  const [showSaved, setShowSaved] = React.useState(false);

  // 保存提示（配置实际上已自动保存，这里只是视觉反馈）
  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  // 更新产品规格
  const updateProduct = (index: number, field: keyof ProductSpec, value: number) => {
    const newProducts = [...config.products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    updateConfig({ products: newProducts });
  };

  // 重置产品规格为默认值
  const resetProducts = () => {
    updateConfig({ products: DEFAULT_PRODUCTS.map((p) => ({ ...p })) });
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面头部 */}
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
        <div className="flex items-center gap-2">
          {isDirty && (
            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
              已修改
            </Badge>
          )}
          {showSaved && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="size-3 mr-1" />
              已保存
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={resetConfig}>
            <RotateCcw className="size-3.5" />
            重置默认
          </Button>
          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
            <Save className="size-3.5" />
            保存配置
          </Button>
        </div>
      </div>

      {/* 基础参数 */}
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
                value={config.initialMachines}
                onChange={(e) => updateConfig({ initialMachines: parseInt(e.target.value) || 0 })}
                className="field-required"
              />
              <p className="text-xs text-gray-400">企业初始拥有的机器台数（默认: 157）</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">
                初始工人数量
                <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">必填</Badge>
              </Label>
              <Input
                type="number"
                value={config.initialWorkers}
                onChange={(e) => updateConfig({ initialWorkers: parseInt(e.target.value) || 0 })}
                className="field-required"
              />
              <p className="text-xs text-gray-400">企业初始拥有的工人人数（默认: 113）</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">模拟期数</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[config.periods]}
                  onValueChange={([v]) => updateConfig({ periods: v })}
                  min={1}
                  max={20}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 w-8 text-right">{config.periods}</span>
              </div>
              <p className="text-xs text-gray-400">默认: 8 (范围: 1-20)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 人力资源参数 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">人力资源参数</CardTitle>
          <CardDescription>设置解雇比例、最大雇佣比例和新工人效率</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label className="text-sm">最低解雇比例</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[config.minFireRate]}
                  onValueChange={([v]) => updateConfig({ minFireRate: v })}
                  min={0}
                  max={20}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 w-10 text-right">{config.minFireRate}%</span>
              </div>
              <p className="text-xs text-gray-400">默认: 3%（每期最少解雇比例）</p>
            </div>
            <div className="space-y-3">
              <Label className="text-sm">最大雇佣比例</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[config.maxHireRate]}
                  onValueChange={([v]) => updateConfig({ maxHireRate: v })}
                  min={0}
                  max={100}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 w-10 text-right">{config.maxHireRate}%</span>
              </div>
              <p className="text-xs text-gray-400">默认: 50%（期初人数的50%）</p>
            </div>
            <div className="space-y-3">
              <Label className="text-sm">新工人效率</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[config.newWorkerEfficiency]}
                  onValueChange={([v]) => updateConfig({ newWorkerEfficiency: v })}
                  min={0}
                  max={100}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-700 w-10 text-right">{config.newWorkerEfficiency}%</span>
              </div>
              <p className="text-xs text-gray-400">默认: 25%（新雇佣工人的产能效率）</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 产品规格参数 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-4 text-purple-500" />
                产品规格参数
              </CardTitle>
              <CardDescription>设置各产品的机器时、人力时和原材料需求（每个工作时间单位 = 520 小时）</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={resetProducts}>
              <RotateCcw className="size-3.5" />
              恢复默认
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 w-16">产品</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">机器时 (时/单位)</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">人力时 (时/单位)</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">原材料 (元/单位)</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">机器系数</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500">人力系数</th>
                </tr>
              </thead>
              <tbody>
                {config.products.map((product, index) => {
                  const isModified =
                    product.machineHours !== DEFAULT_PRODUCTS[index]?.machineHours ||
                    product.laborHours !== DEFAULT_PRODUCTS[index]?.laborHours ||
                    product.rawMaterial !== DEFAULT_PRODUCTS[index]?.rawMaterial;
                  return (
                    <tr key={product.name} className="border-b border-gray-50">
                      <td className="py-2 px-3">
                        <span className="font-semibold text-gray-700">{product.name}</span>
                        {isModified && (
                          <Badge className="ml-1.5 text-[9px] px-1 py-0 bg-purple-100 text-purple-700 border-0">
                            已改
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          value={product.machineHours}
                          onChange={(e) => updateProduct(index, "machineHours", parseInt(e.target.value) || 0)}
                          className="w-24 mx-auto text-center h-8 text-sm"
                          min={1}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          value={product.laborHours}
                          onChange={(e) => updateProduct(index, "laborHours", parseInt(e.target.value) || 0)}
                          className="w-24 mx-auto text-center h-8 text-sm"
                          min={1}
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          value={product.rawMaterial}
                          onChange={(e) => updateProduct(index, "rawMaterial", parseInt(e.target.value) || 0)}
                          className="w-24 mx-auto text-center h-8 text-sm"
                          min={0}
                        />
                      </td>
                      <td className="py-2 px-3 text-center text-gray-500 font-mono text-xs">
                        {(product.machineHours / 520).toFixed(4)}
                      </td>
                      <td className="py-2 px-3 text-center text-gray-500 font-mono text-xs">
                        {(product.laborHours / 520).toFixed(4)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            机器系数 = 机器时 ÷ 520，人力系数 = 人力时 ÷ 520。修改产品参数后，所有排产计算将实时联动更新。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
