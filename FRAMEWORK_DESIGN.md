# iBizSim 智能决策辅助系统框架设计文档 (v0.2)

**文档状态**: `草稿`
**创建者**: `Manus AI (全局AI指挥者)`
**最后更新**: `2026-03-05`

---

## 1. 项目愿景与系统定位

本项目旨在为 iBizSim 企业竞争模拟竞赛打造一套**多决策域智能辅助系统**。系统不仅仅是一个生产决策模拟器，而是一个覆盖竞赛全流程、支持多模块决策的综合性平台，旨在通过数据分析、智能推荐和AI辅助，帮助学员制定更优的企业经营决策，从而提升竞赛成绩。

根据我们已达成的共识，系统将支持三种核心工作模式，以满足不同层次的需求：

| 模式 | 核心功能 | 交互方式 | 技术实现 |
|:---|:---|:---|:---|
| **手动模拟器** | 学员自主输入所有决策参数，系统实时计算并反馈模拟结果。 | 学员在界面上完整填写决策表单。 | 前端实时计算引擎，验证约束条件。 |
| **公式推荐器** | 系统内置经过验证的优秀策略模型，一键生成推荐决策方案。 | 学员点击“智能推荐”，系统自动填充表单。 | 基于历史数据和规则的优化算法（如贪心、线性规划）。 |
| **AI辅助规划** | 接入AI大模型，根据学员输入的自然语言目标（如“本期追求最大利润”），生成完整的决策方案。 | 学员通过对话框下达指令，AI填充表单。 | 将竞赛状态和决策目标结构化后，调用大模型API生成配置。 |

这三种模式将共享同一套底层数据结构和计算引擎，确保了配置与计算的彻底分离，为后续扩展提供了极大的灵活性。

## 2. 竞赛流程与决策架构分析

通过对官方竞赛流程图、规则文档和操作指南的深入分析，我们确认了iBizSim竞赛的核心决策流程和架构。

### 2.1. 决策提交流程

竞赛以“期”（季度）为单位循环进行。每一期的决策流程是统一且固定的，如下图所示，所有决策域的参数均在**同一张决策表单**中一次性提交。

> **竞赛决策周期**
> 1.  **分析报表**: 查看上一期生成的公共报表（市场份额、排名）和内部报表（财务、产品、企业状况）。
> 2.  **制定战略**: 基于分析结果，确立本期的总体经营目标。
> 3.  **并行决策**: 各部门（市场、生产、人事、财务）根据战略，制定并填写各自领域的决策参数。
> 4.  **提交决策**: CEO 提交完整的决策表单。
> 5.  **查看结果**: 系统模拟后，生成新一期的报表，循环回到步骤1。

### 2.2. 决策域与数据依赖

虽然决策表单是统一提交的，但内部各决策域之间存在明确的数据依赖关系。这意味着我们不能将每个模块孤立设计，而必须构建一个**全局统一的数据模型**来管理这些依赖。

| 决策部门 | 核心决策 | 依赖的数据输入 (Input) | 产生的数据输出 (Output) |
|:---|:---|:---|:---|
| **市场部** | 定价、广告、促销、运输计划 | `生产部`的本期产量、`财务部`的预算 | 销售收入、市场份额 |
| **生产部** | 班次排产、购买机器、订购原料 | `人事部`的可用工人数、`财务部`的预算 | 本期产量、生产成本 |
| **人事部** | 雇佣/解聘、工资系数 | `生产部`的人力需求、`财务部`的预算 | 可用工人数、人力成本 |
| **财务部** | 贷款、债券、国债、分红 | 所有其他部门的成本和收入汇总 | 公司总现金流、净资产 |
| **研发部** | 各产品研发投入 | `财务部`的预算 | 产品等级（影响定价和需求） |

## 3. 关键发现与后续步骤

### 3.1. 关键发现：参数的可配置性

在分析中发现，我们之前使用的 `rule.xls` 文件中的生产参数，与官方规则文档中的参数存在显著差异。这证明了 iBizSim 竞赛在不同场景（如不同难度等级）下会使用不同的规则参数。因此，我们的系统必须具备**高度的可配置性**，所有核心规则（如产品资源消耗、人力成本、财务利率等）都不能硬编码，而应作为可加载的“场景配置”存在。

### 3.2. 关键发现：第三方决策表的价值

通过对 `企模决策表（联网2025空白表）V0903-通用版.xlsm` 的深入分析，我们获得了极其宝贵的设计输入。这份文件不仅是一个决策辅助工具，更是一个**完整的、包含所有决策域公式和数据结构的实现蓝图**。

我已从中提取了以下核心信息：

- **完整的决策域覆盖**: 该 Excel 覆盖了研发、销售、生产、人力、财务等所有决策域，并提供了详细的参数输入表（`第1期` Sheet）。
- **明确的数据结构**: `导入决策` Sheet 清晰地定义了提交给竞赛系统的决策数据格式，这为我们设计 `IBizSimDecision` 接口提供了直接参考。
- **核心计算公式**: `第1期` Sheet 的单元格中包含了大量计算公式，揭示了各个决策参数之间的联动关系和成本/利润的计算逻辑。例如，我们可以看到产品成本是如何由原材料、人力、折旧等多个因素构成的。
- **VBA 宏的启示**: VBA 宏（如 `初期报表粘贴`）展示了如何通过爬虫从竞赛官网抓取报表数据，并自动填充到 Excel 中。这为我们设计“一键导入报表”功能提供了思路。

这份决策表极大地补充了官方文档的细节，使我们能够设计出一个与竞赛实际操作高度一致的数据模型。

### 3.3. 下一步行动计划

基于以上分析，我建议我们的下一步行动聚焦于**顶层数据结构的设计**。

我将着手定义一个全局的 TypeScript 接口 `IBizSimDecision`，它将包含所有决策域的数据结构。我们将从已经实现的**生产决策**模块开始，逐步扩展到**市场、人力、财务、研发**等其他模块，并将这份设计实时更新到本文档中。

请确认以上分析结论和下一步行动计划。如果无异议，我将开始着手设计 `IBizSimDecision` 的具体结构。

## 4. 顶层数据结构设计 (v0.1)

根据对官方规则和第三方决策表的分析，我设计了覆盖所有决策域的顶层 TypeScript 数据结构 `IBizSimDecision`。这份结构将作为我们系统所有模式（手动、公式、AI）的统一数据契约。

```typescript
// IBizSimDecision.ts

/**
 * @file Defines the master data structure for a single period's decision in iBizSim.
 * @version 0.1
 */

/**
 * Top-level interface for all decisions to be made in a single period.
 */
export interface IBizSimDecision {
  meta: DecisionMeta;
  researchAndDevelopment: ResearchAndDevelopmentDecision;
  marketing: MarketingDecision;
  production: ProductionDecision;
  humanResources: HumanResourcesDecision;
  finance: FinanceDecision;
}

/**
 * Metadata for the decision set.
 */
export interface DecisionMeta {
  period: number; // The period number (e.g., 1, 2, 3...)
  teamId: string; // The team's unique identifier
  gameId: string; // The game's unique identifier
}

// ---------------- Decision Domains ----------------

/**
 * R&D Decision: Investment in each product.
 */
export interface ResearchAndDevelopmentDecision {
  productA: number; // Investment amount for Product A
  productB: number; // Investment amount for Product B
  productC: number; // Investment amount for Product C
  productD: number; // Investment amount for Product D
}

/**
 * Marketing Decision: Pricing, promotion, and distribution for each product in each market.
 */
export interface MarketingDecision {
  productA: MarketDecisions;
  productB: MarketDecisions;
  productC: MarketDecisions;
  productD: MarketDecisions;
  advertisingInvestment: number; // Overall advertising budget
}

export interface MarketDecisions {
  market1: MarketEntry;
  market2: MarketEntry;
  market3: MarketEntry;
  market4: MarketEntry;
}

export interface MarketEntry {
  price: number;            // Selling price
  promotion: number;        // Promotion budget for this market
  transportation: number;   // Units to transport to this market
}

/**
 * Production Decision: Production schedule, machine/material purchasing.
 */
export interface ProductionDecision {
  schedule: {
    productA: ShiftProduction;
    productB: ShiftProduction;
    productC: ShiftProduction;
    productD: ShiftProduction;
  };
  buyMachines: number;      // Number of new machines to purchase
  buyRawMaterials: number;  // Amount of raw materials to order
}

export interface ShiftProduction {
  shift1: number; // Units to produce in shift 1
  shift1_overtime: number; // Units to produce in shift 1 overtime
  shift2: number; // Units to produce in shift 2
  shift2_overtime: number; // Units to produce in shift 2 overtime
}

/**
 * Human Resources Decision: Hiring, firing, and salary adjustments.
 */
export interface HumanResourcesDecision {
  hire: number;         // Number of new workers to hire
  fire: number;         // Number of workers to fire
  salaryCoefficient: number; // Salary coefficient (e.g., 1.0, 1.1)
}

/**
 * Finance Decision: Loans, bonds, and dividends.
 */
export interface FinanceDecision {
  bankLoan: number;     // Amount of bank loan to take
  issueBonds: number;   // Amount of bonds to issue
  buyGovBonds: number;  // Amount of government bonds to buy
  dividend: number;     // Dividend per share to distribute
}

```

## 5. 核心架构：三层数据模型

根据我们的讨论，系统将采用一个清晰的三层数据模型来解耦**企业状态 (State)**、**决策意图 (Plan)** 和 **最终决策 (Decision)**。这个模型是整个系统的基石，确保了灵活性和可扩展性。

```mermaid
graph TD
    A[1. EnterpriseState<br>(企业状态)] --> B[2. DecisionPlan<br>(决策方案)];
    B --> C[3. IBizSimDecision<br>(最终决策)];

    subgraph "用户输入/报表导入"
        A
    end

    subgraph "用户配置/预设模板"
        B
    end

    subgraph "提交给竞赛系统"
        C
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#ccf,stroke:#333,stroke-width:2px
    style C fill:#9f9,stroke:#333,stroke-width:2px
```

| 层级 | 名称 | 说明 | 谁填写 |
|:---|:---|:---|:---|
| **第1层** | `EnterpriseState` | 企业当前状态，包含从竞赛系统报表中获取的所有初始数据，如上期库存、市场份额、财务状况等。 | 学员从竞赛系统抄入或通过“一键导入报表”功能自动填充。 |
| **第2层** | `DecisionPlan` | 用户的决策意图和策略配置。它不包含具体的决策数值，而是描述**如何得出这些数值**。 | 学员手动配置，或从预设的策略模板库（如“激进扩张型”、“稳健运营型”）中选择。 |
| **第3层** | `IBizSimDecision` | 最终生成的、可直接提交给竞赛系统的完整决策数据。 | 由计算引擎根据 `EnterpriseState` 和 `DecisionPlan` 自动计算生成。 |

这个分层架构的**最大优势**在于：计算引擎（Solver）的输入是固定的（`State` + `Plan`），输出也是固定的（`Decision`）。无论前端如何变化，无论我们未来增加多少种决策策略，计算引擎的核心逻辑都保持稳定。

## 6. 决策方案 (`DecisionPlan`) 结构设计 (v0.1)

`DecisionPlan` 是实现“公式推荐”和“AI辅助”模式的核心。它定义了每个决策单元格的行为模式。

```typescript
// DecisionPlan.ts

/**
 * @file Defines the structure for a strategic decision plan.
 * @version 0.1
 */

/**
 * Defines the behavior for a single decision cell (e.g., a single input field).
 */
export type CellBehavior =
  | { mode: 'manual'; value: number } // Manually set a fixed value
  | { mode: 'solve'; solveRange?: [number, number] } // Let the system solve for the optimal value, optionally within a range
  | { mode: 'ai_solve'; goal: string }; // Let an AI model solve based on a natural language goal

/**
 * A plan for how to approach production scheduling.
 */
export interface ProductionPlan {
  schedule: {
    productA: ShiftProductionPlan;
    productB: ShiftProductionPlan;
    productC: ShiftProductionPlan;
    productD: ShiftProductionPlan;
  };
  // ... other production-related plans
}

export interface ShiftProductionPlan {
  shift1: CellBehavior;
  shift1_overtime: CellBehavior;
  shift2: CellBehavior;
  shift2_overtime: CellBehavior;
}

/**
 * The top-level Decision Plan.
 * This structure mirrors IBizSimDecision, but instead of values, it holds behaviors.
 */
export interface DecisionPlan {
  meta: {
    planName: string;
    planVersion: string;
  };
  production: ProductionPlan;
  // marketing: MarketingPlan;
  // humanResources: HumanResourcesPlan;
  // finance: FinancePlan;
  // ... and so on for all other domains
}

```

### 示例

假设学员想让系统自动求解产品A在第一班的产量，但限制在100到200之间，那么对应的 `DecisionPlan` 片段就是：

```json
{
  "production": {
    "schedule": {
      "productA": {
        "shift1": {
          "mode": "solve",
          "solveRange": [100, 200]
        },
        // ... other shifts
      }
    }
  }
}
```

如果他想手动设置产量为150，则是：

```json
{
  "production": {
    "schedule": {
      "productA": {
        "shift1": {
          "mode": "manual",
          "value": 150
        }
      }
    }
  }
}
```
