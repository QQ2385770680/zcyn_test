/**
 * Admin — 管理后台页面
 * 设计风格：清新简洁，卡片式统计 + 表格管理
 * 包含：用户管理、方案管理、系统设置
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Shield,
  Users,
  FileText,
  Settings,
  Search,
  MoreHorizontal,
  UserPlus,
  TrendingUp,
  Activity,
  Database,
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

const mockAdminPlans = [
  { id: "1", name: "全期最优利润方案 v2.1", author: "王五", status: "published", downloads: 256, reports: 0 },
  { id: "2", name: "低风险稳健方案", author: "李四", status: "review", downloads: 128, reports: 1 },
  { id: "3", name: "激进扩产方案", author: "张三", status: "published", downloads: 64, reports: 0 },
];

const roleConfig: Record<string, { label: string; className: string }> = {
  admin: { label: "管理员", className: "text-red-600 border-red-200 bg-red-50" },
  user: { label: "免费用户", className: "text-gray-600 border-gray-200 bg-gray-50" },
  pro: { label: "Pro 用户", className: "text-amber-600 border-amber-200 bg-amber-50" },
};

const planStatusConfig: Record<string, { label: string; className: string }> = {
  published: { label: "已发布", className: "text-emerald-600 border-emerald-200 bg-emerald-50" },
  review: { label: "审核中", className: "text-amber-600 border-amber-200 bg-amber-50" },
  rejected: { label: "已拒绝", className: "text-red-600 border-red-200 bg-red-50" },
};

export default function Admin() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
          <Shield className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">管理后台</h1>
          <p className="text-sm text-gray-500">管理用户、方案和系统设置</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="size-4 text-blue-500" />} label="总用户数" value="24" change="+3 本周" />
        <StatCard icon={<FileText className="size-4 text-emerald-500" />} label="方案总数" value="67" change="+12 本周" />
        <StatCard icon={<Activity className="size-4 text-amber-500" />} label="活跃用户" value="18" change="75%" />
        <StatCard icon={<Database className="size-4 text-pink-500" />} label="模拟次数" value="342" change="+56 今日" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="bg-gray-100/80">
          <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5">
            <Users className="size-3.5" />
            用户管理
          </TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5">
            <FileText className="size-3.5" />
            方案管理
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5">
            <Settings className="size-3.5" />
            系统设置
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
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
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-4 space-y-4">
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
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">系统设置</CardTitle>
              <CardDescription>配置系统全局参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">系统名称</label>
                  <Input defaultValue="iBizSim 智能决策辅助系统" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">最大模拟期数</label>
                  <Input type="number" defaultValue="20" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">默认用户方案上限</label>
                  <Input type="number" defaultValue="10" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pro 用户方案上限</label>
                  <Input type="number" defaultValue="50" />
                </div>
              </div>
              <div className="pt-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700">保存设置</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  change,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
}) {
  return (
    <Card className="border-gray-100">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
          <TrendingUp className="size-3" />
          {change}
        </div>
      </CardContent>
    </Card>
  );
}
