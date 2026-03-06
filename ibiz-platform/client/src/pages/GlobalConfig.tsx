/**
 * GlobalConfig — 全局配置页面
 *
 * 重构后仅保留产品规格参数配置：
 * - 设置各产品（A/B/C/D）的机器时、人力时和原材料需求
 * - 自动计算机器系数和人力系数
 * - 点击"保存数据"按钮后缓存到 localStorage
 * - 支持重置为默认值
 * - 产品 ABCD 作为列标题，参数作为行
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings2,
  RotateCcw,
  Package,
  Save,
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

  // 更新产品规格（仅更新本地状态，不立即保存）
  const updateProduct = (index: number, field: keyof ProductSpec, value: number) => {
    const newProducts = [...config.products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    updateConfig({ products: newProducts });
  };

  // 保存数据（手动触发缓存）
  const handleSave = () => {
    // ConfigContext 的 useEffect 已自动保存到 localStorage
    // 这里只需显示保存成功提示
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  // 重置产品规格为默认值
  const resetProducts = () => {
    updateConfig({ products: DEFAULT_PRODUCTS.map((p) => ({ ...p })) });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  // 参数行定义
  const paramRows: {
    label: string;
    field: keyof ProductSpec | null;
    unit: string;
    editable: boolean;
    getValue: (product: ProductSpec) => string | number;
  }[] = [
    {
      label: "机器时",
      field: "machineHours",
      unit: "时/单位",
      editable: true,
      getValue: (p) => p.machineHours,
    },
    {
      label: "人力时",
      field: "laborHours",
      unit: "时/单位",
      editable: true,
      getValue: (p) => p.laborHours,
    },
    {
      label: "原材料",
      field: "rawMaterial",
      unit: "单位",
      editable: true,
      getValue: (p) => p.rawMaterial,
    },
    {
      label: "机器系数",
      field: null,
      unit: "",
      editable: false,
      getValue: (p) => (p.machineHours / 520).toFixed(4),
    },
    {
      label: "人力系数",
      field: null,
      unit: "",
      editable: false,
      getValue: (p) => (p.laborHours / 520).toFixed(4),
    },
  ];

  // 产品颜色
  const productColors = [
    "text-red-600 bg-red-50 border-red-200",
    "text-blue-600 bg-blue-50 border-blue-200",
    "text-amber-600 bg-amber-50 border-amber-200",
    "text-purple-600 bg-purple-50 border-purple-200",
  ];

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
          {showSaved && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="size-3 mr-1" />
              已保存
            </Badge>
          )}
          {isDirty ? (
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
              <Save className="size-3.5" />
              保存数据
            </Button>
          ) : (
            <Badge variant="outline" className="text-gray-400 border-gray-200 bg-gray-50">
              无修改
            </Badge>
          )}
        </div>
      </div>

      {/* 产品规格参数 — 转置表格：ABCD 作为列标题 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-4 text-purple-500" />
                产品规格参数
              </CardTitle>
              <CardDescription>
                设置各产品的机器时、人力时和原材料需求。每个工作时间单位 = 520 小时。修改后点击"保存数据"缓存配置。
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
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 w-28">参数</th>
                  {config.products.map((product, idx) => (
                    <th key={product.name} className="text-center py-2.5 px-3 font-medium">
                      <Badge variant="outline" className={`text-sm font-bold px-3 py-0.5 ${productColors[idx]}`}>
                        产品 {product.name}
                      </Badge>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paramRows.map((row) => (
                  <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-medium text-gray-700">{row.label}</span>
                      {row.unit && (
                        <span className="text-xs text-gray-400 ml-1">({row.unit})</span>
                      )}
                    </td>
                    {config.products.map((product, index) => (
                      <td key={product.name} className="py-2.5 px-3 text-center">
                        {row.editable && row.field ? (
                          <Input
                            type="number"
                            value={row.getValue(product)}
                            onChange={(e) => updateProduct(index, row.field!, parseInt(e.target.value) || 0)}
                            className="w-24 mx-auto text-center h-8 text-sm"
                            min={row.field === "rawMaterial" ? 0 : 1}
                          />
                        ) : (
                          <span className="text-gray-500 font-mono text-xs">
                            {row.getValue(product)}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
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
