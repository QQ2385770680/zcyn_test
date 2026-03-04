#!/usr/bin/env python3
"""
AI指挥家 — 离线提交推送工具
用途：恢复网络或更换账号后，推送所有离线期间积累的本地提交
用法：python3 .ai-conductor/scripts/push_pending.py [--remote <remote>]
"""

import subprocess
import sys
import os
import json
import argparse
from datetime import datetime

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OFFLINE_QUEUE = os.path.join(REPO_ROOT, ".ai-conductor", "offline_queue.json")


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
    with open(OFFLINE_QUEUE, "w", encoding="utf-8") as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)


def push_pending(remote: str = "origin"):
    """推送所有待推送的离线提交"""
    print(f"\n[push] ====== 推送离线提交 ======")

    queue = load_offline_queue()
    pending = [item for item in queue if not item.get("pushed", False)]

    if not pending:
        print(f"[push] 没有待推送的离线提交")
        # 仍然尝试推送当前分支
    else:
        print(f"[push] 发现 {len(pending)} 个待推送的离线提交:")
        for item in pending:
            print(f"  - [{item['time']}] {item['commit']} {item['message']}")

    # 获取当前分支
    _, branch = run_git(["rev-parse", "--abbrev-ref", "HEAD"])
    print(f"\n[push] 推送分支 {branch} 到 {remote}...")

    code, output = run_git(["push", remote, branch])

    if code == 0:
        print(f"[push] 推送成功!")
        # 标记所有为已推送
        for item in queue:
            item["pushed"] = True
        save_offline_queue(queue)
        print(f"[push] 已更新离线队列状态")
    else:
        print(f"[push] 推送失败: {output}")
        print(f"\n[push] 可能的原因:")
        print(f"  1. 网络仍未恢复")
        print(f"  2. 需要更新远程凭据（更换账号时）")
        print(f"  3. 远程有新提交需要先拉取: git pull --rebase origin {branch}")
        print(f"\n[push] 更换账号后的推送步骤:")
        print(f"  1. gh auth login  （重新登录GitHub）")
        print(f"  2. git remote set-url origin <新仓库URL>  （如需更换仓库）")
        print(f"  3. python3 .ai-conductor/scripts/push_pending.py  （重新推送）")
        return False

    print(f"[push] ============================\n")
    return True


def show_queue_status():
    """显示离线队列状态"""
    queue = load_offline_queue()
    if not queue:
        print("[push] 离线队列为空")
        return

    print(f"\n离线提交队列 (共 {len(queue)} 条):")
    print(f"{'时间':<25} {'Commit':<10} {'状态':<8} {'说明'}")
    print("-" * 70)
    for item in queue:
        status = "已推送" if item.get("pushed") else "待推送"
        print(f"{item['time']:<25} {item['commit']:<10} {status:<8} {item.get('message', '')}")


def main():
    parser = argparse.ArgumentParser(description="AI指挥家离线提交推送工具")
    parser.add_argument("--remote", default="origin", help="远程仓库名称（默认: origin）")
    parser.add_argument("--status", action="store_true", help="仅显示队列状态")
    args = parser.parse_args()

    if args.status:
        show_queue_status()
    else:
        push_pending(remote=args.remote)


if __name__ == "__main__":
    main()
