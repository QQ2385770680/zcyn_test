#!/usr/bin/env python3
"""
AI指挥家 — 离线提交工具
用途：断网时将所有变更提交到本地git，并生成恢复说明
用法：python3 .ai-conductor/scripts/offline_commit.py -m "说明" -s "阶段"
恢复网络后执行：git push origin <branch>
"""

import subprocess
import sys
import os
import json
import argparse
from datetime import datetime, timezone, timedelta

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OFFLINE_QUEUE = os.path.join(REPO_ROOT, ".ai-conductor", "offline_queue.json")
CST = timezone(timedelta(hours=8))


def run_git(args: list[str], capture=True) -> tuple[int, str]:
    result = subprocess.run(
        ["git"] + args,
        cwd=REPO_ROOT,
        capture_output=capture,
        text=True
    )
    output = result.stdout.strip() if capture else ""
    if result.stderr and capture:
        output = output or result.stderr.strip()
    return result.returncode, output


def load_offline_queue() -> list:
    if os.path.exists(OFFLINE_QUEUE):
        with open(OFFLINE_QUEUE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_offline_queue(queue: list):
    os.makedirs(os.path.dirname(OFFLINE_QUEUE), exist_ok=True)
    with open(OFFLINE_QUEUE, "w", encoding="utf-8") as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)


def offline_commit(stage: str, message: str):
    """执行离线本地提交"""
    now = datetime.now(CST)
    print(f"\n[offline] ====== 离线提交模式 ======")

    # 获取当前状态
    _, branch = run_git(["rev-parse", "--abbrev-ref", "HEAD"])
    _, status = run_git(["status", "--short"])

    if not status:
        print(f"[offline] 没有需要提交的变更")
        return

    print(f"[offline] 变更文件:\n{status}")

    # 添加所有变更
    run_git(["add", "-A"], capture=False)

    # 构建提交信息（包含离线标记）
    commit_msg = f"[OFFLINE] [{now.strftime('%Y-%m-%d %H:%M')}] {message or stage or '离线进度保存'}"
    code, output = run_git(["commit", "-m", commit_msg])

    if code != 0:
        print(f"[offline] 提交失败: {output}")
        return

    _, commit = run_git(["rev-parse", "--short", "HEAD"])
    print(f"[offline] 本地提交成功: {commit}")
    print(f"[offline] 提交信息: {commit_msg}")

    # 记录到离线队列
    queue = load_offline_queue()
    queue.append({
        "time": now.isoformat(),
        "commit": commit,
        "branch": branch,
        "stage": stage,
        "message": message,
        "pushed": False
    })
    save_offline_queue(queue)

    print(f"\n[offline] 离线队列已记录 {len(queue)} 个待推送提交")
    print(f"[offline] 恢复网络后执行以下命令推送:")
    print(f"  python3 .ai-conductor/scripts/push_pending.py")
    print(f"  或手动执行: git push origin {branch}")
    print(f"[offline] ============================\n")


def main():
    parser = argparse.ArgumentParser(description="AI指挥家离线提交工具")
    parser.add_argument("--message", "-m", default="", help="提交说明")
    parser.add_argument("--stage", "-s", default="", help="当前阶段名称")
    args = parser.parse_args()

    offline_commit(stage=args.stage, message=args.message)


if __name__ == "__main__":
    main()
