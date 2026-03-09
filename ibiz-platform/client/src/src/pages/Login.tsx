/**
 * Login — 用户登录页
 * 设计风格：清新简洁，左侧品牌区 + 右侧登录表单
 * 延续 wuushuang.com 的白色背景 + 翠绿强调色
 */
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, LogIn, ArrowLeft, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("请填写邮箱和密码");
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      setLocation("/dashboard");
    } else {
      setError(result.error || "登录失败");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        {/* Decorative bubbles */}
        <div className="bubble w-48 h-48 bg-emerald-200 top-[10%] left-[15%]" />
        <div className="bubble w-36 h-36 bg-amber-200 bottom-[20%] right-[10%]" />
        <div className="bubble w-28 h-28 bg-pink-200 top-[50%] left-[60%]" />
        <div className="bubble w-20 h-20 bg-blue-200 bottom-[40%] left-[25%]" />

        <div className="relative z-10 flex flex-col justify-center px-16 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold text-lg">
              iB
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">无双 · iBizSim</h2>
              <p className="text-sm text-gray-500">智能决策系统</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
            让每一次决策<br />都有数据支撑
          </h1>
          <p className="text-gray-500 leading-relaxed mb-8">
            覆盖生产决策的智能参数模拟与最优方案求解，支持多班次产能分析、约束验证与一键优化，助力参赛团队快速制定最优决策。
          </p>
          <div className="flex gap-3">
            <Badge className="bg-emerald-100 text-emerald-700 border-0 py-1 px-3">智能模拟</Badge>
            <Badge className="bg-blue-100 text-blue-700 border-0 py-1 px-3">约束验证</Badge>
            <Badge className="bg-amber-100 text-amber-700 border-0 py-1 px-3">一键优化</Badge>
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Back to home */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-gray-500 -ml-2"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="size-4" />
            返回首页
          </Button>

          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">用户登录</CardTitle>
              <CardDescription>登录您的账号开始使用</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      登录中...
                    </span>
                  ) : (
                    <>
                      <LogIn className="size-4" />
                      登录
                    </>
                  )}
                </Button>

                {/* Demo hint */}
                <div className="bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700 space-y-1">
                  <p className="font-medium">演示账号</p>
                  <p>邮箱：user@ibiz.com &nbsp; 密码：user123</p>
                </div>
              </form>

              <Separator className="my-5" />

              <div className="space-y-3 text-center">
                <p className="text-sm text-gray-500">
                  还没有账号？
                  <button
                    className="text-emerald-600 hover:text-emerald-700 font-medium ml-1"
                    onClick={() => setLocation("/register")}
                  >
                    立即注册
                  </button>
                </p>
                <button
                  className="text-xs text-gray-400 hover:text-gray-500 flex items-center gap-1 mx-auto"
                  onClick={() => setLocation("/admin/login")}
                >
                  <Shield className="size-3" />
                  管理员入口
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
