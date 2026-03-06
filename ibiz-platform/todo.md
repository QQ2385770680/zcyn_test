# iBizSim 智能决策辅助系统 — TODO 清单

> 最后更新：2026-03-05  
> 当前版本：阶段五（UI 重构完成）

---

## 已完成

### 阶段一：基础框架搭建
- [x] 项目初始化（React 19 + Tailwind 4 + shadcn/ui）
- [x] 清新绿色主题设计（延续 wuushuang.com 风格）
- [x] 全局 CSS 变量和主题配置（index.css）
- [x] 中文字体引入（Noto Sans SC）

### 阶段二：核心页面开发
- [x] 用户仪表盘首页（Home.tsx）— Hero 区域 + 统计卡片 + 快速入口
- [x] 全局配置页面（GlobalConfig.tsx）— 基础参数 + 人力资源参数
- [x] 初始数据页面（InitialData.tsx）— 产品数据 + 机器数据 + 工人数据
- [x] 生产决策域（Production.tsx）— 三标签页布局
  - [x] 生产模拟器（Simulator.tsx）— 排产计划 + 约束验证 + 收入预估
  - [x] 方案设计器（Designer.tsx）— 方案配置 + 优化目标 + 约束条件
  - [x] 我的方案（Plans.tsx）— 方案列表 + 状态管理
- [x] 方案市场页面（Marketplace.tsx）— 方案卡片 + 搜索筛选
- [x] 侧边栏导航（AppSidebar.tsx）— 分组导航 + 用户信息 + 退出登录
- [x] 顶部状态栏（AppHeader.tsx）— 面包屑 + 版本标识
- [x] 通用决策域布局（DecisionDomainLayout.tsx）

### 阶段三：路由重构
- [x] 1. 规划路由架构和文件结构
- [x] 2. 创建 AuthContext（认证上下文，含角色信息）
- [x] 3. 创建 ProtectedRoute 守卫组件（用户角色）
- [x] 4. 创建 AdminRoute 守卫组件（管理员角色）
- [x] 5. 创建用户登录页 `/login`
- [x] 6. 创建用户注册页 `/register`
- [x] 7. 创建管理员登录页 `/admin/login`
- [x] 8. 创建网站主页 Landing Page `/`
- [x] 9. 重构 App.tsx 路由（公共/用户/管理员三层）
- [x] 10. 调整用户侧边栏（AppSidebar）适配新路由
- [x] 11. 调整管理员布局（AdminLayout + AdminSidebar）
- [x] 12. 将现有用户页面移至 `/dashboard/*` 路由下
- [x] 13. 将管理后台移至 `/admin/*` 路由下
- [x] 14. wouter nest 模式路由修复（相对路径适配）
- [x] 15. 404 页面更新（NotFound.tsx）
- [x] 16. 浏览器验证：Landing / Login / Dashboard / 生产决策 / 全局配置 / 方案市场

### 阶段四：P0 核心功能
- [x] 数据类型定义（data.ts）— 产品规格、期数结构、方案类型、颜色映射
- [x] 生产决策计算引擎（engine.ts）— 真实排产计算逻辑
  - [x] 工人约束计算（正常班 + 加班工时 vs 可用工人，6 个约束检查点）
  - [x] 机器约束计算（各产品机器占用 vs 可用机器）
  - [x] 产能计算（正常班产量 + 加班产量）
  - [x] 多期联动（工人变动：解雇/雇佣/新工人效率）
- [x] 生产模拟重写（Simulator.tsx）— 从 Mock 数据改为计算引擎驱动
  - [x] 四班次（一班/一加/二班/二加）× 四产品（A/B/C/D）排产输入
  - [x] 实时约束验证（6 个约束检查点，通过/警告/超限三态）
  - [x] 利用率概览卡片（工人/机器利用率百分比）
  - [x] 颜色映射标识（必填/选填/自由，与 rule.xls 一致）
  - [x] 资源消耗明细表格
  - [x] 期数切换和重置功能
- [x] 全局配置持久化
  - [x] ConfigContext 全局配置上下文（自动 localStorage 读写）
  - [x] GlobalConfig 页面重写（产品规格参数表格）
  - [x] Simulator 联动（从 ConfigContext 读取配置）
- [x] 方案 CRUD 功能
  - [x] 方案存储服务（planStorage.ts）— localStorage CRUD
  - [x] Plans.tsx 重写 — 创建/搜索/收藏/复制/删除方案
  - [x] 空状态提示 + 快速新建卡片

### 阶段五：UI 重构与命名规范化
- [x] Tab 名称修改：模拟器 → 生产模拟，方案设计器 → 方案设计
- [x] 全局配置精简：仅保留产品规格参数
- [x] 移除初始数据功能（页面、路由、侧边栏菜单）
- [x] 首页快速入口更新（初始数据 → 全局配置）
- [x] 全站文案统一更新（Landing、Register、Home 等）

---

## 待完成

### 优先级 P0（核心功能）
- [ ] 收入/成本/利润计算（需要市场价格数据）
- [ ] 多期联动完善（库存结转、机器折旧/购买）
- [ ] 方案导入/导出（JSON 格式）

### 优先级 P1（体验优化）
- [ ] 图表可视化 — 利用 chart.tsx 组件
  - [ ] 产能趋势图（各期产量对比）
  - [ ] 利润趋势图（各期利润走势）
  - [ ] 成本结构饼图（人工/材料/加班/库存）
  - [ ] 资源利用率仪表盘
- [ ] 模拟器交互优化
  - [ ] 参数调整实时反馈（滑块联动数值）
  - [ ] 约束违反时的视觉提示（红色高亮）
  - [ ] 运行模拟动画效果
- [ ] 方案对比功能 — 多方案并排对比关键指标
- [ ] 响应式布局优化 — 移动端适配

### 优先级 P2（进阶功能）
- [ ] 一键优化求解器 — 基于约束条件自动求解最优排产
- [ ] 方案市场交互 — 预览/获取/评分功能实现
- [ ] 管理员功能完善
  - [ ] 用户 CRUD 操作
  - [ ] 方案审核流程
  - [ ] 系统参数配置
- [ ] 数据导出 — 方案导出为 Excel/PDF
- [ ] 操作历史记录 — 首页"最近活动"区域数据

### 优先级 P3（后端集成）

- [ ] 升级为 web-db-user 全栈项目
- [ ] 用户认证接入真实后端（替换 Mock）
- [ ] 数据库集成（方案/配置/用户数据持久化）
- [ ] API 接口设计与实现

---

## 已知问题
- [ ] 退出登录按钮在侧边栏底部，需确认在所有屏幕尺寸下可见
- [ ] 管理员登录后"返回前台"跳转到 Landing（设计如此，管理员和用户是不同角色）

---

## 路由架构

### 公共路由（无需登录）
| 路径 | 页面 | 文件 |
|------|------|------|
| `/` | 网站主页 Landing | Landing.tsx |
| `/login` | 用户登录 | Login.tsx |
| `/register` | 用户注册 | Register.tsx |
| `/admin/login` | 管理员登录 | AdminLogin.tsx |

### 用户路由（需用户登录，前缀 `/dashboard`）
| 路径 | 页面 | 文件 |
|------|------|------|
| `/dashboard` | 用户仪表盘 | Home.tsx |
| `/dashboard/config` | 全局配置 | GlobalConfig.tsx |
| `/dashboard/production/simulator` | 生产模拟 | Production.tsx → Simulator.tsx |
| `/dashboard/production/designer` | 方案设计 | Production.tsx → Designer.tsx |
| `/dashboard/production/plans` | 我的方案 | Production.tsx → Plans.tsx |
| `/dashboard/marketplace` | 方案市场 | Marketplace.tsx |

### 管理员路由（需管理员登录，前缀 `/admin`）
| 路径 | 页面 | 文件 |
|------|------|------|
| `/admin` | 管理概览 | admin/Overview.tsx |
| `/admin/users` | 用户管理 | admin/UserManagement.tsx |
| `/admin/plans` | 方案管理 | admin/PlanManagement.tsx |
| `/admin/settings` | 系统设置 | admin/SystemSettings.tsx |

---

## 演示账号
| 角色 | 邮箱 | 密码 |
|------|------|------|
| 管理员 | admin@ibiz.com | admin123 |
| 普通用户 | user@ibiz.com | user123 |
| 演示用户 | demo@ibiz.com | demo123 |
