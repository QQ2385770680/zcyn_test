# iBizSim 智能决策辅助系统 — AI 指挥官恢复指令

> 本文档是给下一任 AI 指挥官的完整交接手册。请在接手任务后**首先阅读本文件**，按照步骤恢复项目环境并继续开发。

---

## 一、项目概述

**项目名称**：iBizSim 智能决策辅助系统（前端）

**项目定位**：为 iBizSim 企业竞争模拟大赛参赛团队提供智能决策辅助工具，覆盖生产决策域的参数模拟、约束验证与最优方案求解。

**技术栈**：React 19 + Tailwind CSS 4 + shadcn/ui + Wouter 路由 + Vite

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

该项目通过 `webdev_init_project` 初始化，项目名 `ibiz-platform`，初始检查点版本 `f2b67789`。

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
| `client/src/App.tsx` | 路由配置入口 |

---

## 四、当前项目状态（截至 2026-03-05）

### 4.1 已完成的功能模块

| 模块 | 文件路径 | 状态 | 说明 |
|------|----------|------|------|
| 全局样式 | `client/src/index.css` | 已完成 | 清新绿色主题，OKLCH 色值，气泡装饰样式 |
| 字体配置 | `client/index.html` | 已完成 | Google Fonts Noto Sans SC |
| 主布局 | `client/src/components/DashboardLayout.tsx` | 已完成 | SidebarProvider + SidebarInset 包裹 |
| 侧边栏 | `client/src/components/AppSidebar.tsx` | 已完成 | 品牌标识 + 系统配置 + 决策域(仅生产) + 市场 + 用户 |
| 顶部栏 | `client/src/components/AppHeader.tsx` | 已完成 | 面包屑导航 + 测试版标签 + 通知 + 管理入口 |
| 决策域布局 | `client/src/components/DecisionDomainLayout.tsx` | 已完成 | 三标签页通用布局（模拟器/方案设计器/我的方案） |
| 首页 | `client/src/pages/Home.tsx` | 已完成 | Hero区(气泡装饰) + 统计卡片 + 快速入口 + 最近活动 |
| 全局配置 | `client/src/pages/GlobalConfig.tsx` | 已完成 | 基础参数(机器/工人/期数) + 人力资源参数(Slider) |
| 初始数据 | `client/src/pages/InitialData.tsx` | 已完成 | 产品参数表 + 机器参数表 + 成本参数网格 |
| 生产决策入口 | `client/src/pages/Production.tsx` | 已完成 | 路由入口，引用三个子组件 |
| 生产模拟器 | `client/src/components/production/Simulator.tsx` | 已完成 | 期数选择 + 利用率卡片 + 排产表(可编辑) + 约束验证 |
| 方案设计器 | `client/src/components/production/Designer.tsx` | 已完成 | 基本信息 + 优化目标 + 约束条件(Switch) + 一键优化 |
| 我的方案 | `client/src/components/production/Plans.tsx` | 已完成 | 方案卡片网格 + 搜索 + 排序 + 新建 |
| 方案市场 | `client/src/pages/Marketplace.tsx` | 已完成 | 市场方案卡片 + PRO标签 + 搜索筛选 |
| 管理后台 | `client/src/pages/Admin.tsx` | 已完成 | 统计卡片 + 用户管理表 + 方案管理表 + 系统设置 |
| 路由配置 | `client/src/App.tsx` | 已完成 | 7条路由全部注册 |
| Toast 修复 | `client/src/components/ui/sonner.tsx` | 已完成 | 移除 next-themes 依赖 |

### 4.2 路由清单

| 路由 | 页面 | 验证状态 |
|------|------|----------|
| `/` | 首页仪表盘 | 已验证通过 |
| `/config` | 全局配置 | 已验证通过 |
| `/initial-data` | 初始数据 | 已验证通过 |
| `/production/simulator` | 生产模拟器 | 已验证通过 |
| `/production/designer` | 方案设计器 | 已验证通过 |
| `/production/plans` | 我的方案 | 已验证通过 |
| `/marketplace` | 方案市场 | 已验证通过 |
| `/admin` | 管理后台 | 已验证通过 |

### 4.3 已知问题

目前所有页面均使用**静态 Mock 数据**，尚未接入真实数据源或计算逻辑。所有交互按钮（保存、优化、删除等）仅有前端 UI，无实际后端功能。

---

## 五、文件结构

```
ibiz-platform/
├── client/
│   ├── index.html                          # HTML 入口
│   ├── public/                             # 静态资源
│   └── src/
│       ├── App.tsx                          # 路由配置
│       ├── main.tsx                         # React 入口
│       ├── index.css                        # 全局样式 + 主题
│       ├── const.ts                         # 客户端常量
│       ├── contexts/
│       │   └── ThemeContext.tsx             # 主题上下文
│       ├── hooks/
│       │   ├── useComposition.ts
│       │   ├── useMobile.tsx
│       │   └── usePersistFn.ts
│       ├── lib/
│       │   └── utils.ts                    # 工具函数 (cn)
│       ├── pages/
│       │   ├── Home.tsx                    # 首页仪表盘
│       │   ├── GlobalConfig.tsx            # 全局配置
│       │   ├── InitialData.tsx             # 初始数据
│       │   ├── Production.tsx              # 生产决策入口
│       │   ├── Marketplace.tsx             # 方案市场
│       │   ├── Admin.tsx                   # 管理后台
│       │   └── NotFound.tsx                # 404 页面
│       └── components/
│           ├── DashboardLayout.tsx          # 主布局
│           ├── AppSidebar.tsx              # 侧边栏
│           ├── AppHeader.tsx               # 顶部栏
│           ├── DecisionDomainLayout.tsx     # 决策域通用布局
│           ├── production/
│           │   ├── Simulator.tsx           # 生产模拟器
│           │   ├── Designer.tsx            # 方案设计器
│           │   └── Plans.tsx              # 我的方案
│           └── ui/                         # shadcn/ui 组件库
│               ├── accordion.tsx
│               ├── avatar.tsx
│               ├── badge.tsx
│               ├── breadcrumb.tsx
│               ├── button.tsx
│               ├── card.tsx
│               ├── chart.tsx
│               ├── dialog.tsx
│               ├── dropdown-menu.tsx
│               ├── input.tsx
│               ├── label.tsx
│               ├── progress.tsx
│               ├── scroll-area.tsx
│               ├── select.tsx
│               ├── separator.tsx
│               ├── sidebar.tsx
│               ├── slider.tsx
│               ├── sonner.tsx
│               ├── switch.tsx
│               ├── table.tsx
│               ├── tabs.tsx
│               ├── textarea.tsx
│               ├── tooltip.tsx
│               └── ... (更多 UI 组件)
├── server/
│   └── index.ts                            # 占位文件（静态项目无后端）
├── shared/
│   └── const.ts                            # 共享常量
├── design-notes.md                         # wuushuang.com 设计风格笔记
├── ideas.md                                # 设计方案构思
├── PROGRESS.md                             # 开发进度记录
├── AI_RESUME.md                            # 本文件 — 恢复指令
├── verification-notes.md                   # 页面验证记录
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── package.json
└── pnpm-lock.yaml
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

### 6.2 组件使用约定

所有 UI 组件从 `@/components/ui/*` 导入。自定义业务组件放在 `@/components/` 或 `@/components/production/`。页面组件放在 `@/pages/`。

### 6.3 关键设计原则

设计延续 wuushuang.com 风格：纯白背景不使用深色模式，卡片使用 `border-gray-100` 轻量边框，hover 时添加 `shadow-md` 和 `-translate-y-0.5` 微动效，Badge 使用对应功能色的 50/200 色阶组合，空状态使用虚线边框 `border-dashed` 卡片。

---

## 七、下一步任务清单

### 7.1 优先级 P0 — 核心功能实现

以下任务是将 UI 原型转化为可用产品的关键步骤：

| 任务 | 涉及文件 | 说明 |
|------|----------|------|
| 接入生产决策计算引擎 | `production/Simulator.tsx` | 将 Mock 数据替换为真实的排产计算逻辑，参考 `RULE_FORMULAS.md` 和 `SOLVER_ALGORITHM.md` |
| 实现约束验证逻辑 | `production/Simulator.tsx` | 根据工人/机器/加班约束实时验证排产方案 |
| 实现方案 CRUD | `production/Plans.tsx`, `production/Designer.tsx` | 方案的创建、保存、复制、删除（可用 localStorage 或升级后端） |
| 全局配置持久化 | `GlobalConfig.tsx` | 配置参数的保存和读取（localStorage 或 Context） |
| 初始数据可编辑 | `InitialData.tsx` | 允许用户修改初始数据参数 |

### 7.2 优先级 P1 — 功能增强

| 任务 | 说明 |
|------|------|
| 添加图表可视化 | 使用 Recharts（已有 `chart.tsx` 组件）展示产能、利润、成本趋势 |
| 实现一键优化求解 | 集成线性规划求解器（可用 `javascript-lp-solver` 或后端 API） |
| 方案对比功能 | 支持选择多个方案进行横向对比 |
| 数据导入导出 | 支持 Excel/CSV 格式的数据导入导出 |

### 7.3 优先级 P2 — 体验优化

| 任务 | 说明 |
|------|------|
| 升级为全栈项目 | 使用 `webdev_add_feature("web-db-user")` 添加后端和数据库 |
| 用户认证 | 接入 Manus OAuth 实现用户登录 |
| 方案市场真实数据 | 接入后端 API 实现方案的发布和获取 |
| 响应式优化 | 优化移动端布局体验 |
| 动画增强 | 添加页面切换和组件进入动画 |

---

## 八、相关文档索引

以下文档位于 GitHub 仓库 `QQ2385770680/zcyn_test` 的根目录：

| 文档 | 说明 |
|------|------|
| `TASK_CONTEXT.md` | 项目背景和需求上下文 |
| `RULE_FORMULAS.md` | iBizSim 竞赛规则和计算公式 |
| `SOLVER_ALGORITHM.md` | 求解算法设计文档 |
| `FRAMEWORK_DESIGN.md` | 系统框架设计文档 |
| `TASK_QUEUE.md` | 任务队列和优先级 |
| `PROGRESS.md`（根目录） | 全局项目进度 |
| `ibiz-platform/PROGRESS.md` | 前端项目进度 |
| `ibiz-platform/AI_RESUME.md` | 本文件 |
| `ibiz-platform/design-notes.md` | 视觉设计参考笔记 |
| `ibiz-platform/ideas.md` | 设计方案构思记录 |

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
4. `zcyn_test/ibiz-platform/PROGRESS.md` — 了解开发进度

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

在浏览器中访问 `http://localhost:3000/`，验证以下路由均可正常访问：`/`、`/config`、`/initial-data`、`/production/simulator`、`/production/designer`、`/production/plans`、`/marketplace`、`/admin`。

**第五步：继续开发**

参照本文件第七节「下一步任务清单」，按优先级继续开发。

---

**最后更新**：2026-03-05 by AI 指挥官（阶段二验证完成后）
