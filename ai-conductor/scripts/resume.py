#!/usr/bin/env python3
"""
AI指挥家 — 工作恢复引导工具
用途：新AI实例或新账号接手工作时，自动读取进度快照并输出恢复指令
用法：python3 .ai-conductor/scripts/resume.py
"""

import subprocess
import sys
import os
import json
from datetime import datetime

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROGRESS_FILE = os.path.join(REPO_ROOT, "PROGRESS.md")
TASK_CONTEXT_FILE = os.path.join(REPO_ROOT, "TASK_CONTEXT.md")
SNAPSHOT_LOG = os.path.join(REPO_ROOT, ".ai-conductor", "snapshot_log.json")


def run_git(args: list[str]) -> str:
    result = subprocess.run(
        ["git"] + args,
        cwd=REPO_ROOT,
        capture_output=True,
        text=True
    )
    return result.stdout.strip()


def check_repo_status():
    """检查仓库状态"""
    print("\n" + "="*60)
    print("  AI指挥家 — 工作恢复引导")
    print("="*60)

    # 拉取最新代码
    print("\n[1/4] 同步远程仓库...")
    result = subprocess.run(
        ["git", "pull", "--rebase"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True
    )
    if result.returncode == 0:
        print(f"  ✓ 同步成功: {result.stdout.strip()}")
    else:
        print(f"  ✗ 同步失败（可能断网）: {result.stderr.strip()}")
        print(f"  → 将使用本地最新状态继续")

    branch = run_git(["rev-parse", "--abbrev-ref", "HEAD"])
    commit = run_git(["rev-parse", "--short", "HEAD"])
    print(f"\n[2/4] 当前状态:")
    print(f"  分支: {branch}")
    print(f"  Commit: {commit}")
    print(f"  时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


def read_progress():
    """读取并展示进度文件"""
    print(f"\n[3/4] 读取进度快照...")

    if not os.path.exists(PROGRESS_FILE):
        print(f"  ✗ PROGRESS.md 不存在！")
        print(f"  → 这是一个全新的工作环境，请参考 .ai-conductor/templates/PROGRESS.template.md 创建进度文件")
        return None

    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    print(f"  ✓ 已读取 PROGRESS.md")

    # 提取关键信息
    import re

    def extract_field(pattern, text, default="未记录"):
        m = re.search(pattern, text)
        return m.group(1).strip() if m else default

    snapshot_time = extract_field(r'\*\*快照时间\*\*\s*\|\s*([^\|]+)', content)
    current_commit = extract_field(r'\*\*最新Commit\*\*\s*\|\s*([^\|]+)', content)
    branch = extract_field(r'\*\*当前分支\*\*\s*\|\s*([^\|]+)', content)
    priority = extract_field(r'\*\*下次恢复优先级\*\*\s*\|\s*([^\|]+)', content)

    print(f"\n  快照时间: {snapshot_time}")
    print(f"  记录分支: {branch}")
    print(f"  记录Commit: {current_commit}")
    print(f"  恢复优先级: {priority}")

    return content


def read_task_context():
    """读取任务上下文"""
    print(f"\n[4/4] 读取任务上下文...")

    if not os.path.exists(TASK_CONTEXT_FILE):
        print(f"  ✗ TASK_CONTEXT.md 不存在")
        print(f"  → 请参考 .ai-conductor/templates/TASK_CONTEXT.template.md 创建")
        return

    print(f"  ✓ 已读取 TASK_CONTEXT.md")


def print_resume_instructions():
    """输出给AI的恢复指令"""
    print("\n" + "="*60)
    print("  给新AI实例的恢复指令")
    print("="*60)
    print("""
请按以下顺序恢复工作：

STEP 1 — 读取进度文件
  阅读 PROGRESS.md 中的"当前执行阶段"和"下一步操作"部分，
  明确断点位置和恢复入口。

STEP 2 — 读取任务上下文
  阅读 TASK_CONTEXT.md，理解项目背景、技术架构和业务规则，
  特别关注"已知约束与规则"和"关键决策记录"部分。

STEP 3 — 验证代码状态
  执行以下命令确认代码状态与快照一致：
    git log --oneline -5
    git status

STEP 4 — 从断点继续
  按照 PROGRESS.md 中"下一步操作（恢复入口）"的指令继续执行。
  每完成一个子任务，更新 PROGRESS.md 中的任务列表状态。

STEP 5 — 定期保存快照
  每完成一个重要阶段，执行：
    python3 .ai-conductor/scripts/snapshot.py -s "阶段名" -m "说明"
  断网时加 --no-push 参数，仅本地提交。

注意事项：
  - 不要跳过阅读 PROGRESS.md 直接开始工作
  - 不要修改已标记为 [x] 完成的任务
  - 遇到与快照记录不符的情况，先记录差异再继续
""")
    print("="*60 + "\n")


def main():
    check_repo_status()
    progress = read_progress()
    read_task_context()
    print_resume_instructions()

    if progress:
        print("\n" + "="*60)
        print("  PROGRESS.md 完整内容预览")
        print("="*60)
        # 只显示前80行避免过长
        lines = progress.split('\n')
        preview_lines = lines[:80]
        print('\n'.join(preview_lines))
        if len(lines) > 80:
            print(f"\n  ... (共 {len(lines)} 行，请直接阅读 PROGRESS.md 获取完整内容)")


if __name__ == "__main__":
    main()
