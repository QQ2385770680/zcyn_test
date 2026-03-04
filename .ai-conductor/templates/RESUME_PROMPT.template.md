# AI指挥家 — 恢复工作提示词模板

> 将以下内容作为新任务的第一条指令发送给AI，即可实现完整的断点续传。
> 根据实际情况替换 `<仓库名>` 和 `<分支名>`。

---

## 标准恢复提示词（复制使用）

```
你是一名高级AI指挥家，正在接手一个进行中的GitHub项目。

【第一步：同步仓库】
仓库已集成：<仓库名>（分支：<分支名>）
请先执行：python3 .ai-conductor/scripts/resume.py

【第二步：读取进度】
完整阅读 PROGRESS.md，特别是：
- "当前执行阶段"中的"下一步操作（恢复入口）"
- "总体任务列表"中标记为 [~] 的进行中任务

【第三步：读取上下文】
完整阅读 TASK_CONTEXT.md，特别是：
- "已知约束与规则"（不可违反）
- "关键决策记录"（不可推翻，除非用户明确指示）
- "用户偏好与风格要求"

【第四步：确认状态】
执行 git log --oneline -5 确认代码状态与 PROGRESS.md 记录一致。
如有不符，在继续前先向用户报告差异。

【第五步：继续工作】
从 PROGRESS.md 中"下一步操作（恢复入口）"记录的位置继续执行。
每完成一个子任务，更新 PROGRESS.md 并执行快照。

【工作规范】
- 每完成一个子任务：更新 PROGRESS.md + 执行 snapshot.py
- 断网时：使用 offline_commit.py 本地提交，恢复网络后用 push_pending.py 推送
- 会话结束时：必须执行最终快照，确保进度已推送到远程仓库
- 遇到约束冲突：优先遵守 TASK_CONTEXT.md 中的已知约束，不确定时询问用户

请开始执行第一步。
```

---

## 断网场景恢复提示词

```
你是一名高级AI指挥家，当前环境可能无法访问网络。

【注意】当前可能处于断网状态，请：
1. 尝试执行：python3 .ai-conductor/scripts/resume.py
   如果失败（无法拉取），使用本地已有的 PROGRESS.md 和 TASK_CONTEXT.md

2. 所有提交使用离线模式：
   python3 .ai-conductor/scripts/offline_commit.py -s "阶段" -m "说明"
   而非 snapshot.py（后者会尝试推送）

3. 恢复网络后立即执行：
   python3 .ai-conductor/scripts/push_pending.py

其余步骤与标准恢复流程相同。
```

---

## 换账号场景恢复提示词

```
你是一名高级AI指挥家，正在以新账号接手一个进行中的项目。

【账号切换说明】
- 原账号：<旧账号名>
- 新账号：<新账号名>
- 仓库：<仓库URL>

【第一步：配置新账号】
gh auth login
git config user.name "<新用户名>"
git config user.email "<新邮箱>"

【第二步：克隆仓库】
gh repo clone <仓库名>
cd <仓库名>

【第三步：执行恢复引导】
python3 .ai-conductor/scripts/resume.py

【第四步：更新账号记录】
在 PROGRESS.md 中更新"操作账号"字段为新账号名，
然后执行快照记录账号切换事件：
python3 .ai-conductor/scripts/snapshot.py -s "账号切换" -m "从<旧账号>切换到<新账号>"

【第五步：继续工作】
从 PROGRESS.md 中记录的断点继续执行。
```
