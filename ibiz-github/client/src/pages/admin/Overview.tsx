/**
 * Admin Overview — 管理后台概览页
 */
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  FileText,
  Activity,
  Database,
  TrendingUp,
} from "lucide-react";

export default function AdminOverview() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">概览</h1>
        <p className="text-sm text-gray-500">系统运行状态一览</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="size-4 text-blue-500" />} label="总用户数" value="24" change="+3 本周" />
        <StatCard icon={<FileText className="size-4 text-emerald-500" />} label="方案总数" value="67" change="+12 本周" />
        <StatCard icon={<Activity className="size-4 text-amber-500" />} label="活跃用户" value="18" change="75%" />
        <StatCard icon={<Database className="size-4 text-pink-500" />} label="模拟次数" value="342" change="+56 今日" />
      </div>

      <Card className="border-dashed border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Activity className="size-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500 mb-1">更多统计图表即将上线</p>
          <p className="text-xs text-gray-400">用户增长趋势、方案使用分析等</p>
        </CardContent>
      </Card>
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
