# AI 指挥者恢复指令 (AI Resume Instruction)

**最后更新**: `2026-03-07`
**当前状态**: `阶段十一完成 — 三档求解算法实现，已恢复到 Manus 平台（ibiz-sim，checkpoint a6c15ea0）`

---

## 恢复步骤 (Recovery Steps)

当您在新的窗口或会话中需要恢复我的工作状态时，请直接复制并发送以下**单行指令**给我：

```
请克隆仓库 QQ2385770680/zcyn_test/ibiz-platform/，读取目录下的 AI_RESUME.md 文件，并按照其中的恢复指令恢复工作, 并读取QQ2385770680/zcyn_test根目录下的 AI_RESUME.md 文件熟悉整体流程，读取完毕后告诉我给你下一步指令
```

---

## 恢复指令 (Resume Instruction for AI)

你好，我是本项目的AI指挥者。请按照以下步骤恢复我的工作状态：

1.  **读取核心设计文档**：请首先完整读取并理解仓库根目录下的 `FRAMEWORK_DESIGN.md` 文件。这是我们项目的最高纲领文档，包含了所有已敲定的设计决策。

2.  **确认当前任务阶段**：项目当前处于 **阶段十一完成** 状态。已实现三档求解算法：快速（加权贪心）、标准（分层贪心+迭代修正）、探索（模拟退火），操作栏三按鈕切换。项目已恢复到 Manus 平台（webdev 项目名 `ibiz-sim`，checkpoint `a6c15ea0`）。

3.  **阅读子项目恢复指令**：读取 `ibiz-platform/AI_RESUME.md` 获取前端项目的详细状态、文件结构和环境搭建步骤。

4.  **阅读任务清单**：读取 `ibiz-platform/todo.md` 了解已完成项和待完成项的优先级。

5.  **阅读开发进度**：读取 `ibiz-platform/PROGRESS.md` 了解各阶段的详细开发记录。

6.  **搭建环境**：按照 `ibiz-platform/AI_RESUME.md` 中的"九、恢复操作步骤"搭建开发环境。

7.  **向用户汇报**：完成以上步骤后，向用户汇报你已成功恢复上下文，并询问下一步指令。

---

## 项目概况

| 项目 | 说明 |
|------|------|
| 项目名称 | iBizSim 智能决策辅助系统 |
| 技术栈 | React 19 + Tailwind CSS 4 + shadcn/ui + Wouter + Vite |
| 前端代码 | `ibiz-platform/` 目录 |
| Manus 项目 | `ibiz-sim`（webdev 静态项目） |
| 当前阶段 | 阶段十一（三档求解算法实现完成） |
| Manus 检查点 | `a6c15ea0` |
| 下一步 | 方案设计器与模拟器联动、收入/成本/利润计算、多期联动完善 |

---

## 相关文档索引

| 文档 | 说明 |
|------|------|
| `FRAMEWORK_DESIGN.md` | 系统框架设计文档（最高纲领） |
| `TASK_CONTEXT.md` | 项目背景和需求上下文 |
| `RULE_FORMULAS.md` | iBizSim 竞赛规则和计算公式 |
| `SOLVER_ALGORITHM.md` | 求解算法设计文档 |
| `TASK_QUEUE.md` | 任务队列和优先级 |
| `ibiz-platform/AI_RESUME.md` | 前端项目恢复指令（详细） |
| `ibiz-platform/todo.md` | 详细任务清单 |
| `ibiz-platform/PROGRESS.md` | 开发进度记录 |
