#!/usr/bin/env bash
# pre-commit-guard: git commit / push / rebase 実行前の規約チェック
# PreToolUse hook として Bash ツール実行前に呼ばれる
# 標準入力からJSON（tool_input.command含む）を受け取り、違反時は JSON decision:block を stdout に出力

set -euo pipefail

INPUT=$(cat)

# jq が使えれば使う（最も堅牢）。無ければ python3 で抽出。
if command -v jq >/dev/null 2>&1; then
  COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
elif command -v python3 >/dev/null 2>&1; then
  COMMAND=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command","") or "")' 2>/dev/null || true)
else
  exit 0
fi

if [ -z "$COMMAND" ]; then
  exit 0
fi

block() {
  local reason="$1"
  printf '{"decision":"block","reason":"%s"}\n' "$reason"
  exit 0
}

# チェック対象は「git サブコマンド」として実際に実行されうる部分のみ。
# 「コマンド文字列全体への部分一致」では body テキスト・コメント・ヒアドキュメント
# などの文字列が誤検知されるため、git に続くトークンを行単位で抽出して判定する。
#
# 抽出方針: 先頭または `;`, `&&`, `||`, `|`, `$(` 直後に現れる `git <sub>` を列挙する。

# シェル区切りで正規化（置換してから grep）
NORMALIZED=$(printf '%s' "$COMMAND" | tr ';&|()`' '\n')

# git <subcommand> 呼び出しトークンを抽出（行頭空白を落としてからマッチ）
GIT_INVOCATIONS=$(printf '%s\n' "$NORMALIZED" | sed -E 's/^[[:space:]]+//' | grep -E '^git[[:space:]]+' || true)

if [ -z "$GIT_INVOCATIONS" ]; then
  exit 0
fi

# rebase 禁止
if printf '%s\n' "$GIT_INVOCATIONS" | grep -Eq '^git[[:space:]]+rebase([[:space:]]|$)'; then
  block "git rebase は禁止されています。コンフリクト解決は git merge を使用してください。"
fi

# force push 禁止（git push 呼び出しにのみ対して --force / --force-with-lease / -f を検査）
if printf '%s\n' "$GIT_INVOCATIONS" | grep -E '^git[[:space:]]+push([[:space:]]|$)' | \
    grep -Eq '([[:space:]]|^)(--force([[:space:]=]|$)|--force-with-lease([[:space:]=]|$)|-f([[:space:]]|$))'; then
  block "force push は禁止されています。"
fi

# master/main への直接 commit / push 拒否
if printf '%s\n' "$GIT_INVOCATIONS" | grep -Eq '^git[[:space:]]+(commit|push)([[:space:]]|$)'; then
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  if [ "$CURRENT_BRANCH" = "master" ] || [ "$CURRENT_BRANCH" = "main" ]; then
    block "master/main ブランチへの直接 commit/push は禁止です。作業ブランチを切ってください。"
  fi
fi

# git commit の場合、コマンド引数の -m / --message メッセージに Co-Authored-By が含まれないかチェック
# （本文に Co-Authored-By という単語が単に言及されるだけのケースと区別するため、
#  git commit 呼び出しを含むときのみ、かつそのコマンド自体のテキスト内に含まれるかを見る）
if printf '%s\n' "$GIT_INVOCATIONS" | grep -Eq '^git[[:space:]]+commit([[:space:]]|$)'; then
  COMMIT_LINE=$(printf '%s\n' "$GIT_INVOCATIONS" | grep -E '^git[[:space:]]+commit([[:space:]]|$)' | head -n1)
  if printf '%s' "$COMMIT_LINE" | grep -q 'Co-Authored-By'; then
    block "コミットメッセージに Co-Authored-By を含めることは禁止されています。"
  fi
fi

exit 0
