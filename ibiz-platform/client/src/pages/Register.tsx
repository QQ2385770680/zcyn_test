/**
 * Register — 用户注册页
 * 设计风格：与登录页一致，左侧品牌区 + 右侧注册表单
 */
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, UserPlus, ArrowLeft, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function Register() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("请填写所有必填项");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 个字符");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (result.success) {
      setLocation("/dashboard");
    } else {
      setError(result.error || "注册失败");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Brand Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50">
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
              <p className="text-sm text-gray-500">智能决策辅助系统</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
            加入无双工作室<br />开启智能决策之旅
          </h1>
          <p className="text-gray-500 leading-relaxed mb-8">
            注册账号后即可使用全部基础功能，包括生产模拟、方案设计和方案市场。
          </p>
          <div className="space-y-3">
            <FeatureItem text="免费使用生产模拟和方案设计" />
            <FeatureItem text="保存最多 10 个决策方案" />
            <FeatureItem text="浏览和获取方案市场中的免费方案" />
          </div>
        </div>
      </div>

      {/* Right: Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
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
              <CardTitle className="text-xl">创建账号</CardTitle>
              <CardDescription>注册账号，开始使用智能决策工具</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-100">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">用户名</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="您的名字"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>

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
                      placeholder="至少 6 个字符"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">确认密码</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="再次输入密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      注册中...
                    </span>
                  ) : (
                    <>
                      <UserPlus className="size-4" />
                      注册
                    </>
                  )}
                </Button>
              </form>

              <Separator className="my-5" />

              <p className="text-sm text-gray-500 text-center">
                已有账号？
                <button
                  className="text-emerald-600 hover:text-emerald-700 font-medium ml-1"
                  onClick={() => setLocation("/login")}
                >
                  立即登录
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
        <Check className="size-3 text-emerald-600" />
      </div>
      <span className="text-sm text-gray-600">{text}</span>
    </div>
  );
}
