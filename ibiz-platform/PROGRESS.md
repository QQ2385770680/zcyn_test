# iBizSim 智能决策辅助系统 — 开发进度记录

---

## 阶段一：核心布局框架 + 所有页面组件（已完成）

**完成时间**：2026-03-05  
**Git Commit**：`71a0d705`

已完成全部 UI 组件搭建，包括侧边栏导航、顶部栏、首页仪表盘、全局配置、初始数据、生产决策域（模拟器/方案设计器/我的方案）、方案市场、管理后台、路由系统。设计风格延续 wuushuang.com 的清新简洁风格。

---

## 阶段二：页面验证 + 视觉优化（已完成）

**完成时间**：2026-03-05  
**Git Commit**：`edeeb784`

在浏览器中逐一验证了全部 8 个路由页面，确认侧边栏导航展开/折叠、标签页切换、面包屑导航均正常工作。新增 AI_RESUME.md 恢复指令文档。

---

## 阶段三：路由重构（已完成）

**完成时间**：2026-03-05  
**Git Commit**：待提交

重构了整个路由架构，将原有的单层路由改为三层路由体系（公共/用户/管理员），新增认证系统和角色权限守卫。

### 新增文件

| 文件 | 说明 |
|------|------|
| `contexts/AuthContext.tsx` | 认证上下文（Mock 用户 + localStorage 持久化） |
| `components/RouteGuards.tsx` | 路由守卫（ProtectedRoute / AdminRoute / PublicOnlyRoute） |
| `pages/Landing.tsx` | 网站主页 Landing Page |
| `pages/Login.tsx` | 用户登录页 |
| `pages/Register.tsx` | 用户注册页 |
| `pages/AdminLogin.tsx` | 管理员登录页 |
| `components/AdminLayout.tsx` | 管理员独立布局 |
| `pages/admin/Overview.tsx` | 管理概览 |
| `pages/admin/UserManagement.tsx` | 用户管理 |
| `pages/admin/PlanManagement.tsx` | 方案管理 |
| `pages/admin/SystemSettings.tsx` | 系统设置 |

### 路由验证结果

| 页面 | 路由 | 验证结果 |
|------|------|----------|
| 网站主页 | `/` | 通过 |
| 用户登录 | `/login` | 通过 |
| 用户仪表盘 | `/dashboard` | 通过 |
| 全局配置 | `/dashboard/config` | 通过 |
| 生产模拟器 | `/dashboard/production/simulator` | 通过 |
| 方案设计器 | `/dashboard/production/designer` | 通过 |
| 方案市场 | `/dashboard/marketplace` | 通过 |

---

## 阶段四：P0 核心功能（已完成）

**完成时间**：2026-03-05  
**Git Commit**：待提交

实现了生产决策计算引擎、全局配置持久化和方案 CRUD 三大核心功能，将模拟器从静态 Mock 数据升级为真实计算引擎驱动。

### 新增文件

| 文件 | 说明 |
|------|------|
| `client/src/lib/data.ts` | 数据类型定义（产品规格、期数结构、方案类型、颜色映射） |
| `client/src/lib/engine.ts` | 生产决策计算引擎（资源迭代、约束验证、产能计算） |
| `client/src/lib/ConfigContext.tsx` | 全局配置上下文（React Context + localStorage 持久化） |
| `client/src/lib/planStorage.ts` | 方案存储服务（localStorage CRUD） |

### 重写文件

| 文件 | 变更说明 |
|------|----------|
| `client/src/components/production/Simulator.tsx` | 从 Mock 数据改为计算引擎驱动，支持四班次×四产品排产 |
| `client/src/pages/GlobalConfig.tsx` | 重写为持久化配置页面，含产品规格编辑表格 |
| `client/src/components/production/Plans.tsx` | 重写为真实 CRUD 功能，支持创建/搜索/收藏/复制/删除 |
| `client/src/App.tsx` | 添加 ConfigProvider 包裹 |

### 核心功能详情

**计算引擎（engine.ts）**实现了以下计算逻辑：

| 功能 | 说明 |
|------|------|
| 可用工人计算 | 期初工人 - ceil(解雇) + floor(雇佣) × 新工人效率 |
| 6 个约束检查点 | C1(一班后人数)、C2(一加后人数)、C4(二加后人数)、C5(一班后机器)、C7(二班后机器)、C8(二加后机器) |
| 资源消耗计算 | 各班次的人力消耗和机器消耗（基于产品规格系数） |
| 利用率计算 | 工人利用率 = 消耗人力/可用人力，机器利用率 = 消耗机器/可用机器 |
| 多期联动 | 各期工人数量根据解雇/雇佣决策自动迭代 |

**模拟器（Simulator.tsx）**核心特性：

| 特性 | 说明 |
|------|------|
| 排产输入 | 4×4 网格（A/B/C/D × 一班/一加/二班/二加），实时计算 |
| 颜色映射 | 必填(黄色)/选填(橙色)/自由(白色)，与 rule.xls 一致 |
| 约束验证 | 通过(绿色)/警告(黄色)/超限(红色) 三态实时显示 |
| 利用率卡片 | 工人和机器利用率百分比 + 进度条 |
| 期数切换 | 支持 8 期切换，各期数据独立 |

### 验证结果

| 功能 | 验证项 | 结果 |
|------|--------|------|
| 全局配置 | 参数显示和编辑 | 通过 |
| 全局配置 | localStorage 持久化 | 通过 |
| 模拟器 | 排产输入和实时计算 | 通过 |
| 模拟器 | 约束验证（A一加=50 → C2=-15.385 超限） | 通过 |
| 模拟器 | 资源消耗明细（人力7.69、机器10.58） | 通过 |
| 方案 CRUD | 创建方案 | 通过 |
| 方案 CRUD | 方案卡片显示 | 通过 |

---

## 当前状态

阶段四 P0 核心功能已完成。计算引擎实时驱动模拟器，全局配置自动持久化，方案支持完整 CRUD 操作。

**恢复指令**：详见 `AI_RESUME.md`  
**任务清单**：详见 `todo.md`

**下一步任务**（优先级排序）：
1. 收入/成本/利润计算（需要市场价格数据）
2. 多期联动完善（库存结转、机器折旧/购买）
3. 方案导入/导出（JSON 格式）
4. 图表可视化（产能趋势、利润走势、成本结构）
