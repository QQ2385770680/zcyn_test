# AI指挥家 — 断点续传操作手册

> **适用场景**：断网、更换账号、切换AI实例、跨任务会话恢复
> **核心原则**：所有进度信息持久化在仓库中，任何AI实例均可从仓库状态完整恢复工作

---

## 一、体系架构概览

```
仓库根目录/
├── PROGRESS.md              ← 进度快照（断点位置、任务状态）
├── TASK_CONTEXT.md          ← 任务上下文（架构、规则、决策）
└── .ai-conductor/
    ├── AI_CONDUCTOR_MANUAL.md   ← 本手册
    ├── scripts/
    │   ├── snapshot.py          ← 进度快照工具（正常/断网均可用）
    │   ├── resume.py            ← 工作恢复引导工具
    │   ├── offline_commit.py    ← 断网离线提交工具
    │   └── push_pending.py      ← 恢复网络后推送工具
    ├── templates/
    │   ├── PROGRESS.template.md     ← 进度文件模板
    │   └── TASK_CONTEXT.template.md ← 上下文文件模板
    └── snapshot_log.json        ← 快照历史日志（自动生成）
```

---

## 二、AI指令规范

### 2.1 任务开始时（必须执行）

```
【AI指令 - 任务启动】

在开始任何实质性工作之前，必须按以下顺序执行：

1. 执行恢复引导：
   python3 .ai-conductor/scripts/resume.py

2. 完整阅读 PROGRESS.md，重点关注：
   - "当前执行阶段"中的"下一步操作（恢复入口）"
   - "总体任务列表"中的任务状态

3. 完整阅读 TASK_CONTEXT.md，重点关注：
   - "已知约束与规则"
   - "关键决策记录"

4. 执行 git log --oneline -5 确认代码状态

5. 确认理解后，从 PROGRESS.md 中记录的断点位置继续工作
```

### 2.2 完成每个子任务后（必须执行）

```
【AI指令 - 子任务完成】

每完成一个子任务（如创建一个组件、修复一个Bug），必须：

1. 更新 PROGRESS.md：
   - 将已完成的步骤标记为完成
   - 更新"下一步操作"为下一个具体步骤

2. 更新 todo.md（如存在）：
   - 勾选已完成的任务项

3. 执行快照（有网络时）：
   python3 .ai-conductor/scripts/snapshot.py \
     -s "子任务名称" \
     -m "具体完成内容描述"
```

### 2.3 完成重要阶段后（必须执行）

```
【AI指令 - 阶段完成】

完成一个完整阶段（如完成一个功能模块）时，必须：

1. 更新 PROGRESS.md：
   - 将该阶段任务标记为 [x] 已完成
   - 更新"当前执行阶段"为下一阶段
   - 更新"历史快照索引"

2. 更新 TASK_CONTEXT.md：
   - 在"历史对话摘要"中记录本阶段的关键决策
   - 更新"组件依赖关系"（如有新增组件）

3. 执行完整快照：
   python3 .ai-conductor/scripts/snapshot.py \
     -s "阶段名称" \
     -m "阶段完成总结"
```

### 2.4 断网时（必须执行）

```
【AI指令 - 断网处理】

检测到网络不可用时，必须：

1. 立即执行离线提交，保存当前所有变更：
   python3 .ai-conductor/scripts/offline_commit.py \
     -s "当前阶段" \
     -m "断网前进度说明"

2. 在 PROGRESS.md 的"下一步操作"中记录：
   - 断网时间
   - 已完成到哪一步
   - 恢复网络后的第一步操作

3. 继续在本地工作（无需网络的部分），
   每完成一个步骤执行一次离线提交

4. 恢复网络后立即执行：
   python3 .ai-conductor/scripts/push_pending.py
```

### 2.5 更换账号时（必须执行）

```
【AI指令 - 账号切换】

需要更换GitHub账号时，必须：

【旧账号操作（切换前）】
1. 执行完整快照（确保所有进度已提交）：
   python3 .ai-conductor/scripts/snapshot.py \
     -s "账号切换前" \
     -m "切换账号，保存当前完整进度"

2. 在 PROGRESS.md 中记录：
   - 旧账号：[旧账号名]
   - 切换时间：[时间]
   - 新账号需要的权限：[仓库访问权限说明]

3. 确认推送成功：git log --oneline -3

【新账号操作（切换后）】
1. 重新配置git凭据：
   gh auth login
   git config user.name "新用户名"
   git config user.email "新邮箱"

2. 克隆仓库（或拉取最新代码）：
   gh repo clone <仓库名>
   # 或
   git pull origin main

3. 执行恢复引导：
   python3 .ai-conductor/scripts/resume.py

4. 更新 PROGRESS.md 中的"操作账号"字段

5. 从断点继续工作
```

### 2.6 任务结束时（必须执行）

```
【AI指令 - 任务结束】

每次工作会话结束时，无论是否完成所有任务，必须：

1. 更新 PROGRESS.md：
   - 更新"快照时间"
   - 更新"下一步操作（恢复入口）"为最精确的断点描述
   - 更新"测试状态"

2. 执行最终快照：
   python3 .ai-conductor/scripts/snapshot.py \
     -s "会话结束" \
     -m "本次会话完成内容简述"

3. 确认推送成功后，向用户报告：
   - 本次完成的内容
   - 下次恢复的入口（引用 PROGRESS.md 中的恢复指令）
   - 仓库最新commit hash
```

---

## 三、PROGRESS.md 维护规范

### 任务状态标记

| 标记 | 含义 | 使用场景 |
|------|------|----------|
| `[ ]` | 未开始 | 计划中但尚未开始的任务 |
| `[~]` | 进行中 | 当前正在执行的任务（同时只能有一个） |
| `[x]` | 已完成 | 已完成并验证的任务 |
| `[!]` | 阻塞中 | 因依赖或问题暂时无法继续的任务 |

### 快照版本规范

采用语义化版本：`v主版本.阶段.步骤`

- 主版本：项目大版本（通常为0或1）
- 阶段：完成的主要阶段数
- 步骤：当前阶段内完成的步骤数

示例：`v0.3.2` = 第0大版本，第3阶段，第2步

---

## 四、快速参考命令

```bash
# 正常快照（有网络）
python3 .ai-conductor/scripts/snapshot.py -s "阶段名" -m "说明"

# 离线快照（断网）
python3 .ai-conductor/scripts/offline_commit.py -s "阶段名" -m "说明"

# 恢复网络后推送
python3 .ai-conductor/scripts/push_pending.py

# 查看恢复信息
python3 .ai-conductor/scripts/resume.py

# 查看离线队列状态
python3 .ai-conductor/scripts/push_pending.py --status

# 手动推送（备用）
git push origin main
```

---

## 五、故障排除

### 问题：PROGRESS.md 与实际代码状态不符

```
处理步骤：
1. git log --oneline -10  # 查看实际提交历史
2. 对比 PROGRESS.md 中记录的 Commit hash
3. 在 PROGRESS.md 中记录差异原因
4. 以实际代码状态为准，更新 PROGRESS.md
```

### 问题：推送被拒绝（远程有新提交）

```
处理步骤：
1. git pull --rebase origin main
2. 解决可能的冲突
3. python3 .ai-conductor/scripts/push_pending.py
```

### 问题：更换账号后无推送权限

```
处理步骤：
1. 确认新账号已被添加为仓库协作者
2. gh auth login  # 重新认证
3. git remote set-url origin https://github.com/<新账号>/<仓库名>.git
4. git push origin main
```

### 问题：PROGRESS.md 文件损坏或丢失

```
处理步骤：
1. git log --oneline -20  # 从提交历史重建进度
2. 复制模板：cp .ai-conductor/templates/PROGRESS.template.md PROGRESS.md
3. 根据 git log 和代码状态手动填写进度信息
4. 提交恢复后的 PROGRESS.md
```

---

## 六、设计原则

本体系遵循以下核心原则：

1. **仓库即真相**：所有进度信息存储在仓库中，任何有仓库访问权限的AI实例均可恢复工作
2. **本地优先**：断网时优先本地提交，恢复网络后再推送，不因网络问题丢失进度
3. **最小化人工干预**：AI自主维护进度文件，用户无需手动记录进度
4. **精确断点**：每次快照必须记录足够精确的"下一步操作"，确保新AI实例可直接执行
5. **防御性记录**：记录已知约束和决策，防止新AI实例重复推理或违反已确认的规则
