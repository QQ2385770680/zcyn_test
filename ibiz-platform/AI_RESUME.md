# iBizSim 智能决策辅助系统 — AI 指挥官恢复指令

> 本文档是给下一任 AI 指挥官的完整交接手册。请在接手任务后**首先阅读本文件**，按照步骤恢复项目环境并继续开发。

---

## 一、项目概述

**项目名称**：iBizSim 智能决策辅助系统（前端）

**项目定位**：为 iBizSim 企业竞争模拟大赛参赛团队提供智能决策辅助工具，覆盖生产决策域的参数模拟、约束验证与最优方案求解。

**技术栈**：React 19 + Tailwind CSS 4 + shadcn/ui + Wouter 路由（nest 模式） + Vite

**设计风格**：延续 [wuushuang.com](https://www.wuushuang.com/) 的清新简洁风格 — 纯白背景、翠绿主色调（emerald-600）、彩色气泡装饰、功能色彩编码、卡片式布局、轻量边框、微妙阴影。

---

## 二、代码获取

### 2.1 GitHub 仓库

```bash
gh repo clone QQ2385770680/zcyn_test
cd zcyn_test/ibiz-platform
```

前端项目代码位于仓库的 `ibiz-platform/` 目录下。

### 2.2 Manus Webdev 项目

如果在 Manus 沙箱环境中工作，项目路径为：

```
/home/ubuntu/ibiz-platform
```

该项目通过 `webdev_init_project` 初始化，项目名 `ibiz-platform`。

---

## 三、环境搭建

### 3.1 安装依赖

```bash
cd /home/ubuntu/ibiz-platform
pnpm install
```

### 3.2 启动开发服务器

```bash
pnpm run dev
```

开发服务器默认运行在 `http://localhost:3000/`。

### 3.3 关键配置文件

| 文件 | 用途 |
|------|------|
| `vite.config.ts` | Vite 构建配置，含路径别名 `@/` → `client/src/` |
| `tsconfig.json` | TypeScript 配置 |
| `client/index.html` | HTML 入口，已配置 Noto Sans SC 字体 |
| `client/src/index.css` | 全局样式 + 主题变量（清新绿色主题） |
| `client/src/App.tsx` | 路由配置入口（三层路由架构） |

---

## 四、当前项目状态（截至 2026-03-05 阶段四）

### 4.1 路由架构

项目使用 **wouter nest 模式**实现三层路由：

**公共路由**（无需登录，已登录用户访问 `/`、`/login`、`/register` 会重定向到 `/dashboard`）：

| 路径 | 页面 | 文件 |
|------|------|------|
| `/` | 网站主页 Landing | `pages/Landing.tsx` |
| `/login` | 用户登录 | `pages/Login.tsx` |
| `/register` | 用户注册 | `pages/Register.tsx` |
| `/admin/login` | 管理员登录 | `pages/AdminLogin.tsx` |

**用户路由**（需用户登录，未登录重定向到 `/login`）：

| 路径 | 页面 | 文件 |
|------|------|------|
| `/dashboard` | 用户仪表盘 | `pages/Home.tsx` |
| `/dashboard/config` | 全局配置 | `pages/GlobalConfig.tsx` |
| `/dashboard/initial-data` | 初始数据 | `pages/InitialData.tsx` |
| `/dashboard/production/simulator` | 生产模拟器 | `pages/Production.tsx` → `components/production/Simulator.tsx` |
| `/dashboard/production/designer` | 方案设计器 | `pages/Production.tsx` → `components/production/Designer.tsx` |
| `/dashboard/production/plans` | 我的方案 | `pages/Production.tsx` → `components/production/Plans.tsx` |
| `/dashboard/marketplace` | 方案市场 | `pages/Marketplace.tsx` |

**管理员路由**（需管理员登录，非管理员重定向到 `/`）：

| 路径 | 页面 | 文件 |
|------|------|------|
| `/admin` | 管理概览 | `pages/admin/Overview.tsx` |
| `/admin/users` | 用户管理 | `pages/admin/UserManagement.tsx` |
| `/admin/plans` | 方案管理 | `pages/admin/PlanManagement.tsx` |
| `/admin/settings` | 系统设置 | `pages/admin/SystemSettings.tsx` |

### 4.2 认证系统

认证使用 `AuthContext`（`contexts/AuthContext.tsx`），当前为 **Mock 实现**：

| 组件 | 文件 | 说明 |
|------|------|------|
| AuthContext | `contexts/AuthContext.tsx` | 提供 login/register/logout/user 状态，Mock 用户存储在 localStorage |
| ProtectedRoute | `components/RouteGuards.tsx` | 用户路由守卫，未登录跳转 `/login` |
| AdminRoute | `components/RouteGuards.tsx` | 管理员路由守卫，非管理员跳转 `/` |
| PublicOnlyRoute | `components/RouteGuards.tsx` | 公共路由守卫，已登录跳转 `/dashboard` |

**演示账号**：

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@ibiz.com | admin123 |
| 普通用户 | user@ibiz.com | user123 |
| 演示用户 | demo@ibiz.com | demo123 |

### 4.3 wouter nest 模式注意事项

App.tsx 中使用了 wouter 的 `nest` 属性来实现路由前缀。**在 nest 模式下，`useLocation()` 返回的是相对路径**（剥离了前缀）。因此：

- 在 `/dashboard` nest 内部，`useLocation()` 返回 `/` 而不是 `/dashboard`
- 侧边栏、面包屑中的路径比较和跳转使用相对路径（如 `/config` 而非 `/dashboard/config`）
- 跨 nest 跳转（如从 dashboard 退出登录跳到 `/login`）需使用 `window.location.href`

### 4.4 阶段四新增：P0 核心功能

阶段四实现了三大核心功能，将系统从纯 UI 展示升级为可用的计算工具：

| 功能模块 | 文件 | 说明 |
|----------|------|------|
| 数据类型定义 | `lib/data.ts` | 产品规格、期数结构、方案类型、颜色映射（与 rule.xls 一致） |
| 计算引擎 | `lib/engine.ts` | 资源迭代、6 个约束检查点、产能计算、多期联动 |
| 全局配置上下文 | `lib/ConfigContext.tsx` | React Context + localStorage 自动持久化 |
| 方案存储服务 | `lib/planStorage.ts` | localStorage CRUD（创建/复制/删除/收藏） |

**已验证**：模拟器输入 A 产品一加=50 时，C2 约束=-15.385（超限），人力消耗=7.69，机器消耗=10.58，均与公式手算结果一致。

### 4.5 已知问题

收入/成本/利润计算尚未实现（需要市场价格数据），库存结转和机器折旧/购买逻辑待完善。方案设计器（Designer.tsx）仍为 UI 骨架，未接入计算引擎。

---

## 五、文件结构

```
ibiz-platform/
├── client/
│   ├── index.html                          # HTML 入口
│   ├── public/                             # 静态资源
│   └── src/
│       ├── App.tsx                          # 路由配置（三层架构）
│       ├── main.tsx                         # React 入口
│       ├── index.css                        # 全局样式 + 主题
│       ├── const.ts                         # 客户端常量
│       ├── contexts/
│       │   ├── ThemeContext.tsx             # 主题上下文
│       │   └── AuthContext.tsx             # 认证上下文（Mock）
│       ├── hooks/
│       │   ├── useComposition.ts
│       │   ├── useMobile.tsx
│       │   └── usePersistFn.ts
│       ├── lib/
│       │   ├── utils.ts                    # 工具函数 (cn)
│       │   ├── data.ts                     # 数据类型定义（产品规格/期数/方案/颜色映射）
│       │   ├── engine.ts                   # 生产决策计算引擎
│       │   ├── ConfigContext.tsx            # 全局配置上下文（localStorage 持久化）
│       │   └── planStorage.ts              # 方案存储服务（localStorage CRUD）
│       ├── pages/
│       │   ├── Landing.tsx                # 网站主页
│       │   ├── Login.tsx                  # 用户登录
│       │   ├── Register.tsx               # 用户注册
│       │   ├── AdminLogin.tsx             # 管理员登录
│       │   ├── Home.tsx                   # 用户仪表盘
│       │   ├── GlobalConfig.tsx           # 全局配置
│       │   ├── InitialData.tsx            # 初始数据
│       │   ├── Production.tsx             # 生产决策入口
│       │   ├── Marketplace.tsx            # 方案市场
│       │   ├── NotFound.tsx               # 404 页面
│       │   └── admin/
│       │       ├── Overview.tsx           # 管理概览
│       │       ├── UserManagement.tsx     # 用户管理
│       │       ├── PlanManagement.tsx     # 方案管理
│       │       └── SystemSettings.tsx     # 系统设置
│       └── components/
│           ├── DashboardLayout.tsx         # 用户主布局
│           ├── AdminLayout.tsx            # 管理员布局
│           ├── AppSidebar.tsx             # 用户侧边栏
│           ├── AppHeader.tsx              # 用户顶部栏
│           ├── DecisionDomainLayout.tsx    # 决策域通用布局
│           ├── RouteGuards.tsx            # 路由守卫组件
│           ├── production/
│           │   ├── Simulator.tsx          # 生产模拟器
│           │   ├── Designer.tsx           # 方案设计器
│           │   └── Plans.tsx             # 我的方案
│           └── ui/                        # shadcn/ui 组件库
│               └── ... (30+ 组件)
├── server/
│   └── index.ts                            # 占位文件（静态项目无后端）
├── shared/
│   └── const.ts                            # 共享常量
├── todo.md                                 # 任务清单（含优先级）
├── PROGRESS.md                             # 开发进度记录
├── AI_RESUME.md                            # 本文件 — 恢复指令
├── design-notes.md                         # wuushuang.com 设计风格笔记
├── ideas.md                                # 设计方案构思
├── verification-notes.md                   # 页面验证记录
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 六、设计规范速查

### 6.1 色彩体系

| 用途 | 颜色 | Tailwind 类名 |
|------|------|---------------|
| 主色调 | 翠绿 | `emerald-600` / `emerald-500` |
| 生产决策 | 翠绿 | `emerald-*` |
| 信息/数据 | 蓝色 | `blue-*` |
| 警告/必填 | 琥珀 | `amber-*` |
| 市场/特殊 | 粉色 | `pink-*` |
| 管理员 | 红色 | `red-*` |
| 背景 | 纯白 | `white` / `gray-50/50` |
| 文字 | 深灰 | `gray-900` (标题) / `gray-500` (描述) / `gray-400` (辅助) |

### 6.2 关键设计原则

设计延续 wuushuang.com 风格：纯白背景不使用深色模式，卡片使用 `border-gray-100` 轻量边框，hover 时添加 `shadow-md` 和 `-translate-y-0.5` 微动效，Badge 使用对应功能色的 50/200 色阶组合，空状态使用虚线边框 `border-dashed` 卡片。

---

## 七、下一步任务清单

详细清单请参阅 `todo.md`，以下为摘要：

### P0 — 核心功能（已完成大部分，剩余项如下）

| 任务 | 涉及文件 | 说明 |
|------|----------|------|
| 收入/成本/利润计算 | `lib/engine.ts` | 需要市场价格数据 |
| 多期联动完善 | `lib/engine.ts` | 库存结转、机器折旧/购买 |
| 方案导入/导出 | `lib/planStorage.ts` | JSON 格式导入/导出 |

### P1 — 功能增强

| 任务 | 说明 |
|------|------|
| 图表可视化 | 使用 Recharts 展示产能、利润、成本趋势 |
| 一键优化求解 | 集成线性规划求解器 |
| 方案对比 | 多方案横向对比 |

### P2 — 后端集成

| 任务 | 说明 |
|------|------|
| 升级全栈 | `webdev_add_feature("web-db-user")` |
| 真实认证 | 替换 Mock AuthContext |
| 数据库 | 方案/配置/用户数据持久化 |

---

## 八、相关文档索引

以下文档位于 GitHub 仓库 `QQ2385770680/zcyn_test`：

| 文档 | 位置 | 说明 |
|------|------|------|
| `TASK_CONTEXT.md` | 根目录 | 项目背景和需求上下文 |
| `RULE_FORMULAS.md` | 根目录 | iBizSim 竞赛规则和计算公式 |
| `SOLVER_ALGORITHM.md` | 根目录 | 求解算法设计文档 |
| `FRAMEWORK_DESIGN.md` | 根目录 | 系统框架设计文档 |
| `TASK_QUEUE.md` | 根目录 | 任务队列和优先级 |
| `todo.md` | ibiz-platform/ | 详细任务清单（含优先级） |
| `PROGRESS.md` | ibiz-platform/ | 前端项目进度 |
| `AI_RESUME.md` | ibiz-platform/ | 本文件 |

---

## 九、恢复操作步骤（给下一任 AI 指挥官）

请按以下顺序执行恢复：

**第一步：获取代码**

```bash
gh repo clone QQ2385770680/zcyn_test
```

**第二步：阅读上下文**

依次阅读以下文件了解项目全貌：
1. `zcyn_test/TASK_CONTEXT.md` — 了解项目背景
2. `zcyn_test/RULE_FORMULAS.md` — 了解竞赛规则
3. `zcyn_test/ibiz-platform/AI_RESUME.md` — 本文件，了解前端项目状态
4. `zcyn_test/ibiz-platform/todo.md` — 了解任务清单和优先级
5. `zcyn_test/ibiz-platform/PROGRESS.md` — 了解开发进度

**第三步：搭建环境（如在 Manus 沙箱中）**

```bash
# 将代码复制到 webdev 项目目录
cp -r /home/ubuntu/zcyn_test/ibiz-platform/* /home/ubuntu/ibiz-platform/

# 安装依赖
cd /home/ubuntu/ibiz-platform && pnpm install

# 启动开发服务器
pnpm run dev
```

**第四步：确认页面正常**

在浏览器中访问 `http://localhost:3000/`，应看到 Landing 页面。使用演示账号 `user@ibiz.com / user123` 登录后验证 `/dashboard` 及子路由。使用 `admin@ibiz.com / admin123` 在 `/admin/login` 登录验证管理后台。

**第五步：继续开发**

参照 `todo.md` 中的任务清单，按优先级继续开发。完成每个小阶段后：
1. 更新 `todo.md` 标记已完成项
2. 更新 `PROGRESS.md` 记录进度
3. 更新 `AI_RESUME.md` 中的项目状态
4. 备份代码到 GitHub：
```bash
cd /home/ubuntu/zcyn_test
rm -rf ibiz-platform/client ibiz-platform/server ibiz-platform/shared
cp -r /home/ubuntu/ibiz-platform/client /home/ubuntu/zcyn_test/ibiz-platform/
cp -r /home/ubuntu/ibiz-platform/server /home/ubuntu/zcyn_test/ibiz-platform/
cp -r /home/ubuntu/ibiz-platform/shared /home/ubuntu/zcyn_test/ibiz-platform/
cp /home/ubuntu/ibiz-platform/*.md /home/ubuntu/zcyn_test/ibiz-platform/
cp /home/ubuntu/ibiz-platform/*.json /home/ubuntu/zcyn_test/ibiz-platform/
cp /home/ubuntu/ibiz-platform/*.ts /home/ubuntu/zcyn_test/ibiz-platform/
git add -A && git commit -m "阶段N：xxx" && git push
```

---

**最后更新**：2026-03-05 by AI 指挥官（阶段四 P0 核心功能完成后）
