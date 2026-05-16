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
# さらに `git -C <path> <sub>` / `git -c key=val <sub>` のように先頭にグローバル
# オプションがあるケースも考慮し、subcommand 直前のオプション列を読み飛ばして
# 「正規化された git 呼び出し行」 (`git <sub> <args>`) を生成する。

# シェル区切りで正規化（置換してから grep）
NORMALIZED=$(printf '%s' "$COMMAND" | tr ';&|()`' '\n')

# git で始まる行を抽出（行頭空白を落としてからマッチ）
GIT_LINES=$(printf '%s\n' "$NORMALIZED" | sed -E 's/^[[:space:]]+//' | grep -E '^git[[:space:]]+' || true)

if [ -z "$GIT_LINES" ]; then
  exit 0
fi

# 各 git 行について、グローバルオプション (`-C <path>`、`-c key=val`、
# `--git-dir=...`、`--work-tree=...` 等) を読み飛ばして subcommand 以降に正規化する。
# 結果は GIT_INVOCATIONS (1 行 1 呼び出し) に格納し、以後の判定はこれを用いる。
GIT_INVOCATIONS=$(printf '%s\n' "$GIT_LINES" | python3 -c '
import shlex
import sys

for raw in sys.stdin:
    line = raw.rstrip("\n")
    if not line.strip():
        continue
    try:
        toks = shlex.split(line, posix=True)
    except ValueError:
        # クォート不整合は元の行をそのまま出す (誤検知より見逃しを避ける)
        print(line)
        continue
    if not toks or toks[0] != "git":
        print(line)
        continue
    j = 1
    while j < len(toks):
        t = toks[j]
        # `-C <path>` / `-c key=val` は次のトークンを引数として消費
        if t == "-C" or t == "-c":
            j += 2
            continue
        # `--git-dir=...` / `--work-tree=...` など値が = で連結されたオプションは 1 トークン
        if t.startswith("--") and "=" in t:
            j += 1
            continue
        # `--git-dir <path>` のように分離されているケース
        if t in ("--git-dir", "--work-tree", "--namespace", "--super-prefix",
                 "--exec-path"):
            j += 2
            continue
        # その他の単独オプション (--help / --version / --no-pager / --bare 等)
        if t.startswith("-"):
            j += 1
            continue
        break
    # subcommand 以降を再構築。引用は剥がされるが、後続の grep は単語境界しか見ない
    # ためここで quoting を厳密に復元する必要はない。
    print(" ".join(["git"] + toks[j:]))
' || true)

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

# ------------------------------------------------------------------
# worktree 対応のブランチ判定
# ------------------------------------------------------------------
# 旧実装は hook プロセスの cwd で `git branch --show-current` を評価していたため、
# Claude Code の cwd がメインリポでも、コマンド側で `cd <worktree>` / `git -C <worktree>`
# を使っている場合に master と誤判定されるバグがあった (Issue #550)。
#
# 対応方針: 実行されようとしている git commit/push が「どの worktree 上で実行されるか」を
# command 文字列から推定する。具体的には以下を順に確認する。
#   1. `git -C <path> commit|push` 形式 → <path> をターゲットに採用
#   2. `cd <path> && ... git commit|push` 形式 → <path> をターゲットに採用
#   3. いずれも無ければ hook プロセスの cwd を採用 (既存挙動)
# 採用した path で `git -C <path> rev-parse --abbrev-ref HEAD` を実行してブランチ名を得る。

# command 文字列から、commit/push を実行する作業ディレクトリ候補を抽出する。
# stdout に 1 行で path (なければ空文字) を出力する。
# 値は git/シェルに対する有効な絶対/相対パスを想定。
resolve_target_dir() {
  local cmd="$1"
  python3 - "$cmd" <<'PY' 2>/dev/null || true
import re
import shlex
import sys

command = sys.argv[1]

try:
    tokens = shlex.split(command, posix=True)
except ValueError:
    # クォート不整合等で分割不能な場合は諦める
    sys.exit(0)


def find_git_subcommand_dir(tokens):
    """tokens を走査して git commit/push 直前の -C <path> を探す。
    複数の git 呼び出しが && / ; で連結されているケースもあるが、
    shlex は区切り文字を独立トークンとして残さないため、本処理では
    「最初に commit/push を起こす git 呼び出しの -C」を採る。
    """
    # 値を伴うグローバルオプション (次のトークンを引数として消費する)
    OPTS_WITH_ARG = {"-C", "-c", "--git-dir", "--work-tree", "--namespace",
                     "--super-prefix", "--exec-path"}
    n = len(tokens)
    i = 0
    while i < n:
        if tokens[i] == "git":
            # `git -C <path> ... <subcmd>` をパースする
            j = i + 1
            target_dir = None
            while j < n:
                tok = tokens[j]
                if tok == "-C" and j + 1 < n:
                    target_dir = tokens[j + 1]
                    j += 2
                    continue
                if tok in OPTS_WITH_ARG and j + 1 < n:
                    # -c key=val 等の値を持つオプションはペアで消費
                    j += 2
                    continue
                # `--git-dir=<path>` のように = 連結された形は 1 トークン
                if tok.startswith("--") and "=" in tok:
                    j += 1
                    continue
                if tok.startswith("-"):
                    # その他の単独オプション (--no-pager / --bare / -p 等)
                    j += 1
                    continue
                # サブコマンド
                if tok in ("commit", "push"):
                    return target_dir, True  # commit/push を含むので確定
                # commit/push 以外の git 呼び出しはスキップして次の git を探す
                break
            i = j + 1
            continue
        i += 1
    return None, False


def find_cd_before_git(command_str):
    """`cd <path> && ... git commit|push` パターンを ; / && / || / | で分割して検出する。
    最後にマッチした cd 直後の同一セグメントを採用する (典型: cd X && git commit ...)。
    """
    # シェルの区切り文字でセグメント分割 (簡易: ヒアドキュメント等は対象外)
    segments = re.split(r"(?:&&|\|\||;|\|)", command_str)
    target = None
    for seg in segments:
        seg = seg.strip()
        # `cd <path>` で始まるセグメントから path を取得
        m = re.match(r"^cd\s+(.+?)\s*$", seg)
        if m:
            try:
                parsed = shlex.split(m.group(1), posix=True)
            except ValueError:
                continue
            if parsed:
                target = parsed[0]
            continue
        # `cd <path> && git commit ...` のような複合は && で分割されるので
        # ここには到達しないが、念のため `cd X; git commit` のような同一セグメント内
        # も拾えるよう簡易チェック
    return target


# 1) git -C <path> commit|push を最優先
dir_from_dashC, has_commit_push = find_git_subcommand_dir(tokens)

# 2) commit/push が含まれていなければ何も出さない
if not has_commit_push:
    # commit/push 自体が無いなら呼び出し側でブランチチェックする必要は無い
    sys.exit(0)

if dir_from_dashC:
    print(dir_from_dashC)
    sys.exit(0)

# 3) `cd <path>` を含むセグメントから推定
cd_dir = find_cd_before_git(command)
if cd_dir:
    print(cd_dir)
    sys.exit(0)

# 4) なければ何も出さない (呼び出し側で cwd を使う)
PY
}

# master/main への直接 commit / push 拒否
if printf '%s\n' "$GIT_INVOCATIONS" | grep -Eq '^git[[:space:]]+(commit|push)([[:space:]]|$)'; then
  TARGET_DIR=$(resolve_target_dir "$COMMAND" || true)

  if [ -n "${TARGET_DIR:-}" ]; then
    # path 展開 (~ は通常 shell が展開するが、JSON 経由で渡される command は
    # 未展開のまま到達しうるため、ここで bash 側でも tilde 展開を試みる)
    case "$TARGET_DIR" in
      "~"|"~/"*) TARGET_DIR="${HOME}${TARGET_DIR#\~}" ;;
    esac
    CURRENT_BRANCH=$(git -C "$TARGET_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    # 指定パスでブランチ取得に失敗した場合 (存在しないパス / git リポではない 等) は
    # 攻撃面 (任意パス指定でガード bypass) を塞ぐため、保守的にブロックする。
    # 実 git は同様の状況でエラー終了するため、ここでブロックしても誤検知は生まない。
    if [ -z "$CURRENT_BRANCH" ]; then
      block "git -C / --git-dir 等で指定された path がリポジトリとして解決できません: $TARGET_DIR"
    fi
  else
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  fi

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
