# AI 恢复文档 — ibiz-platform 前端

## 当前状态
- **阶段**：阶段十一完成（三档求解算法实现）
- **Manus 项目名**：ibiz-sim
- **最新 Manus 检查点**：`2d93d703`
- **技术栈**：React 19 + Tailwind 4 + shadcn/ui + wouter + Vite

## 恢复步骤
1. 克隆仓库 `gh repo clone QQ2385770680/zcyn_test`
2. 读取本文件和根目录 `AI_RESUME.md` 了解整体流程
3. 读取 `PROGRESS.md` 了解各阶段开发记录
4. 读取 `todo.md` 了解待办任务
5. 将 `ibiz-platform/` 代码复制到 Manus webdev 项目目录
6. 安装依赖并启动开发服务器

## 已完成功能
1. Landing 页面（导航栏、Hero、功能特性、使用流程、页脚）
2. 登录/注册/管理员登录 + AuthContext 认证体系
3. 用户仪表盘框架（DashboardLayout + AppSidebar + AppHeader）
4. 全局配置页面（产品规格参数 ABCD）
5. 生产模拟器（计算引擎驱动，6 约束检查点，8 期排产，一键最优）
6. 方案设计器（1-8 期产量/雇佣/机器购买配置，localStorage 持久化）
7. 我的方案 + 方案市场 + 管理后台
8. UI 优化：首页标题、侧边栏动画流畅度、页面切换闪烁修复
9. 三档求解算法（快速/标准/探索）：加权贪心、全局ILP、模拟退火，操作栏三按钮切换

## P0 待完成
- 方案设计器与模拟器联动（设计 → 模拟 → 验证闭环）
- 收入/成本/利润计算（需要市场价格数据）
- 多期联动完善（库存结转、机器折旧/购买）

## 关键文件
- `client/src/App.tsx` — 路由系统（React.lazy 懒加载）
- `client/src/components/DashboardLayout.tsx` — 仪表盘布局
- `client/src/components/AppSidebar.tsx` — 侧边栏导航
- `client/src/components/production/Simulator.tsx` — 生产模拟器
- `client/src/components/production/Designer.tsx` — 方案设计器
- `client/src/lib/productionEngine.ts` — 计算引擎
- `client/src/lib/ConfigContext.tsx` — 全局配置上下文
- `client/src/lib/DesignPlanContext.tsx` — 方案设计上下文

## 备份规则
每个阶段结束后必须：
1. Manus `webdev_save_checkpoint` 保存检查点
2. 同步代码到 GitHub 仓库 `QQ2385770680/zcyn_test/ibiz-platform/`
3. 更新 PROGRESS.md 和 AI_RESUME.md
