/**
 * AdminLogin — 管理员登录页
 * 设计风格：深色调管理员专属入口，与用户登录页区分
 */
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const { adminLogin } = useAuth();
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
    const result = await adminLogin(email, password);
    setLoading(false);
    if (result.success) {
      setLocation("/admin");
    } else {
      setError(result.error || "登录失败");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 relative overflow-hidden">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute w-64 h-64 rounded-full bg-emerald-500/5 top-[10%] left-[10%] blur-3xl" />
        <div className="absolute w-48 h-48 rounded-full bg-blue-500/5 bottom-[20%] right-[15%] blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-gray-400 hover:text-gray-300 -ml-2"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="size-4" />
          返回首页
        </Button>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Shield className="size-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">管理员登录</CardTitle>
                <CardDescription className="text-gray-400">iBizSim 系统管理后台</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 text-red-400 text-sm px-3 py-2 rounded-lg border border-red-500/20">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-gray-300">管理员邮箱</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@ibiz.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-gray-300">密码</Label>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="输入管理员密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 focus:border-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
                    验证中...
                  </span>
                ) : (
                  <>
                    <Shield className="size-4" />
                    管理员登录
                  </>
                )}
              </Button>

              {/* Demo hint */}
              <div className="bg-emerald-500/10 rounded-lg p-3 text-xs text-emerald-300 space-y-1 border border-emerald-500/20">
                <p className="font-medium">演示账号</p>
                <p>邮箱：admin@ibiz.com &nbsp; 密码：admin123</p>
              </div>
            </form>

            <div className="mt-5 text-center">
              <button
                className="text-sm text-gray-500 hover:text-gray-300"
                onClick={() => setLocation("/login")}
              >
                普通用户登录
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
