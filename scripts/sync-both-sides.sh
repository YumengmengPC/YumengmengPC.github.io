#!/usr/bin/env bash
# ymmblog 双端一键同步：Windows 侧 clone <-> GitHub origin <-> WSL 侧 clone
#
# 用法：
#   WSL 内：   scripts/sync-both-sides.sh [Windows仓库的WSL路径]
#   Windows：  双击仓库根的 sync-blog.bat（内部调用本脚本）
#
# 行为：
#   - 每端：本地落后则快进 pull；本地领先则经临时分支 sync/wsl、sync/win
#     自动开 PR 并合并上 main（main 受 ruleset 保护禁止直推），随后本地
#     对齐合并后进度；PR 与 main 冲突时报错并留待手动处理
#   - 某端有未提交的已跟踪改动时跳过该端并警告（untracked 新文件不受影响）
#   - 绝不自动 commit 任何内容

set -u

GH_REPO="YumengmengPC/YumengmengPC.github.io"

# 清空已有 credential helper，改用 gh 提供 token（对 ssh remote 无影响）；
# 这样 Windows 侧 clone 的 https remote 也能用 WSL 里的 gh 登录态推送
GH_HELPER='!gh auth git-credential'
net_git() { git -c credential.helper= -c "credential.helper=$GH_HELPER" "$@"; }

ok()   { printf '  ✔ %s\n' "$1"; }
warn() { printf '  ⚠ %s\n' "$1" >&2; }
err()  { printf '  ✖ %s\n' "$1" >&2; }

FAILURES=0

# sync_repo <仓库路径> <侧名> <分支后缀：wsl|win>
sync_repo() {
  local repo=$1 label=$2 side=$3
  local pr_branch="sync/$side"
  # /mnt/d/xxx 显示成 D:/xxx，纯展示用
  local disp
  disp=$(printf '%s' "$repo" | sed 's|^/mnt/\([a-z]\)/|\U\1\E:/|')

  echo
  echo "── $label 侧 ($disp) ──"

  if [ ! -d "$repo/.git" ]; then
    err "找不到 git 仓库，跳过"
    FAILURES=$((FAILURES+1))
    return 1
  fi

  local branch
  branch=$(git -C "$repo" rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ "$branch" != "main" ]; then
    warn "当前分支是 $branch（不是 main），跳过该端"
    FAILURES=$((FAILURES+1))
    return 1
  fi

  if ! net_git -C "$repo" fetch origin --quiet; then
    err "git fetch 失败（网络/认证问题？），跳过该端"
    FAILURES=$((FAILURES+1))
    return 1
  fi

  # 已跟踪文件有未提交改动时 pull/reset 会失败或丢改动，跳过并提醒
  if [ -n "$(git -C "$repo" status --porcelain --untracked-files=no)" ]; then
    warn "有未提交的改动，跳过该端（请先 commit 或 stash）"
    FAILURES=$((FAILURES+1))
    return 1
  fi

  local ahead behind
  read -r ahead behind <<< "$(git -C "$repo" rev-list --left-right --count main...origin/main)"

  if [ "$ahead" -gt 0 ]; then
    echo "  本地领先 $ahead 个提交，经临时分支 $pr_branch 走 PR 上 main..."
    if ! net_git -C "$repo" push -f origin "main:refs/heads/$pr_branch" --quiet; then
      err "推送临时分支 $pr_branch 失败"
      FAILURES=$((FAILURES+1))
      return 1
    fi

    # 同名 open PR 已存在（上次未合并）则复用，否则新建
    if ! gh pr view "$pr_branch" --repo "$GH_REPO" --json state -q .state 2>/dev/null | grep -qix open; then
      local body
      body=$(git -C "$repo" log --reverse --oneline origin/main..main | sed 's/^/- /')
      if ! gh pr create --repo "$GH_REPO" --base main --head "$pr_branch" \
           --title "sync: $label 侧进度（自动）" \
           --body "一键同步脚本自动创建，包含以下提交：

$body"; then
        err "创建 PR 失败"
        FAILURES=$((FAILURES+1))
        return 1
      fi
      echo "  已创建 PR（sync: $label 侧进度）"
    fi

    if ! gh pr merge "$pr_branch" --repo "$GH_REPO" --merge; then
      err "PR 合并失败（多半与 main 有冲突）。请手动处理：https://github.com/$GH_REPO/pulls"
      FAILURES=$((FAILURES+1))
      return 1
    fi
    ok "PR 已合并，$ahead 个提交进入 main"
    # 清掉临时分支（失败不影响结果，下次会强制覆盖）
    git -C "$repo" push origin --delete "$pr_branch" --quiet 2>/dev/null || true

    # PR 合并产生的是新 commit（同内容不同哈希），本地对齐到合并后进度；
    # 此前已确保无未提交改动，reset --hard 不会丢东西
    net_git -C "$repo" fetch origin --quiet
    git -C "$repo" reset --hard origin/main --quiet
    ok "本地已对齐合并后进度"
    return 0
  fi

  if [ "$behind" -gt 0 ]; then
    if ! net_git -C "$repo" pull --ff-only --quiet; then
      err "快进拉取失败（可能有未跟踪文件与远程新增文件同名冲突）"
      FAILURES=$((FAILURES+1))
      return 1
    fi
    ok "已拉取 $behind 个新提交"
    return 0
  fi

  ok "已是最新"
}

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WSL_REPO=$(git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel 2>/dev/null)
WIN_REPO=${1:-/mnt/d/blog/YumengmengPC.github.io}

if [ -z "$WSL_REPO" ]; then
  err "无法定位 WSL 侧仓库（脚本应放在仓库内运行）"
  exit 1
fi

echo "════════ ymmblog 双端同步 ════════"

sync_repo "$WSL_REPO" "WSL" wsl
sync_repo "$WIN_REPO" "Windows" win
# 第二轮：把 Windows 侧刚合并的提交收回来，保证两侧对齐
sync_repo "$WSL_REPO" "WSL" wsl

echo
wsl_head=$(git -C "$WSL_REPO" rev-parse HEAD 2>/dev/null)
win_head=$(git -C "$WIN_REPO" rev-parse HEAD 2>/dev/null)
if [ -n "$wsl_head" ] && [ "$wsl_head" = "$win_head" ] \
   && [ "$wsl_head" = "$(git -C "$WSL_REPO" rev-parse origin/main 2>/dev/null)" ]; then
  echo "✔ 同步完成：两侧及 GitHub main 已对齐到 $(git -C "$WSL_REPO" log -1 --format='%h %s')"
else
  warn "进度未完全对齐（多半是某一端被跳过或 PR 待处理，见上方提示）"
fi

exit "$FAILURES"
