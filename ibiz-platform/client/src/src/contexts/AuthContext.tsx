/**
 * AuthContext — 认证上下文
 * 管理用户登录状态、角色信息、登录/登出/注册操作
 * 角色：guest（未登录）、user（普通用户）、admin（管理员）
 * 数据持久化到 localStorage
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type UserRole = "guest" | "user" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user database (前端演示用，后续接入真实后端)
const MOCK_USERS: Array<User & { password: string }> = [
  { id: "1", name: "张三", email: "admin@ibiz.com", password: "admin123", role: "admin" },
  { id: "2", name: "李四", email: "user@ibiz.com", password: "user123", role: "user" },
  { id: "3", name: "王五", email: "demo@ibiz.com", password: "demo123", role: "user" },
];

const STORAGE_KEY = "ibiz_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从 localStorage 恢复登录状态
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  // 持久化用户信息
  const persistUser = useCallback((u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // 用户登录
  const login = useCallback(async (email: string, password: string) => {
    // 模拟网络延迟
    await new Promise((r) => setTimeout(r, 600));
    const found = MOCK_USERS.find((u) => u.email === email && u.password === password);
    if (!found) {
      return { success: false, error: "邮箱或密码错误" };
    }
    if (found.role === "admin") {
      return { success: false, error: "管理员请使用管理员入口登录" };
    }
    const { password: _, ...userData } = found;
    persistUser(userData);
    return { success: true };
  }, [persistUser]);

  // 管理员登录
  const adminLogin = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 600));
    const found = MOCK_USERS.find((u) => u.email === email && u.password === password);
    if (!found) {
      return { success: false, error: "邮箱或密码错误" };
    }
    if (found.role !== "admin") {
      return { success: false, error: "该账号没有管理员权限" };
    }
    const { password: _, ...userData } = found;
    persistUser(userData);
    return { success: true };
  }, [persistUser]);

  // 注册
  const register = useCallback(async (name: string, email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 600));
    const exists = MOCK_USERS.find((u) => u.email === email);
    if (exists) {
      return { success: false, error: "该邮箱已被注册" };
    }
    // 模拟注册成功
    const newUser: User = {
      id: String(Date.now()),
      name,
      email,
      role: "user",
    };
    persistUser(newUser);
    return { success: true };
  }, [persistUser]);

  // 登出
  const logout = useCallback(() => {
    persistUser(null);
  }, [persistUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isLoading,
        login,
        adminLogin,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
