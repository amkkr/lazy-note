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
# 設計方針 (Issue #648):
#   `Co-Authored-By` を「全面禁止」すると、以下の正当なユースケースを巻き添えに
#   block してしまう:
#     - dependabot PR の取り込み時に元 PR の Co-Authored-By が引き継がれる
#     - 人間同士の pair programming で互いを Co-Authored-By に挙げる
#     - GitHub の "Co-authored commits" 公式機能を使う場合
#   CLAUDE.md のルール (「Co-Authored-By を含めないこと」) は実質的には
#   **AI bot 由来のクレジット行を禁止** する意図のもの。よって hook 側は
#   「AI bot を示唆する識別子を含む `Co-Authored-By` 行」のみを block するように
#   絞り込む。これによりルール本来のスコープと実装が整合する。
#
# AI bot 識別子の検出語彙:
#   - claude        : Anthropic Claude (Claude Code 含む)
#   - copilot       : GitHub Copilot
#   - anthropic     : Anthropic 関連メール (noreply@anthropic.com 等)
#   - openai        : OpenAI / ChatGPT 関連
#   - cursor        : Cursor IDE
#   - codex         : OpenAI Codex
#   将来 AI bot が増えた場合、ここに `|` 連結で追加すれば全 hook に伝播する。
#
# 提供インターフェース:
#   - COAUTHOR_HEADER_RE       : `Co-Authored-By:` 行検出用 ERE (本文向け、行頭/空白後)
#   - COAUTHOR_LITERAL_HEADER_RE : `Co-Authored-By:` 検出用 ERE (literal 引数向け、前置条件なし)
#   - COAUTHOR_AI_IDENTIFIERS_RE : AI bot 識別子の alternation (claude|copilot|...)
#   - body_contains_ai_coauthor  : stdin の本文に AI 由来 Co-Authored-By が含まれれば 0
#   - literal_contains_ai_coauthor : stdin の literal 文字列内に AI 由来 Co-Authored-By
#                                    が含まれれば 0 (shell hook 用)
#
# 注意:
#   - 検出語彙は **case-insensitive** で評価される (`grep -iE` を使う)。
#     大文字小文字違いの偽装 (例: `CLAUDE` / `Claude`) は同じパターンで捕捉される。
#   - 識別子は word boundary ではなく単純な sub-string で照合する。
#     これは `noreply@anthropic.com` のような email 内出現も捕捉するため。
#     人間で偶然 `claude` を含む名前/ドメインは block されるが、現実的衝突は稀。
COAUTHOR_AI_IDENTIFIERS_RE='(claude|copilot|anthropic|openai|cursor|codex)'
# 本文 (行単位 grep) 向け: 行頭または空白の直後に `co-authored-by` + `:` を要求
COAUTHOR_HEADER_RE='(^|[[:space:]])co-authored-by[[:space:]]*:'
# shell literal 向け: 前置条件を要求しない (shlex 後の literal は連結文字列のため)
COAUTHOR_LITERAL_HEADER_RE='co-authored-by[[:space:]]*:'

# (互換) 旧名: 既存呼び出し箇所で参照されている可能性に備え alias を残す。
# 新規コードでは COAUTHOR_HEADER_RE / COAUTHOR_LITERAL_HEADER_RE を使うこと。
COAUTHOR_PATTERN="$COAUTHOR_HEADER_RE"
COAUTHOR_LITERAL_PATTERN="$COAUTHOR_LITERAL_HEADER_RE"

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

# stdin に流したテキストに **AI bot 由来の** Co-Authored-By 行が含まれるかを
# 判定する (Issue #648)。含まれていれば exit 0、それ以外は exit 1。
# 呼び出し側は本文のみ (= コメント行除去後) を流す責務を持つ。
#
# 実装:
#   1. `Co-Authored-By:` を含む行のみを抽出 (行頭/空白後 + `:` で本文中の
#      単なる言及を弾く)
#   2. 抽出した行に AI bot 識別子が含まれるか再 grep する
#   この 2 段階により「AI 識別子付き Co-Authored-By 行」だけを正確に判定する。
#   POSIX ERE で `\n` を否定文字クラスに入れる挙動は実装依存 (BSD/GNU で
#   差異あり) なので、行単位 grep を 2 回かけてポータビリティを担保する。
body_contains_ai_coauthor() {
  local lines
  lines=$(grep -iE "$COAUTHOR_HEADER_RE" || true)
  if [ -z "$lines" ]; then
    return 1
  fi
  if printf '%s' "$lines" | grep -qiE "$COAUTHOR_AI_IDENTIFIERS_RE"; then
    return 0
  fi
  return 1
}

# (互換) 旧 API。挙動を Issue #648 適用後の「AI 由来 Co-Authored-By のみ block」
# に揃えるため、内部で body_contains_ai_coauthor を呼ぶ alias とする。
# 既存呼び出し箇所 (commit-msg hook) はこの alias 経由で新挙動に切り替わる。
body_contains_coauthor() {
  body_contains_ai_coauthor
}

# stdin に流した shell command literal (= shlex split 後の文字列等) に
# AI bot 由来の Co-Authored-By 表現が含まれるかを判定する (Issue #648)。
# 含まれていれば exit 0、それ以外は exit 1。
#
# 本文向けと異なり、shell literal は `\n` がエスケープ表記 (literal 2 文字)
# のまま渡されるケースがあるため、前置 `[[:space:]]` は要求しない。
# 「`co-authored-by:` の出現」と「AI 識別子の出現」の 2 条件を満たせば block。
# 識別子の前後距離は問わない (literal 段階では誤検知より見逃し回避を優先)。
literal_contains_ai_coauthor() {
  local content
  content=$(cat)
  if ! printf '%s' "$content" | grep -qiE "$COAUTHOR_LITERAL_HEADER_RE"; then
    return 1
  fi
  if printf '%s' "$content" | grep -qiE "$COAUTHOR_AI_IDENTIFIERS_RE"; then
    return 0
  fi
  return 1
}
