/**
 * PlanManagement — 管理员方案管理页
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockAdminPlans = [
  { id: "1", name: "全期最优利润方案 v2.1", author: "王五", status: "published", downloads: 256, reports: 0 },
  { id: "2", name: "低风险稳健方案", author: "李四", status: "review", downloads: 128, reports: 1 },
  { id: "3", name: "激进扩产方案", author: "张三", status: "published", downloads: 64, reports: 0 },
];

const planStatusConfig: Record<string, { label: string; className: string }> = {
  published: { label: "已发布", className: "text-emerald-600 border-emerald-200 bg-emerald-50" },
  review: { label: "审核中", className: "text-amber-600 border-amber-200 bg-amber-50" },
  rejected: { label: "已拒绝", className: "text-red-600 border-red-200 bg-red-50" },
};

export default function PlanManagement() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">方案管理</h1>
        <p className="text-sm text-gray-500">审核和管理用户提交的方案</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input placeholder="搜索方案..." className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>方案名称</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">下载量</TableHead>
                <TableHead className="text-right">举报</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockAdminPlans.map((p) => {
                const sc = planStatusConfig[p.status];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm text-gray-500">{p.author}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{p.downloads}</TableCell>
                    <TableCell className="text-right">
                      {p.reports > 0 ? (
                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">{p.reports}</Badge>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>查看详情</DropdownMenuItem>
                          <DropdownMenuItem>通过审核</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive">下架</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
