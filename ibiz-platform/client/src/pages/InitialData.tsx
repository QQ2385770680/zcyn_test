/**
 * InitialData — 初始数据页面
 * 设计风格：清新简洁，表格式数据展示
 * 展示产品参数、机器参数、工人参数等初始数据
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database, Download, Upload, FileSpreadsheet } from "lucide-react";

const productData = [
  { name: "产品 P1", unit: "单位/人·班", normal: 8, overtime: 6, material: 12, price: 56 },
  { name: "产品 P2", unit: "单位/人·班", normal: 6, overtime: 5, material: 18, price: 68 },
  { name: "产品 P3", unit: "单位/人·班", normal: 4, overtime: 3, material: 25, price: 92 },
  { name: "产品 P4", unit: "单位/人·班", normal: 3, overtime: 2, material: 35, price: 125 },
];

const machineData = [
  { type: "A 型机器", count: 80, capacity: "10 单位/班", maintenance: "5%/期", cost: 15000 },
  { type: "B 型机器", count: 50, capacity: "8 单位/班", maintenance: "8%/期", cost: 22000 },
  { type: "C 型机器", count: 27, capacity: "6 单位/班", maintenance: "10%/期", cost: 35000 },
];

const costData = [
  { item: "正常班工资", value: "120 元/人·班" },
  { item: "加班工资", value: "180 元/人·班" },
  { item: "雇佣成本", value: "800 元/人" },
  { item: "解雇成本", value: "1200 元/人" },
  { item: "库存持有成本", value: "2 元/单位·期" },
  { item: "缺货惩罚成本", value: "8 元/单位·期" },
  { item: "机器维护成本", value: "按类型不同" },
];

export default function InitialData() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Database className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">初始数据</h1>
            <p className="text-sm text-gray-500">查看和编辑企业初始状态参数和竞争环境数据</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="size-3.5" />
            导入
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-3.5" />
            导出
          </Button>
        </div>
      </div>

      {/* Product Parameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">产品参数</CardTitle>
              <CardDescription>各产品的生产效率、原材料成本和销售价格</CardDescription>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              <FileSpreadsheet className="size-3 mr-1" />
              4 种产品
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>产品</TableHead>
                <TableHead className="text-right">正常班产能</TableHead>
                <TableHead className="text-right">加班产能</TableHead>
                <TableHead className="text-right">原材料成本</TableHead>
                <TableHead className="text-right">销售价格</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productData.map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{p.normal} {p.unit}</TableCell>
                  <TableCell className="text-right">{p.overtime} {p.unit}</TableCell>
                  <TableCell className="text-right">{p.material} 元/单位</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">{p.price} 元/单位</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Machine Parameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">机器参数</CardTitle>
              <CardDescription>各类型机器的初始数量、产能和维护成本</CardDescription>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
              157 台机器
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>机器类型</TableHead>
                <TableHead className="text-right">初始数量</TableHead>
                <TableHead className="text-right">单班产能</TableHead>
                <TableHead className="text-right">维护率</TableHead>
                <TableHead className="text-right">购置成本</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machineData.map((m) => (
                <TableRow key={m.type}>
                  <TableCell className="font-medium">{m.type}</TableCell>
                  <TableCell className="text-right">{m.count} 台</TableCell>
                  <TableCell className="text-right">{m.capacity}</TableCell>
                  <TableCell className="text-right">{m.maintenance}</TableCell>
                  <TableCell className="text-right">{m.cost.toLocaleString()} 元/台</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cost Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">成本参数</CardTitle>
          <CardDescription>各项运营成本的基准数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {costData.map((c) => (
              <div key={c.item} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
                <span className="text-sm text-gray-600">{c.item}</span>
                <span className="text-sm font-medium text-gray-900">{c.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
