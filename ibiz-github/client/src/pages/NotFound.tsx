/**
 * NotFound — 404 页面
 * 使用 window.location 跳转避免 nest 模式下路径问题
 */
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-8xl font-bold text-gray-200 mb-4">404</div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">页面未找到</h1>
      <p className="text-sm text-gray-500 mb-6">您访问的页面不存在或已被移除</p>
      <Button
        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        onClick={() => { window.location.href = "/"; }}
      >
        <ArrowLeft className="size-4" />
        返回首页
      </Button>
    </div>
  );
}
