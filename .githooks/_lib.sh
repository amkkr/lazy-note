#!/usr/bin/env bash
# .githooks/_lib.sh
# git ネイティブ hook と PreToolUse hook (pre-commit-guard.sh) で共有する
# 規約の **単一情報源 (SSOT)** (Issue #649 / Moderate 4)。
#
# 設計方針:
#   - 「master / main 直 commit 禁止」と「AI bot 由来 Co-Authored-By 禁止」の
#     2 規約は、これまで `.githooks/pre-commit` / `.githooks/commit-msg` /
#     `.claude/hooks/pre-commit-guard.sh` の 3 箇所に literal で散在しており、
#     片方を更新し忘れる二重管理リスクがあった。
#   - 本ファイルを source することで、規約は 1 箇所で定義 / 各 hook は
#     共通変数 / 共通関数を参照するだけにする。
#
# 提供インターフェース:
#   - PROTECTED_BRANCHES         : 直接 commit を禁止するブランチ名の配列
#                                  例: PROTECTED_BRANCHES=("master" "main")
#   - PROTECTED_BRANCHES_RE      : パイプ区切り版 (POSIX grep -E 向け)
#   - COAUTHOR_HEADER_RE         : `Co-Authored-By:` 行検出用 ERE (本文向け)
#   - COAUTHOR_LITERAL_HEADER_RE : `Co-Authored-By:` 検出用 ERE (literal 引数向け)
#   - COAUTHOR_AI_BOT_RE         : AI bot を識別する fixture-based ERE
#                                  (Issue #648 DA Must 対応で structurally narrow)
#   - is_protected_branch <name>  : ブランチ名が保護対象なら exit 0
#   - body_contains_ai_coauthor   : stdin 本文に AI bot 由来 Co-Authored-By が
#                                   含まれれば exit 0 (行単位 AND 判定)
#   - literal_contains_ai_coauthor : stdin literal に AI bot 由来 Co-Authored-By
#                                    が含まれれば exit 0 (行単位 AND 判定)
#
# 適用箇所:
#   - .githooks/pre-commit  (master / main 直 commit 拒否)
#   - .githooks/commit-msg  (AI bot 由来 Co-Authored-By 検出)
#   - .claude/hooks/pre-commit-guard.sh (Bash PreToolUse hook の早期 FB 層)
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

# ----------------------------------------------------------------------------
# Co-Authored-By 検出 (Issue #648 / DA Must 対応版)
# ----------------------------------------------------------------------------
#
# 設計方針 (Issue #648):
#   `Co-Authored-By` を「全面禁止」すると、以下の正当なユースケースを巻き添えに
#   block してしまう:
#     - dependabot PR の取り込み時に元 PR の Co-Authored-By が引き継がれる
#     - 人間同士の pair programming で互いを Co-Authored-By に挙げる
#     - GitHub の "Co-authored commits" 公式機能を使う場合
#   CLAUDE.md のルール (「Co-Authored-By を含めないこと」) は実質的には
#   **AI bot 由来のクレジット行を禁止** する意図のもの。よって hook 側は
#   「AI bot を示唆する `Co-Authored-By` 行」のみを block するように絞り込む。
#
# DA Must 対応 (誤検知排除 / 構造的判定への置換):
#   旧実装は「単純 sub-string (claude / copilot / ...)」で判定していたため、
#   以下の正当ケースを誤 block していた:
#     - Co-Authored-By: Claudette Colvin <ccolvin@example.com>  ← 人名 substring 衝突
#     - Co-Authored-By: Codexa Smith <codexa@example.com>      ← 人名 substring 衝突
#     - "fix: テストで Co-Authored-By: Claude の挙動を確認"     ← 説明文中の言及
#
#   これを構造的判定に置換する。検出は **fixture-based regex** を採用し、
#   現実の AI bot コミット形式に限定:
#     1. 既知 AI bot の email ドメイン
#        - <...@anthropic.com>   (Claude / Claude Code)
#        - <...@openai.com>      (OpenAI / Codex)
#        - <...@cursor.sh>       (Cursor IDE)
#        - <...@cursor.com>      (Cursor IDE)
#     2. GitHub Apps bot suffix `[bot]` + 既知 vendor email
#        - github-copilot[bot] <copilot@github.com> 等
#        - 一般化: `[bot]` を含む name + copilot/cursor 等 vendor 識別子を含む email
#   人名 (Claudette / Codexa 等) は email 形式に該当しないため誤検知しない。
#   説明文中の言及 (`Co-Authored-By: Claude の挙動`) も「`Co-Authored-By:` を
#   含む行に AI bot email/bot-suffix を **同行内** で要求」する AND 条件のため、
#   email 形式を満たさず通過する。
#
# 提供インターフェース:
#   - COAUTHOR_HEADER_RE         : `Co-Authored-By:` 行検出用 ERE (本文向け)
#   - COAUTHOR_LITERAL_HEADER_RE : `Co-Authored-By:` 検出用 ERE (literal 向け)
#   - COAUTHOR_AI_BOT_RE         : AI bot を識別する fixture-based ERE
#   - body_contains_ai_coauthor  : stdin の本文に AI 由来 Co-Authored-By が
#                                  含まれれば 0 (行単位 AND)
#   - literal_contains_ai_coauthor : stdin の literal 文字列に AI 由来
#                                    Co-Authored-By が含まれれば 0 (行単位 AND)
#
# 表記揺れの扱い (S3 / S4):
#   - `Co_Authored_By` (アンダースコア) 等の異形は git trailer 仕様外。
#     git 自身が trailer として認識せず公式表記に変換しないため、本 hook の
#     サポート対象外とする (実害が無い)。
#   - 全角コロン (`Co-Authored-By：`) も git trailer として認識されないため
#     block 不要。Git の interpret-trailers / mailinfo は ASCII コロンのみを
#     trailer 区切りとして扱う。
#
# 注意:
#   - 検出は **case-insensitive** で評価される (`grep -iE` を使う)。
#   - AI bot 識別 regex は ASCII email/角括弧 bot suffix のみを対象とする。
#     新規 AI bot vendor を追加する場合は COAUTHOR_AI_BOT_RE に alternation を
#     足すだけで全 hook に伝播する。

# 本文 (行単位 grep) 向け: 行頭または空白の直後に `co-authored-by` + `:` を要求
COAUTHOR_HEADER_RE='(^|[[:space:]])co-authored-by[[:space:]]*:'
# shell literal 向け: 前置条件を要求しない (shlex 後の literal は連結文字列のため)
COAUTHOR_LITERAL_HEADER_RE='co-authored-by[[:space:]]*:'

# AI bot を fixture-based に識別する ERE (Issue #648 DA Must 対応)。
#
# マッチ条件 (OR):
#   (1) `<...@anthropic.com>`         : Anthropic (Claude / Claude Code)
#   (2) `<...@openai.com>`            : OpenAI (Codex 等)
#   (3) `<...@cursor.sh>` / `@cursor.com` : Cursor IDE
#   (4) `[bot]` を含む name と
#       `<...@(copilot|cursor|anthropic|openai)...>` 形式の email の組み合わせ
#       (= GitHub Apps bot)
#
# regex は POSIX ERE (grep -E / grep -iE で評価される)。
# 大小区別なし運用のため [A-Z] アルファベット範囲は使わず、case-insensitive
# フラグ側で吸収する。
#
# 拡張方針: 新規 AI bot を追加する場合は、メールドメイン pattern を `|` で
# 足すか、(4) の vendor 識別子に語彙を追加する。
COAUTHOR_AI_BOT_RE='<[^>]*@(anthropic\.com|openai\.com|cursor\.sh|cursor\.com)>|\[bot\][^<]*<[^>]*@[^>]*(copilot|cursor|anthropic|openai)[^>]*>|<[^>]*(copilot|noreply)[^>]*@github\.com>'

# (互換) 旧名: 既存呼び出し箇所で参照されている可能性に備え alias を残す。
# 新規コードでは COAUTHOR_HEADER_RE / COAUTHOR_LITERAL_HEADER_RE /
# COAUTHOR_AI_BOT_RE を使うこと。
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
# 判定する (Issue #648 / DA Must 対応版)。含まれていれば exit 0、それ以外は exit 1。
# 呼び出し側は本文のみ (= コメント行除去後) を流す責務を持つ。
#
# 実装 (行単位 AND 判定):
#   1. `Co-Authored-By:` を含む行のみを抽出 (行頭/空白後 + `:` で本文中の
#      単なる言及を弾く)
#   2. 抽出した **各行** に AI bot fixture (COAUTHOR_AI_BOT_RE) が
#      含まれるかを再 grep する
#   この 2 段階により以下を保証する:
#     - 「`Co-Authored-By:` 行であり」 AND 「同行に AI bot fixture を含む」
#     - 人名 substring (Claudette / Codexa) は email 形式に該当せず通過
#     - 本文中の説明 (`Co-Authored-By: Claude の挙動` 等) も同様に通過
#
# POSIX ERE で `\n` を否定文字クラスに入れる挙動は実装依存 (BSD/GNU で
# 差異あり) なので、行単位 grep を 2 回かけてポータビリティを担保する。
body_contains_ai_coauthor() {
  local lines
  lines=$(grep -iE "$COAUTHOR_HEADER_RE" || true)
  if [ -z "$lines" ]; then
    return 1
  fi
  if printf '%s' "$lines" | grep -qiE "$COAUTHOR_AI_BOT_RE"; then
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
# AI bot 由来の Co-Authored-By 表現が含まれるかを判定する
# (Issue #648 / DA Must 対応版 = 行単位 AND 判定)。
# 含まれていれば exit 0、それ以外は exit 1。
#
# DA Must M1 対応 (shell / native の挙動整合):
#   旧実装は「literal 全体で `co-authored-by:` AND AI 識別子 sub-string」を
#   OR 検出していたため、以下のような subject に AI 名を含む commit を
#   shell hook が誤 block していた:
#     g..it commit -m "feat: refactor copilot integration\n\nCo-Authored-By: Taro <taro@example.com>"
#       → shell: subject の "copilot" と body の "Co-Authored-By:" が両方
#                ヒットして誤 block
#       → native: 行単位 AND 判定で正しく pass
#   shell hook も **行単位 AND** に揃え、二層の挙動を一致させる。
#
# DA Must M2 対応 (実改行の扱い):
#   `git commit -m "..."` の引数に実改行 (literal LF) が含まれていても、
#   `-m` の中身は **行単位** で評価される必要がある。本関数は stdin に
#   流された literal を `\n` (literal 2 文字 backslash+n) と LF の両方で
#   split し、各論理行ごとに「`co-authored-by:` AND AI bot fixture」を
#   判定する。
#
# 実装:
#   1. stdin から content を取得
#   2. literal の `\n` (2 文字) を LF に置換して論理行 split
#   3. 各行ごとに `co-authored-by:` AND COAUTHOR_AI_BOT_RE を AND 判定
#   4. いずれかの行で AND 成立すれば exit 0
literal_contains_ai_coauthor() {
  local content
  content=$(cat)
  # literal の "\n" (2 文字 backslash + n) を実 LF に展開してから行単位処理
  # する。実改行入りの literal もそのまま行 split できる。
  # POSIX awk による split で BSD/GNU 双方の安定性を担保する。
  printf '%s' "$content" | awk '
    BEGIN { found = 0 }
    {
      # \\n (literal 2 文字) を実 LF に展開してから再 split する
      s = $0
      n = split(s, parts, /\\n/)
      for (i = 1; i <= n; i++) {
        line = tolower(parts[i])
        # 行内に "co-authored-by:" が無ければ即 skip
        if (line !~ /co-authored-by[[:space:]]*:/) continue
        # 同行内に AI bot fixture が含まれるか判定 (awk は ERE 標準)
        if (line ~ /<[^>]*@(anthropic\.com|openai\.com|cursor\.sh|cursor\.com)>/) { found = 1; exit }
        if (line ~ /\[bot\][^<]*<[^>]*@[^>]*(copilot|cursor|anthropic|openai)[^>]*>/) { found = 1; exit }
        if (line ~ /<[^>]*(copilot|noreply)[^>]*@github\.com>/) { found = 1; exit }
      }
    }
    END { exit (found ? 0 : 1) }
  '
}
