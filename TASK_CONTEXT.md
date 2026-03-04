# AI指挥家 — 任务上下文档案

> 此文件记录完整的任务背景、架构理解和业务逻辑，供AI实例恢复上下文使用。
> 与 `PROGRESS.md`（进度状态）配合使用，二者共同构成完整的断点续传信息。

---

## 项目背景

**iBizSim 连续排产规则计算器** 是一个为企业竞争模拟大赛设计的生产排产工具。目标用户是参赛团队中负责生产的队员，需要在比赛中快速计算9期排产数据、分析多班次产能、对比排班成本，从而做出最优生产决策。

项目以纯前端静态应用形式部署在 GitHub Pages，无需后端服务。

---

## 技术架构

### 技术栈

| 层次 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | React | 19.x | 函数式组件 + Hooks |
| 构建工具 | Vite | 7.x | 快速热更新 |
| 样式方案 | TailwindCSS | 4.x | 原子化CSS |
| 路由 | wouter | 3.x | 已打patch，兼容GitHub Pages |
| UI组件库 | shadcn/ui | latest | 基于Radix UI |
| 图表 | recharts | 2.x | 数据可视化 |
| 动画 | framer-motion | 12.x | 流畅过渡动画 |
| 图标 | lucide-react | 0.453.x | 统一图标系统 |

### 目录结构说明

```
ibiz-production/
├── client/
│   ├── index.html
│   └── src/
│       ├── App.tsx                    # 根组件，路由配置
│       ├── main.tsx                   # 入口文件
│       ├── const.ts                   # 全局常量
│       ├── index.css                  # 全局样式
│       ├── components/
│       │   ├── ui/                    # shadcn/ui 基础组件
│       │   └── [业务组件].tsx          # 业务逻辑组件
│       ├── lib/
│       │   ├── engine.ts              # ★ 核心计算引擎（最重要）
│       │   ├── data.ts                # 数据定义与初始值
│       │   └── utils.ts              # 工具函数
│       ├── pages/
│       │   ├── Home.tsx              # ★ 主页面（含SimulatorTab）
│       │   └── NotFound.tsx          # 404页面
│       ├── contexts/
│       │   └── ThemeContext.tsx       # 主题上下文
│       └── hooks/                     # 自定义Hooks
├── server/
│   └── index.ts                       # Express开发服务器（仅开发用）
├── shared/
│   └── const.ts                       # 前后端共享常量
├── rule.xls                           # 排产规则原始数据
├── ideas.md                           # 设计方案记录
├── todo.md                            # 当前任务清单
└── package.json
```

---

## 核心业务逻辑摘要

### 排产计算核心（engine.ts）

`engine.ts` 是整个项目最重要的文件，包含：

1. **期数计算**：计算第1-9期的产能、成本、利润
2. **班次管理**：支持多班次（白班/晚班/夜班）配置
3. **雇佣约束**：每期雇佣人数受上一期人数约束，变化幅度有限制
4. **产能计算**：根据人数、班次、设备数量计算实际产能
5. **成本计算**：人工成本、设备成本、库存成本综合计算

### 第四期雇佣联动逻辑（待开发）

第四期（P4）的雇佣人数会直接约束第五期（P5）的可选范围：
- P4雇佣人数滑块范围：90-130人
- P5约束预览：根据P4人数实时计算P5的最小/最大可选人数

---

## 组件依赖关系

```
App.tsx
└── Home.tsx (主页面)
    ├── SimulatorTab.tsx (参数模拟器标签页) ← 当前开发重点
    │   ├── engine.ts (计算核心)
    │   ├── 各期展开面板 (P1-P9)
    │   └── P4HireLinkagePanel.tsx (待创建 — 第四期雇佣联动)
    ├── ResultsTab.tsx (结果展示)
    └── RulesTab.tsx (规则说明)
```

---

## 已知约束与规则

1. **路由约束**：wouter 已打 patch 以支持 GitHub Pages 的 hash 路由模式，不可随意升级版本
2. **样式约束**：使用 TailwindCSS v4，不使用 v3 的配置文件方式
3. **组件约束**：UI组件必须使用 shadcn/ui，不引入其他UI库
4. **状态管理**：使用 React 原生 useState/useContext，不引入 Redux/Zustand
5. **数据约束**：所有排产规则数据来源于 rule.xls，不可随意修改计算公式

---

## 用户偏好与风格要求

- **代码风格**：TypeScript 严格模式，函数式组件，避免 class 组件
- **UI风格**：工业数据仪表盘风格，深色背景（#0F172A），琥珀色主色调（#F59E0B）
- **命名规范**：组件用 PascalCase，函数用 camelCase，常量用 UPPER_SNAKE_CASE
- **注释风格**：关键计算逻辑必须有中文注释说明业务含义
- **提交规范**：使用 Conventional Commits（feat/fix/chore/docs）

---

## 外部依赖与接口

| 依赖 | 类型 | 说明 |
|------|------|------|
| rule.xls | 本地文件 | 排产规则原始数据，已解析到 data.ts |
| test - 1.xls | 本地文件 | 测试数据集 |
| GitHub Pages | 部署平台 | 通过 gh-pages 分支自动部署 |

---

## 历史对话摘要

| 时间 | 关键决策/指令 |
|------|--------------|
| 2026-03-04 | 修复参数模拟器颜色映射，严格核对各参数的颜色对应关系 |
| 2026-03-04 | 配置 GitHub Pages base path，解决 wouter 路由在子路径下的问题 |
| 2026-03-04 | 确认第四期雇佣联动面板为下一个开发目标 |
