#!/usr/bin/env python3
"""
AI指挥家 — 进度快照工具
用途：在任务暂停或阶段完成时，自动生成/更新进度快照并提交到GitHub
用法：python3 .ai-conductor/scripts/snapshot.py [--message "快照说明"] [--stage "阶段名称"]
"""

import subprocess
import sys
import os
import json
import argparse
from datetime import datetime, timezone, timedelta

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROGRESS_FILE = os.path.join(REPO_ROOT, "PROGRESS.md")
SNAPSHOT_LOG = os.path.join(REPO_ROOT, ".ai-conductor", "snapshot_log.json")

CST = timezone(timedelta(hours=8))


def run_git(args: list[str], capture=True) -> str:
    """执行git命令并返回输出"""
    result = subprocess.run(
        ["git"] + args,
        cwd=REPO_ROOT,
        capture_output=capture,
        text=True
    )
    if result.returncode != 0 and capture:
        return result.stderr.strip()
    return result.stdout.strip() if capture else ""


def get_git_info() -> dict:
    """获取当前git状态信息"""
    return {
        "branch": run_git(["rev-parse", "--abbrev-ref", "HEAD"]),
        "commit": run_git(["rev-parse", "--short", "HEAD"]),
        "commit_full": run_git(["rev-parse", "HEAD"]),
        "remote_url": run_git(["remote", "get-url", "origin"]),
        "status": run_git(["status", "--short"]),
        "last_commit_msg": run_git(["log", "-1", "--pretty=%s"]),
        "uncommitted_files": run_git(["diff", "--name-only"]),
        "staged_files": run_git(["diff", "--cached", "--name-only"]),
    }


def load_snapshot_log() -> list:
    """加载快照历史日志"""
    if os.path.exists(SNAPSHOT_LOG):
        with open(SNAPSHOT_LOG, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_snapshot_log(log: list):
    """保存快照历史日志"""
    os.makedirs(os.path.dirname(SNAPSHOT_LOG), exist_ok=True)
    with open(SNAPSHOT_LOG, "w", encoding="utf-8") as f:
        json.dump(log[-20:], f, ensure_ascii=False, indent=2)  # 保留最近20条


def update_progress_metadata(stage: str, message: str, git_info: dict):
    """更新PROGRESS.md中的元数据字段"""
    now = datetime.now(CST)
    timestamp = now.strftime("%Y-%m-%dT%H:%M:%S+08:00")

    if not os.path.exists(PROGRESS_FILE):
        # 从模板复制
        template_path = os.path.join(REPO_ROOT, ".ai-conductor", "templates", "PROGRESS.template.md")
        if os.path.exists(template_path):
            with open(template_path, "r", encoding="utf-8") as f:
                content = f.read()
            with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"[snapshot] 已从模板创建 PROGRESS.md")
        else:
            print(f"[snapshot] 警告：PROGRESS.md 不存在且模板未找到，请手动创建")
            return False

    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # 更新快照时间
    import re
    content = re.sub(
        r'\|\s*\*\*快照时间\*\*\s*\|.*\|',
        f'| **快照时间** | {timestamp} |',
        content
    )
    # 更新最新Commit
    content = re.sub(
        r'\|\s*\*\*最新Commit\*\*\s*\|.*\|',
        f'| **最新Commit** | {git_info["commit"]} |',
        content
    )
    # 更新当前分支
    content = re.sub(
        r'\|\s*\*\*当前分支\*\*\s*\|.*\|',
        f'| **当前分支** | {git_info["branch"]} |',
        content
    )

    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        f.write(content)

    return True


def create_snapshot(stage: str, message: str, auto_push: bool = True):
    """创建进度快照并提交"""
    print(f"\n[snapshot] ====== AI指挥家进度快照 ======")
    git_info = get_git_info()

    print(f"[snapshot] 当前分支: {git_info['branch']}")
    print(f"[snapshot] 当前Commit: {git_info['commit']}")
    print(f"[snapshot] 未提交文件: {git_info['status'] or '（无）'}")

    # 更新PROGRESS.md元数据
    update_progress_metadata(stage, message, git_info)

    # 添加所有变更（包括PROGRESS.md）
    run_git(["add", "-A"], capture=False)

    # 检查是否有内容需要提交
    staged = run_git(["diff", "--cached", "--name-only"])
    if not staged:
        print(f"[snapshot] 没有需要提交的变更，跳过commit")
    else:
        now = datetime.now(CST)
        commit_msg = f"chore(snapshot): [{now.strftime('%Y-%m-%d %H:%M')}] {message or stage or '进度快照'}"
        run_git(["commit", "-m", commit_msg], capture=False)
        print(f"[snapshot] 已提交: {commit_msg}")

    # 获取提交后的最新hash
    git_info["commit"] = run_git(["rev-parse", "--short", "HEAD"])

    # 推送到远程
    if auto_push:
        print(f"[snapshot] 正在推送到远程仓库...")
        result = subprocess.run(
            ["git", "push", "origin", git_info["branch"]],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"[snapshot] 推送成功")
        else:
            print(f"[snapshot] 推送失败（可能是断网），变更已保存在本地commit中")
            print(f"[snapshot] 错误信息: {result.stderr.strip()}")
            print(f"[snapshot] 恢复网络后执行: git push origin {git_info['branch']}")

    # 记录快照日志
    log = load_snapshot_log()
    log.append({
        "time": datetime.now(CST).isoformat(),
        "commit": git_info["commit"],
        "branch": git_info["branch"],
        "stage": stage,
        "message": message,
        "push_success": auto_push
    })
    save_snapshot_log(log)

    print(f"\n[snapshot] 快照完成！")
    print(f"[snapshot] Commit: {git_info['commit']}")
    print(f"[snapshot] 阶段: {stage}")
    print(f"[snapshot] 说明: {message}")
    print(f"[snapshot] ================================\n")

    return git_info["commit"]


def show_resume_info():
    """显示恢复工作所需的信息"""
    git_info = get_git_info()
    log = load_snapshot_log()

    print(f"\n[resume] ====== 恢复工作信息 ======")
    print(f"[resume] 仓库: {git_info['remote_url']}")
    print(f"[resume] 分支: {git_info['branch']}")
    print(f"[resume] 最新Commit: {git_info['commit']}")

    if log:
        last = log[-1]
        print(f"\n[resume] 最近快照:")
        print(f"  时间: {last['time']}")
        print(f"  阶段: {last['stage']}")
        print(f"  说明: {last['message']}")

    if os.path.exists(PROGRESS_FILE):
        print(f"\n[resume] 请读取以下文件以恢复上下文:")
        print(f"  1. PROGRESS.md           — 当前进度与断点位置")
        print(f"  2. .ai-conductor/templates/TASK_CONTEXT.template.md — 任务背景与架构")
    print(f"[resume] ============================\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI指挥家进度快照工具")
    parser.add_argument("--message", "-m", default="", help="快照说明")
    parser.add_argument("--stage", "-s", default="", help="当前阶段名称")
    parser.add_argument("--no-push", action="store_true", help="不推送到远程（断网时使用）")
    parser.add_argument("--resume", "-r", action="store_true", help="显示恢复工作信息")
    args = parser.parse_args()

    if args.resume:
        show_resume_info()
    else:
        create_snapshot(
            stage=args.stage,
            message=args.message,
            auto_push=not args.no_push
        )
