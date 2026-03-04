# AI指挥家 — 工作进度快照

> 此文件由AI指挥家自动维护，每次任务暂停或完成一个阶段时必须更新并提交至仓库。
> 恢复工作时，AI必须首先读取此文件，再读取 `TASK_CONTEXT.md`，然后才能继续执行。

---

## 元数据

| 字段 | 值 |
|:---|:---|
| **快照版本** | v0.7.0 |
| **快照时间** | 2026-03-05T12:30:00+08:00 |
| **操作账号** | QQ2385770680 |
| **当前分支** | main |
| **最新Commit** | 见 git log |
| **下次恢复优先级** | LOW |

---

## 项目概述

**iBizSim 连续排产规则计算器** — 企业竞争模拟大赛的生产排产工具，展示9期排产数据、多班次产能分析、排班成本对比等内容。

---

## 总体任务列表

- [x] 项目初始化与基础架构搭建
- [x] 核心计算引擎（engine.ts）实现
- [x] 参数模拟器颜色映射优化
- [x] 第四期雇佣联动面板（P4HireLinkagePanel）
- [x] **F001: 最优排产按颜色优先级求解**
- [x] **F002: 优化求解算法，严格禁止超限**
- [x] **F003: 求解算法文档化**
- [x] **F004: 参数模拟器规则验证**
- [x] **F005: 优化二加资源显示**
- [x] **F006: 生成 rule.xls 公式文档**
- [x] **F007: AI指挥官工作流更新**
- [x] **F008: 产品参数ABCD可输入变量**

---

## 当前执行阶段（断点位置）

### 阶段名称
F008 产品参数可输入变量完成，等待新指令

### 已完成步骤

1.  **需求分析**：
    - 分析 `data.ts` 中 `products` 常量定义（A/B/C/D 各含 machineTime, laborTime, materials）
    - 分析 `engine.ts` 中 `PRODUCTS`、`MACHINE_PER`、`LABOR_PER` 常量的使用方式
    - 确认所有引用点：`engine.ts`（约60+处）、`SimulatorTab.tsx`、`CapacityTab.tsx`、`RulesTab.tsx`

2.  **data.ts 修改**：
    - 新增 `ProductSpecInput` 接口（machineTime, laborTime, materials）
    - 新增 `DEFAULT_PRODUCTS` 常量（保留原始默认值）
    - 原 `products` 数组保留不变（供其他 Tab 使用）

3.  **engine.ts 修改**：
    - 将 `PRODUCTS` 从 `const` 改为 `let _activeProducts`（可变模块级变量）
    - 新增 `setActiveProducts(specs)` 函数，接受外部产品参数并更新内部变量
    - 新增 `getActiveProducts()` 函数，供外部读取当前活动产品参数
    - `SimulatorParams` 接口新增 `productSpecs` 可选字段
    - `getMachinePerUnit(p)` 和 `getLaborPerUnit(p)` 改为使用 `_activeProducts`
    - 将所有函数内部的 `MACHINE_PER[x]` 替换为局部变量 `MP[x]`（通过 `getMachinePerUnit` 获取）
    - 将所有函数内部的 `LABOR_PER[x]` 替换为局部变量 `LP[x]`（通过 `getLaborPerUnit` 获取）
    - 总计替换约60+处引用

4.  **SimulatorTab.tsx 修改**：
    - 新增 `productSpecs` state（类型为 `ProductSpecInput[]`）
    - 新增 `updateProductSpec(index, field, value)` 函数
    - 新增可折叠的「产品规格参数」面板，包含：
      - 4行（A/B/C/D）× 3列（机器时/人力时/原材料）输入表格
      - 右侧自动计算「机器/单位」和「人力/单位」
      - 修改值后自动高亮（绿色边框）
      - 底部显示「恢复默认值」按钮
    - 重置参数时同步重置产品参数

5.  **构建与UI验证**：
    - `pnpm run build` 构建成功
    - 开发服务器启动，UI 验证通过
    - 产品规格参数面板展开/折叠正常
    - 输入框默认值正确（A:110/80/500, B:150/100/800, C:180/110/1600, D:280/140/2500）
    - 机器/单位和人力/单位自动计算正确

### 下一步操作（恢复入口）

> **恢复指令**：
> 1. 严格遵循 `TASK_CONTEXT.md` 中定义的"AI指挥官工作流"。
> 2. 首先读取 `TASK_QUEUE.md` 查看待执行功能需求。
> 3. 如有新需求，先同步到 `TASK_QUEUE.md` 再执行。

---

## 文件变更摘要 (v0.7.0)

| 文件路径 | 变更类型 | 变更说明 |
|:---|:---|:---|
| `ibiz-production/client/src/lib/data.ts` | 更新 | 新增 `ProductSpecInput` 接口和 `DEFAULT_PRODUCTS` 常量 |
| `ibiz-production/client/src/lib/engine.ts` | 重构 | `PRODUCTS` 改为 `_activeProducts`，新增 `setActiveProducts()`/`getActiveProducts()`，所有 `MACHINE_PER`/`LABOR_PER` 改为动态获取 |
| `ibiz-production/client/src/components/SimulatorTab.tsx` | 更新 | 新增产品规格参数面板（可折叠、4×3输入表格、恢复默认值） |
| `TASK_QUEUE.md` | 更新 | 新增 F007 任务记录并标记为已完成 |
| `PROGRESS.md` | 更新 | v0.7.0 快照 |

---

## 重要技术决策

| 时间 | 决策 | 原因 |
|:---|:---|:---|
| 2026-03-05 | 使用模块级 `_activeProducts` 变量而非参数传递 | engine.ts 中有60+处引用，参数传递改动量过大且容易遗漏 |
| 2026-03-05 | 在函数入口获取局部 `MP`/`LP` 变量 | 避免在每次计算时重复调用函数，提高性能 |
| 2026-03-05 | 产品参数面板默认折叠 | 大多数用户不需要修改产品参数，保持界面简洁 |

---

## 历史快照索引

| 快照时间 | Commit | 阶段描述 |
|:---|:---|:---|
| 2026-03-05 | v0.7.0 | F008: 产品参数ABCD可输入变量 |
| 2026-03-05 | v0.6.0 | F007: AI指挥官工作流更新，固化三文件SOP |
| 2026-03-05 | 1c6e1f8c | F006: 生成 rule.xls 公式详解文档 |
| 2026-03-05 | 61976a72 | F003/F004/F005: 算法文档化、规则验证、UI优化 |
| 2026-03-05 | v0.4.0 | F002: 优化求解算法禁止超限完成 |
| 2026-03-05 | ff03a99d | F001: 最优排产按颜色优先级求解完成 |
| 2026-03-05 | 6179c905 | P4雇佣联动面板完成，全面部署验证通过 |
| 2026-03-04 | bb72d395 | 参数模拟器颜色映射优化完成 |
