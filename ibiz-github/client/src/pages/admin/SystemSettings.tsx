/**
 * SystemSettings — 管理员系统设置页
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SystemSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">系统设置</h1>
        <p className="text-sm text-gray-500">配置系统全局参数</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基础设置</CardTitle>
          <CardDescription>配置系统名称和基础参数</CardDescription>
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
    </div>
  );
}
