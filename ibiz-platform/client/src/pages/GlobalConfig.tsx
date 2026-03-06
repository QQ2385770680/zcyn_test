/**
 * GlobalConfig — 全局配置页面
 *
 * 重构后仅保留产品规格参数配置：
 * - 设置各产品（A/B/C/D）的机器时、人力时和原材料需求
 * - 自动计算机器系数和人力系数
 * - 所有配置自动持久化到 localStorage
 * - 支持重置为默认值
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings2,
  RotateCcw,
  Package,
  CheckCircle2,
} from "lucide-react";
import React from "react";
import { useConfig } from "@/lib/ConfigContext";
import {
  DEFAULT_PRODUCTS,
  type ProductSpec,
} from "@/lib/data";

export default function GlobalConfig() {
  const { config, updateConfig, isDirty } = useConfig();
  const [showSaved, setShowSaved] = React.useState(false);

  // 更新产品规格
  const updateProduct = (index: number, field: keyof ProductSpec, value: number) => {
    const newProducts = [...config.products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    updateConfig({ products: newProducts });
  };

  // 重置产品规格为默认值
  const resetProducts = () => {
    updateConfig({ products: DEFAULT_PRODUCTS.map((p) => ({ ...p })) });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
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
            <p className="text-sm text-gray-500">设置产品规格参数，影响所有决策域的排产计算</p>
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
              已重置
            </Badge>
          )}
        </div>
      </div>

      {/* 产品规格参数 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-4 text-purple-500" />
                产品规格参数
              </CardTitle>
              <CardDescription>
                设置各产品的机器时、人力时和原材料需求。每个工作时间单位 = 520 小时。修改后所有排产计算将实时联动更新。
              </CardDescription>
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
                  <th className="text-center py-2 px-3 font-medium text-gray-500">原材料 (单位)</th>
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
                    <tr key={product.name} className="border-b border-gray-50 hover:bg-gray-50/50">
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
            机器系数 = 机器时 / 520，人力系数 = 人力时 / 520。系数用于约束检查计算。
          </p>
        </CardContent>
      </Card>

      {/* 参数说明卡片 */}
      <Card className="bg-gray-50/50">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">参数说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
            <div>
              <p className="font-medium text-gray-600 mb-1">机器时</p>
              <p>生产一个单位产品所需的机器工作时间（小时）。机器时越高，消耗的机器产能越多。</p>
            </div>
            <div>
              <p className="font-medium text-gray-600 mb-1">人力时</p>
              <p>生产一个单位产品所需的人力工作时间（小时）。人力时越高，消耗的工人产能越多。</p>
            </div>
            <div>
              <p className="font-medium text-gray-600 mb-1">原材料</p>
              <p>生产一个单位产品所需的原材料数量。用于计算原材料成本。</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
