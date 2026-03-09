/**
 * GlobalConfig — 全局配置页面
 *
 * 功能：
 * - 设置各产品（A/B/C/D）的机器时、人力时和原材料需求
 * - 自动计算机器系数和人力系数
 * - 点击"保存数据"按钮后缓存到 localStorage
 * - 支持重置为默认值
 * - 支持从剪贴板导入数据一键对应到编辑框并保存
 * - 产品 ABCD 作为列标题，参数作为行
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings2,
  RotateCcw,
  Package,
  Save,
  CheckCircle2,
  ClipboardPaste,
  AlertCircle,
} from "lucide-react";
import React from "react";
import { useConfig } from "@/lib/ConfigContext";
import {
  DEFAULT_PRODUCTS,
  type ProductSpec,
} from "@/lib/data";

// ============================================================
// 剪贴板数据解析器
// ============================================================

interface ParsedProductData {
  machineHours: number[];
  laborHours: number[];
  rawMaterial: number[];
}

/**
 * 智能解析剪贴板文本为产品规格参数
 *
 * 支持的数据格式：
 *
 * 格式1: 带标题的 Tab 分隔（标准格式）
 *   机器（时）	121.0	201.0	259.0	372.0
 *   人力（时）	68.0	109.0	121.0	148.0
 *   原材料（单位）	690.0	1090.0	1900.0	3060.0
 *
 * 格式2: 不带标题的 Tab 分隔（纯数字，3行4列）
 *   121.0	201.0	259.0	372.0
 *   68.0	109.0	121.0	148.0
 *   690.0	1090.0	1900.0	3060.0
 *
 * 格式3: 空格分隔（带或不带标题）
 *   机器（时） 121.0 201.0 259.0 372.0
 *   人力（时） 68.0 109.0 121.0 148.0
 *   原材料（单位） 690.0 1090.0 1900.0 3060.0
 *
 * 格式4: 逗号分隔
 *   121.0,201.0,259.0,372.0
 *   68.0,109.0,121.0,148.0
 *   690.0,1090.0,1900.0,3060.0
 *
 * 格式5: 混合分隔符（Tab + 空格）
 *
 * 标题关键词识别：
 *   机器/machine → machineHours
 *   人力/labor/人工 → laborHours
 *   原材料/material/raw → rawMaterial
 */
function parseClipboardData(text: string): { data: ParsedProductData | null; error: string | null; preview: string } {
  if (!text || !text.trim()) {
    return { data: null, error: "剪贴板内容为空", preview: "" };
  }

  const lines = text.trim().split(/\r?\n/).filter(line => line.trim());

  if (lines.length < 3) {
    return { data: null, error: "至少需要 3 行数据（机器时、人力时、原材料）", preview: "" };
  }

  // 从每行中提取数字
  function extractNumbers(line: string): number[] {
    // 先尝试用 Tab 分隔
    let parts = line.split(/\t/);
    // 如果 Tab 分隔后只有一个部分，尝试逗号分隔
    if (parts.length <= 1) {
      parts = line.split(/,/);
    }
    // 如果还是只有一个部分，尝试多空格分隔
    if (parts.length <= 1) {
      parts = line.split(/\s+/);
    }

    // 从 parts 中提取所有数字
    const numbers: number[] = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const num = parseFloat(trimmed);
      if (!isNaN(num) && isFinite(num)) {
        numbers.push(num);
      }
    }
    return numbers;
  }

  // 标题关键词匹配
  function detectRowType(line: string): "machine" | "labor" | "material" | null {
    const lower = line.toLowerCase();
    if (/机器|machine/.test(lower)) return "machine";
    if (/人力|labor|人工/.test(lower)) return "labor";
    if (/原材料|material|raw|原料/.test(lower)) return "material";
    return null;
  }

  // 尝试解析：先检测是否有标题行
  const result: ParsedProductData = {
    machineHours: [],
    laborHours: [],
    rawMaterial: [],
  };

  // 策略1: 带标题的行（通过关键词识别）
  let hasLabels = false;
  const labeledRows: { type: "machine" | "labor" | "material"; numbers: number[] }[] = [];

  for (const line of lines) {
    const rowType = detectRowType(line);
    const numbers = extractNumbers(line);
    if (rowType && numbers.length >= 4) {
      hasLabels = true;
      labeledRows.push({ type: rowType, numbers: numbers.slice(0, 4) });
    }
  }

  if (hasLabels && labeledRows.length >= 3) {
    // 使用标题匹配的结果
    for (const row of labeledRows) {
      if (row.type === "machine") result.machineHours = row.numbers;
      if (row.type === "labor") result.laborHours = row.numbers;
      if (row.type === "material") result.rawMaterial = row.numbers;
    }
  } else {
    // 策略2: 无标题，按行顺序解析（第1行=机器时，第2行=人力时，第3行=原材料）
    const dataRows: number[][] = [];
    for (const line of lines) {
      const numbers = extractNumbers(line);
      if (numbers.length >= 4) {
        dataRows.push(numbers.slice(0, 4));
      }
    }

    if (dataRows.length < 3) {
      return {
        data: null,
        error: `无法解析出足够的数据行。需要至少 3 行（每行 4 个数字），当前仅解析到 ${dataRows.length} 行有效数据。`,
        preview: "",
      };
    }

    result.machineHours = dataRows[0];
    result.laborHours = dataRows[1];
    result.rawMaterial = dataRows[2];
  }

  // 验证数据完整性
  if (result.machineHours.length < 4 || result.laborHours.length < 4 || result.rawMaterial.length < 4) {
    return {
      data: null,
      error: "每行需要至少 4 个数字（对应产品 A/B/C/D）",
      preview: "",
    };
  }

  // 验证数据合理性（所有值应为正数）
  const allValues = [...result.machineHours, ...result.laborHours, ...result.rawMaterial];
  if (allValues.some(v => v <= 0)) {
    return {
      data: null,
      error: "所有参数值必须为正数",
      preview: "",
    };
  }

  // 生成预览
  const productNames = ["A", "B", "C", "D"];
  const preview = [
    `机器时: ${result.machineHours.map((v, i) => `${productNames[i]}=${v}`).join(", ")}`,
    `人力时: ${result.laborHours.map((v, i) => `${productNames[i]}=${v}`).join(", ")}`,
    `原材料: ${result.rawMaterial.map((v, i) => `${productNames[i]}=${v}`).join(", ")}`,
  ].join("\n");

  return { data: result, error: null, preview };
}

// ============================================================
// 组件
// ============================================================

export default function GlobalConfig() {
  const { config, updateConfig, isDirty } = useConfig();
  const [showSaved, setShowSaved] = React.useState(false);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [importText, setImportText] = React.useState("");
  const [parseResult, setParseResult] = React.useState<{
    data: ParsedProductData | null;
    error: string | null;
    preview: string;
  }>({ data: null, error: null, preview: "" });

  // 更新产品规格（仅更新本地状态，不立即保存）
  const updateProduct = (index: number, field: keyof ProductSpec, value: number) => {
    const newProducts = [...config.products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    updateConfig({ products: newProducts });
  };

  // 保存数据（手动触发缓存）
  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  // 重置产品规格为默认值
  const resetProducts = () => {
    updateConfig({ products: DEFAULT_PRODUCTS.map((p) => ({ ...p })) });
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  // 打开导入对话框
  const handleOpenImport = () => {
    setImportText("");
    setParseResult({ data: null, error: null, preview: "" });
    setImportDialogOpen(true);
  };

  // 从剪贴板粘贴
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setImportText(text);
      const result = parseClipboardData(text);
      setParseResult(result);
    } catch {
      // 如果剪贴板 API 不可用，提示用户手动粘贴
      setParseResult({ data: null, error: "无法访问剪贴板，请手动粘贴数据到下方文本框", preview: "" });
    }
  };

  // 文本框内容变化时实时解析
  const handleImportTextChange = (text: string) => {
    setImportText(text);
    if (text.trim()) {
      const result = parseClipboardData(text);
      setParseResult(result);
    } else {
      setParseResult({ data: null, error: null, preview: "" });
    }
  };

  // 确认导入
  const handleConfirmImport = () => {
    if (!parseResult.data) return;

    const { machineHours, laborHours, rawMaterial } = parseResult.data;
    const newProducts: ProductSpec[] = config.products.map((p, i) => ({
      ...p,
      machineHours: Math.round(machineHours[i]),
      laborHours: Math.round(laborHours[i]),
      rawMaterial: Math.round(rawMaterial[i]),
    }));

    updateConfig({ products: newProducts });
    setImportDialogOpen(false);
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpenImport}>
                <ClipboardPaste className="size-3.5" />
                剪贴板导入
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={resetProducts}>
                <RotateCcw className="size-3.5" />
                恢复默认
              </Button>
            </div>
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

      {/* 剪贴板导入对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPaste className="size-4" />
              从剪贴板导入产品规格参数
            </DialogTitle>
            <DialogDescription>
              粘贴产品规格数据，系统会自动识别并解析。支持 Tab/空格/逗号分隔，支持带标题或纯数字格式。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 一键粘贴按钮 */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handlePasteFromClipboard}
            >
              <ClipboardPaste className="size-4" />
              从剪贴板粘贴
            </Button>

            {/* 手动输入文本框 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                或手动粘贴数据：
              </label>
              <Textarea
                placeholder={`支持的格式示例：\n\n机器（时）\t121.0\t201.0\t259.0\t372.0\n人力（时）\t68.0\t109.0\t121.0\t148.0\n原材料（单位）\t690.0\t1090.0\t1900.0\t3060.0\n\n或纯数字（3行4列）：\n121 201 259 372\n68 109 121 148\n690 1090 1900 3060`}
                value={importText}
                onChange={(e) => handleImportTextChange(e.target.value)}
                className="h-36 text-sm font-mono"
              />
            </div>

            {/* 解析结果 */}
            {parseResult.error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>{parseResult.error}</span>
              </div>
            )}

            {parseResult.data && parseResult.preview && (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                  <span>数据解析成功！</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">解析预览：</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 px-2 text-gray-500">参数</th>
                        <th className="text-center py-1.5 px-2 text-red-600">A</th>
                        <th className="text-center py-1.5 px-2 text-blue-600">B</th>
                        <th className="text-center py-1.5 px-2 text-amber-600">C</th>
                        <th className="text-center py-1.5 px-2 text-purple-600">D</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-1.5 px-2 text-gray-600">机器时</td>
                        {parseResult.data.machineHours.map((v, i) => (
                          <td key={i} className="py-1.5 px-2 text-center font-mono">{Math.round(v)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-1.5 px-2 text-gray-600">人力时</td>
                        {parseResult.data.laborHours.map((v, i) => (
                          <td key={i} className="py-1.5 px-2 text-center font-mono">{Math.round(v)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="py-1.5 px-2 text-gray-600">原材料</td>
                        {parseResult.data.rawMaterial.map((v, i) => (
                          <td key={i} className="py-1.5 px-2 text-center font-mono">{Math.round(v)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              取消
            </Button>
            <Button
              disabled={!parseResult.data}
              onClick={handleConfirmImport}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="size-3.5" />
              确认导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
