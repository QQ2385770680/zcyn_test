# AI指挥家 — 功能需求任务队列

> 此文件记录用户提出的所有功能需求，AI指挥家在执行前必须先将需求同步到此文件并提交至仓库。

---

## 任务队列

| 编号 | 需求描述 | 优先级 | 状态 | 提出时间 | 完成时间 |
|------|----------|--------|------|----------|----------|
| F001 | 参数模拟器"一键排产最优"和"本期最优推荐"求解数据应按必填(黄色)优先、选填(橙色)其次、灰色不填的优先级排产 | HIGH | 已完成 | 2026-03-05 | 2026-03-05 |

---

## F001 详细描述

**需求来源**：用户直接指令

**问题描述**：当前一键排产最优和本期最优推荐功能的求解逻辑未严格遵循班次格子的颜色优先级。应当确保：

1. **必填格（黄色）**：最优求解时优先填入产量数据
2. **选填格（橙色）**：在必填格填满后，再考虑选填格
3. **不填格（灰色）**：求解时不应填入任何数据，保持为空

**验收标准**：

- 一键排产最优功能按上述优先级正确分配产量
- 每期的本期最优推荐按上述优先级正确分配产量
- 灰色格子在最优求解后仍为空（0或不填）
- 必填格优先获得产量分配

---

## 执行进度日志

| 时间 | 操作 | 状态 |
|------|------|------|
| 2026-03-05 03:35 | 需求录入并同步到仓库 | done |
| 2026-03-05 03:40 | 阅读 engine.ts 分析 COLOR_MAP 和 optimizeShiftPlan 逻辑 | done |
| 2026-03-05 03:42 | 发现问题：optimizeShiftPlan 使用硬编码排产模式，未参考 COLOR_MAP | done |
| 2026-03-05 03:45 | 重写 optimizeShiftPlan 为颜色感知版本，新增 period 参数 | done |
| 2026-03-05 03:45 | 新增辅助函数：getYellowCells, getOrangeCells, evaluatePlan, _solveShiftGroup, _solveOt2Multi | done |
| 2026-03-05 03:45 | 保留 _optimizeShiftPlanGeneric 用于无颜色标记的 P6-P9 | done |
| 2026-03-05 03:46 | 更新所有调用点：optimizeAllPeriods, applyOptimalSingle, previewP4Linkage | done |
| 2026-03-05 03:46 | Vite 生产构建成功（7.01s） | done |
| 2026-03-05 03:46 | 提交到 main 分支（commit: ff03a99d） | done |
| 2026-03-05 03:47 | 部署到 gh-pages 分支（commit: 99351493） | done |
| 2026-03-05 03:48 | GitHub Pages 在线验证通过 | done |

---

## F001 技术变更摘要

**修改文件**：

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `client/src/lib/engine.ts` | 重写+新增 | 重写 `optimizeShiftPlan` 为颜色感知版本，新增 `period` 参数；新增辅助函数 `getYellowCells`、`getOrangeCells`、`evaluatePlan`、`_solveShiftGroup`、`_solveOt2Multi`；保留 `_optimizeShiftPlanGeneric` 用于 P6-P9 |
| `client/src/components/SimulatorTab.tsx` | 修改 | 更新 `applyOptimalSingle` 调用传递 `periodIdx + 1` 参数 |

**核心算法变更**：

旧算法使用硬编码的固定排产模式（第一班C+D、第二班B、一加A、二加D+B），不考虑每期不同的颜色标记。新算法根据每期 `COLOR_MAP` 中的黄色格子分布动态决定哪些格子可以填值，按班次顺序逐步求解，确保只在黄色格中分配产量，灰色格保持为0。

**验证结果**：

P1 期验证显示所有6个黄色格（shift1_C, shift1_D, ot1_A, shift2_B, ot2_B, ot2_D）均获得产量分配，所有10个灰色格均保持为0。P6-P9 无颜色标记的期数使用通用启发式算法，产量正常。
