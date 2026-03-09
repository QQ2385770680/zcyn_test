/**
 * UserManagement — 管理员用户管理页
 */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  MoreHorizontal,
  UserPlus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockUsers = [
  { id: "1", name: "张三", email: "zhangsan@example.com", role: "admin", plans: 5, lastActive: "1 小时前" },
  { id: "2", name: "李四", email: "lisi@example.com", role: "user", plans: 3, lastActive: "2 天前" },
  { id: "3", name: "王五", email: "wangwu@example.com", role: "user", plans: 8, lastActive: "刚刚" },
  { id: "4", name: "赵六", email: "zhaoliu@example.com", role: "pro", plans: 12, lastActive: "5 小时前" },
];

const roleConfig: Record<string, { label: string; className: string }> = {
  admin: { label: "管理员", className: "text-red-600 border-red-200 bg-red-50" },
  user: { label: "免费用户", className: "text-gray-600 border-gray-200 bg-gray-50" },
  pro: { label: "Pro 用户", className: "text-amber-600 border-amber-200 bg-amber-50" },
};

export default function UserManagement() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">用户管理</h1>
        <p className="text-sm text-gray-500">管理系统中的所有用户</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input placeholder="搜索用户..." className="pl-9" />
        </div>
        <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <UserPlus className="size-3.5" />
          添加用户
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>角色</TableHead>
                <TableHead className="text-right">方案数</TableHead>
                <TableHead>最近活跃</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((u) => {
                const rc = roleConfig[u.role];
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={rc.className}>{rc.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{u.plans}</TableCell>
                    <TableCell className="text-sm text-gray-500">{u.lastActive}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>编辑</DropdownMenuItem>
                          <DropdownMenuItem>重置密码</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive">禁用</DropdownMenuItem>
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
