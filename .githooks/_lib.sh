#!/usr/bin/env bash
# .githooks/_lib.sh
# git ネイティブ hook と PreToolUse hook (pre-commit-guard.sh) で共有する
# 規約の **単一情報源 (SSOT)** (Issue #649 / Moderate 4)。
#
# 設計方針:
#   - 「master / main 直 commit 禁止」と「Co-Authored-By 禁止」の 2 規約は
#     これまで `.githooks/pre-commit` / `.githooks/commit-msg` /
#     `.claude/hooks/pre-commit-guard.sh` の 3 箇所に literal で散在しており、
#     片方を更新し忘れる二重管理リスクがあった。
#   - 本ファイルを source することで、規約は 1 箇所で定義 / 各 hook は
#     共通変数 / 共通関数を参照するだけにする。
#
# 提供インターフェース:
#   - PROTECTED_BRANCHES  : 直接 commit を禁止するブランチ名の配列
#                           例: PROTECTED_BRANCHES=("master" "main")
#   - COAUTHOR_PATTERN    : Co-Authored-By 検出用の grep -E 正規表現 (大小区別なし運用)
#   - is_protected_branch <name>  : ブランチ名が PROTECTED_BRANCHES に含まれれば exit 0
#   - body_contains_coauthor      : stdin に流したコミットメッセージ本文に
#                                   Co-Authored-By が含まれれば exit 0
#
# 適用箇所:
#   - .githooks/pre-commit  (master / main 直 commit 拒否)
#   - .githooks/commit-msg  (Co-Authored-By 検出)
#   - .claude/hooks/pre-commit-guard.sh (Bash PreToolUse hook の早期フィードバック層)
#
# 注意:
#   - 本ファイルは set -e されたコンテキストから source される想定なので、
#     副作用ある exit / return は関数内に閉じ込めること。
#   - 配列 (PROTECTED_BRANCHES) は bash 固有機能。POSIX sh から呼ぶ場合は
#     `PROTECTED_BRANCHES_RE` (パイプ区切り regex) を併用すること。

# 直接 commit を禁止するブランチ名 (SSOT)
# 追加する場合はここに足すだけで全 hook に伝播する。
PROTECTED_BRANCHES=("master" "main")

# パイプ区切り版 (POSIX grep -E などで使う)。
# 例: "master|main"
PROTECTED_BRANCHES_RE=$(IFS='|'; printf '%s' "${PROTECTED_BRANCHES[*]}")

# Co-Authored-By 検出用 regex (大小区別は呼び出し側で -i フラグ等で制御する)。
#
# 2 種類用意する理由:
#   1. COAUTHOR_PATTERN  — コミットメッセージ「本文」向け (commit-msg hook 用)
#      行頭または空白の直後に `co-authored-by` が現れ、末尾に `:` がある場合のみ
#      マッチ。本文中の単なる言及 (例: 「`Co-Authored-By`」のような単一トークン)
#      は末尾 `:` の要件で弾く設計。
#   2. COAUTHOR_LITERAL_PATTERN — shell コマンド「引数 literal」向け
#      (pre-commit-guard.sh の `git commit -m "..."` 検出用)
#      shell 経由で `-m "feat\nCo-Authored-By: x"` のような literal `\n` を
#      含む文字列が渡された場合、shlex.split で引用符が剥がされるが内部の
#      `\n` は literal の `\n` のまま残るため、前置 `[[:space:]]` を要求すると
#      検知漏れする。shell command literal の段階では `co-authored-by` の
#      sub-string が現れた時点で block する保守的な regex を採用する。
#      本文中の偽陽性は shell hook 段階では許容する (= 本文の単なる言及で
#      false positive 出る可能性はあるが、これは「`co-authored-by:` を含む
#      shell コマンド文字列」という非常に限定的なケースのみで、現実の運用
#      では `-m "...Co-Authored-By..."` 以外で出現しない)。
COAUTHOR_PATTERN='(^|[[:space:]])co-authored-by[[:space:]]*:'
COAUTHOR_LITERAL_PATTERN='co-authored-by[[:space:]]*:'

# ブランチ名が保護対象に含まれているかを判定する。
# 含まれていれば exit 0、それ以外は exit 1。
# 引数: $1 = ブランチ名 (例: master / feat/foo / 空文字)
is_protected_branch() {
  local name="${1:-}"
  if [ -z "$name" ]; then
    return 1
  fi
  local b
  for b in "${PROTECTED_BRANCHES[@]}"; do
    if [ "$name" = "$b" ]; then
      return 0
    fi
  done
  return 1
}

# stdin に流したテキストに Co-Authored-By 行が含まれるかを判定する。
# 含まれていれば exit 0、それ以外は exit 1。
# 呼び出し側は本文のみ (= コメント行除去後) を流す責務を持つ。
body_contains_coauthor() {
  if grep -qiE "$COAUTHOR_PATTERN"; then
    return 0
  fi
  return 1
}
