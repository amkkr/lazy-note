#!/usr/bin/env bash
# pre-commit-guard: git commit / push / rebase 実行前の規約チェック
# PreToolUse hook として Bash ツール実行前に呼ばれる
# 標準入力からJSON（tool_input含む）を受け取り、違反時は JSON decision:block を stdout に出力

set -euo pipefail

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

if [ -z "$COMMAND" ]; then
  exit 0
fi

block() {
  local reason="$1"
  printf '{"decision":"block","reason":"%s"}\n' "$reason"
  exit 0
}

# rebase 禁止
if printf '%s' "$COMMAND" | grep -Eq '(^|[[:space:];&|])git[[:space:]]+rebase([[:space:]]|$)'; then
  block "git rebase は禁止されています。コンフリクト解決は git merge を使用してください。"
fi

# force push 禁止
if printf '%s' "$COMMAND" | grep -Eq 'git[[:space:]]+push[[:space:]].*(--force([^-]|$)|--force-with-lease|[[:space:]]-f([[:space:]]|$))'; then
  block "force push は禁止されています。"
fi

# master/main への直接 commit / push 拒否
if printf '%s' "$COMMAND" | grep -Eq 'git[[:space:]]+(commit|push)'; then
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  if [ "$CURRENT_BRANCH" = "master" ] || [ "$CURRENT_BRANCH" = "main" ]; then
    block "master/main ブランチへの直接 commit/push は禁止です。作業ブランチを切ってください。"
  fi
fi

# git commit の場合、メッセージに Co-Authored-By が含まれないかチェック
if printf '%s' "$COMMAND" | grep -Eq 'git[[:space:]]+commit'; then
  if printf '%s' "$COMMAND" | grep -q 'Co-Authored-By'; then
    block "コミットメッセージに Co-Authored-By を含めることは禁止されています。"
  fi
fi

exit 0
