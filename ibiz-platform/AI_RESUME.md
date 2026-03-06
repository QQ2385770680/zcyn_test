# iBizSim 智能决策辅助系统 — AI 指挥官恢复指令

> 本文档是给下一任 AI 指挥官的完整交接手册。请在接手任务后**首先阅读本文件**，按照步骤恢复项目环境并继续开发。

---

## 一、项目概述

**项目名称**：iBizSim 智能决策辅助系统（前端）

**项目定位**：为 iBizSim 企业竞争模拟大赛参赛团队提供智能决策辅助工具，覆盖生产决策域的参数模拟、约束验证与最优方案求解。

**技术栈**：React 19 + Tailwind CSS 4 + shadcn/ui + Wouter 路由（nest 模式） + Vite

**设计风格**：延续 [wuushuang.com](https://www.wuushuang.com/) 的清新简洁风格 — 纯白背景、翠绿主色调（emerald-600）、彩色气泡装饰、功能色彩编码、卡片式布局、轻量边框、微妙阴影。

**Manus 部署**：项目已部署到 Manus 平台，webdev 项目名 `ibiz-sim`。

---

## 二、代码获取

### 2.1 GitHub 仓库

```bash
gh repo clone QQ2385770680/zcyn_test
cd zcyn_test/ibiz-platform
```

前端项目代码位于仓库的 `ibiz-platform/` 目录下。

### 2.2 Manus Webdev 项目

如果在 Manus 沙箱环境中工作，需要先将代码复制到 webdev 项目目录：

```
/home/ubuntu/ibiz-sim
```

该项目通过 `webdev_init_project` 初始化，项目名 `ibiz-sim`。

---

## 三、环境搭建

### 3.1 安装依赖

```bash
# 将代码复制到 webdev 项目目录（如果从 GitHub 恢复）
cp -r /home/ubuntu/zcyn_test/ibiz-platform/client /home/ubuntu/ibiz-sim/
cp -r /home/ubuntu/zcyn_test/ibiz-platform/server /home/ubuntu/ibiz-sim/
cp -r /home/ubuntu/zcyn_test/ibiz-platform/shared /home/ubuntu/ibiz-sim/
cp /home/ubuntu/zcyn_test/ibiz-platform/package.json /home/ubuntu/ibiz-sim/
cp /home/ubuntu/zcyn_test/ibiz-platform/tsconfig.json /home/ubuntu/ibiz-sim/
cp /home/ubuntu/zcyn_test/ibiz-platform/vite.config.ts /home/ubuntu/ibiz-sim/

cd /home/ubuntu/ibiz-sim
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

## 四、当前项目状态（截至 2026-03-06 阶段七）

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
| `/dashboard/production/simulator` | 生产模拟 | `pages/Production.tsx` → `components/production/Simulator.tsx` |
| `/dashboard/production/designer` | 方案设计 | `pages/Production.tsx` → `components/production/Designer.tsx` |
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

### 4.4 核心功能模块

**计算引擎（engine.ts）**：

| 功能 | 说明 |
|------|------|
| 可用工人计算 | 期初工人 - ceil(解雇) + floor(雇佣) × 新工人效率 |
| 6 个约束检查点 | C1(一班后人数)、C2(一加后人数)、C4(二加后人数)、C5(一班后机器)、C7(二班后机器)、C8(二加后机器) |
| 资源消耗计算 | 各班次的人力消耗和机器消耗（基于产品规格系数） |
| 利用率计算 | 工人利用率 = 消耗人力/可用人力，机器利用率 = 消耗机器/可用机器 |
| 多期联动 | 各期工人数量根据解雇/雇佣决策自动迭代 |

**方案设计器（Designer.tsx）— 阶段六重构 + 阶段七体验优化**：

| 功能模块 | 说明 |
|----------|------|
| 产量配置 | 1-8 期 × 4 班次 × 4 产品，支持行为模式（必选/可选/留空/固定）和求解范围设置 |
| 雇佣策略 | 8 期独立配置，5 种模式（最大雇佣/最少解雇/平衡/不雇佣/自定义） |
| 机器购买 | 8 期独立配置，3 种模式（不买/固定/范围），含到货期提示 |
| 方案管理 | 保存/加载/导入/导出方案（localStorage + JSON 文件） |
| 从规则表初始化 | 根据 data.ts 中的规则表自动设置行为模式 |
| 缓存持久化 | 编辑状态自动缓存到 localStorage，刷新后自动恢复（阶段七） |
| 固定标记 | 行为模式为"固定"时规则列显示绿色"固"标记（阶段七） |
| 方案同步 | 保存的方案自动同步到"我的方案"列表，支持编辑跳转（阶段七） |

**数据类型（designerTypes.ts）**：

| 类型 | 说明 |
|------|------|
| `ProductionBehavior` | 产量行为模式枚举（required/optional/empty/fixed） |
| `HiringStrategy` | 雇佣策略枚举（max_hire/min_fire/balance/no_hire/custom） |
| `MachinePurchaseMode` | 机器购买模式枚举（none/fixed/range） |
| `DesignPlan` | 完整方案结构（含 8 期产量配置 + 雇佣策略 + 机器购买） |

### 4.5 已知问题
收入/成本/利润计算尚未实现（需要市场价格数据），库存结转和机器折旧/购买逻辑待完善。方案设计器与模拟器尚未联动。

### 4.6 阶段七新增功能

| 功能 | 说明 |
|------|------|
| 刷新保持缓存 | 方案编辑状态通过 localStorage 自动缓存，刷新后自动恢复 |
| 保存按钮位置 | “保存方案”按钮移至“复制到所有期”下方，无需滚动到顶部 |
| 固定标记 | 行为模式为“固定”时规则列显示绿色“固”标记 |
| 方案同步 | 设计器保存的方案自动同步到“我的方案”列表，支持“编辑方案”跳转 |。

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
│       │   ├── designerTypes.ts            # 方案设计器数据类型（行为模式/策略/方案结构）
│       │   ├── ConfigContext.tsx            # 全局配置上下文（localStorage 持久化）
│       │   └── planStorage.ts              # 方案存储服务（localStorage CRUD）
│       ├── pages/
│       │   ├── Landing.tsx                # 网站主页
│       │   ├── Login.tsx                  # 用户登录
│       │   ├── Register.tsx               # 用户注册
│       │   ├── AdminLogin.tsx             # 管理员登录
│       │   ├── Home.tsx                   # 用户仪表盘
│       │   ├── GlobalConfig.tsx           # 全局配置
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
│           │   ├── Designer.tsx           # 方案设计器（阶段六重构）
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

### P0 — 核心功能（剩余项）

| 任务 | 涉及文件 | 说明 |
|------|----------|------|
| 方案设计器与模拟器联动 | Designer.tsx, Simulator.tsx | 设计方案加载到模拟器验证 |
| 收入/成本/利润计算 | `lib/engine.ts` | 需要市场价格数据 |
| 多期联动完善 | `lib/engine.ts` | 库存结转、机器折旧/购买 |

### P1 — 功能增强

| 任务 | 说明 |
|------|------|
| 一键优化求解器 | 基于方案设计器约束自动求解最优排产 |
| 图表可视化 | 使用 Recharts 展示产能、利润、成本趋势 |
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
cp -r /home/ubuntu/zcyn_test/ibiz-platform/client /home/ubuntu/ibiz-sim/
cp -r /home/ubuntu/zcyn_test/ibiz-platform/server /home/ubuntu/ibiz-sim/
cp -r /home/ubuntu/zcyn_test/ibiz-platform/shared /home/ubuntu/ibiz-sim/
cp /home/ubuntu/zcyn_test/ibiz-platform/package.json /home/ubuntu/ibiz-sim/
cp /home/ubuntu/zcyn_test/ibiz-platform/tsconfig.json /home/ubuntu/ibiz-sim/
cp /home/ubuntu/zcyn_test/ibiz-platform/vite.config.ts /home/ubuntu/ibiz-sim/

# 安装依赖
cd /home/ubuntu/ibiz-sim && pnpm install

# 重启开发服务器
# 使用 webdev_restart_server 工具
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
cd /home/ubuntu/zcyn_test/ibiz-platform
rm -rf client server shared
cp -r /home/ubuntu/ibiz-sim/client ./
cp -r /home/ubuntu/ibiz-sim/server ./
cp -r /home/ubuntu/ibiz-sim/shared ./
cp /home/ubuntu/ibiz-sim/package.json ./
cp /home/ubuntu/ibiz-sim/tsconfig.json ./
cp /home/ubuntu/ibiz-sim/vite.config.ts ./
rm -rf client/node_modules server/node_modules shared/node_modules dist .manus .manus-logs
cd /home/ubuntu/zcyn_test
git add -A && git commit -m "阶段N：xxx" && git push
```

---

**最后更新**：2026-03-06 by AI 指挥官（阶段七 方案设计器体验优化完成后）
