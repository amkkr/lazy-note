#!/usr/bin/env bash
# pre-commit-guard: git commit / push / rebase 実行前の規約チェック
# PreToolUse hook として Bash ツール実行前に呼ばれる
# 標準入力からJSON（tool_input.command含む）を受け取り、違反時は JSON decision:block を stdout に出力
#
# 設計方針 (Issue #568 — Counterpoint 32 を採用):
#   本 hook は「shell コマンド文字列を解析」する PreToolUse hook であり、構造的に
#   bypass 可能なパターンが多数存在する (例: `eval`, `bash -c`, env-prefix, 絶対パス,
#   `env -C`, alias, 行継続, 引用符による分割回避 など — Issue #568 の E01-E11)。
#   shell の文字列解析ですべての bypass を塞ぐのは本質的に不可能なので、
#   責務を「コマンド文字列で素直に判定できるもの」だけに絞り、bypass 不可能性を
#   要求する判定は git ネイティブ hook (`.githooks/pre-commit` + `core.hooksPath`)
#   に委ねる方針とする (follow-up Issue: #592 — Counterpoint 31)。
#
# 本 hook が施行する規約:
#   1. `git rebase` 禁止 — sub-command 名そのものの literal 判定
#   2. `git push --force` / `-f` / `--force-with-lease` 禁止 — オプション literal 判定
#   3. コミットメッセージ内に `Co-Authored-By` を含めない — `-m`/`--message` 引数の文字列判定
#   4. master/main ブランチへの直接 commit/push 拒否 (best-effort)
#      ※ 4 は shell 文字列解析の限界により bypass 可能。
#         本質的な保護は git ネイティブ hook に委ねる (#592 — Counterpoint 31)。
#         本 hook では「素朴な `git commit -m x` を master で叩いた場合」のみ best-effort で block する。
#
# 既知の限界 (= Counterpoint 31 / Issue #592 まで残る bypass):
#   - env 変数 prefix (`PAGER=cat git commit ...`)
#   - 絶対パス (`/usr/bin/git commit ...`)
#   - sudo / 前置コマンド (`sudo`, `nice`, `timeout`, `stdbuf` 等)
#   - indirection (`eval "git ..."`, `bash -c "git ..."`)
#   - env 変数経由の git 設定 (`GIT_DIR=... git commit`)
#   - `env -C <path> git commit`
#   - alias (`alias gc="git commit"; gc -m x`)
#   - 行継続 (`git \<NL> commit`)
#   - quoted command (`"git" commit`)
#   - コマンド置換による path 隠蔽 (`git -C "$(echo $REPO)" commit`)
#
# Counterpoint 32 (worktree allowlist) について:
#   本 PR では allowlist を実装しない。理由は以下:
#     - 「literal な `cd <path>` / `git -C <path>` の path 抽出」は既存実装
#       (resolve_target_dir) でカバー済みで、worktree 経由のブランチ判定は正しく
#       動作する (Issue #550 / Issue #567 の対応範囲)。
#     - 動的に決まる path (コマンド置換・変数展開) は shell 文字列解析の限界により
#       allowlist でも本質的に防げないため、ここで追加実装する価値が薄い。
#     - 上記の構造的 bypass は #592 (Counterpoint 31 = git ネイティブ pre-commit hook)
#       で塞ぐ計画であり、それまでは本 hook は best-effort に留める。
#   よって、固定 path 列の allowlist 実装は #592 の完了後に再評価することとし、
#   本 hook では追加実装しない。

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
  local base_cwd="$2"
  python3 - "$cmd" "$base_cwd" <<'PY' 2>/dev/null || true
import os
import re
import shlex
import sys

command = sys.argv[1]
base_cwd = sys.argv[2] or os.getcwd()

try:
    tokens = shlex.split(command, posix=True)
except ValueError:
    # クォート不整合等で分割不能な場合は諦める (呼び出し側で cwd を使う)
    sys.exit(0)


def find_git_target_dir(tokens):
    """tokens を走査して git commit/push の作業ディレクトリ指定を抽出する。

    優先順位 (git の実挙動に合わせる):
        1. -C <path>            : 後続コマンドの cwd 相当
        2. --work-tree=<path> / --work-tree <path>
        3. --git-dir=<path> / --git-dir <path>
            → 「親ディレクトリ」が worktree の作業ツリーである場合があるが、
              .git そのものを指定されたケースは親、--git-dir=<path>/.git の
              ようなケースも親を採用する (実用上、worktree の場合は
              .git ファイル等が指している先と一致するため、ここでは親を採る)

    複数の git 呼び出しが && / ; で連結されているケースもあるが、
    shlex は区切り文字を独立トークンとして残さない。本処理では
    「最初に commit/push を起こす git 呼び出しのターゲット」を採る。
    """
    OPTS_WITH_ARG = {"-C", "-c", "--git-dir", "--work-tree", "--namespace",
                     "--super-prefix", "--exec-path"}
    n = len(tokens)
    i = 0
    while i < n:
        if tokens[i] == "git":
            j = i + 1
            dash_c = None
            work_tree = None
            git_dir = None
            while j < n:
                tok = tokens[j]
                if tok == "-C" and j + 1 < n:
                    dash_c = tokens[j + 1]
                    j += 2
                    continue
                if tok == "--work-tree" and j + 1 < n:
                    work_tree = tokens[j + 1]
                    j += 2
                    continue
                if tok == "--git-dir" and j + 1 < n:
                    git_dir = tokens[j + 1]
                    j += 2
                    continue
                if tok.startswith("--work-tree=") :
                    work_tree = tok.split("=", 1)[1]
                    j += 1
                    continue
                if tok.startswith("--git-dir="):
                    git_dir = tok.split("=", 1)[1]
                    j += 1
                    continue
                if tok in OPTS_WITH_ARG and j + 1 < n:
                    # -c key=val 等の値を持つオプションはペアで消費
                    j += 2
                    continue
                if tok.startswith("--") and "=" in tok:
                    j += 1
                    continue
                if tok.startswith("-"):
                    # 単独オプション (--no-pager / --bare / -p 等)
                    j += 1
                    continue
                if tok in ("commit", "push"):
                    # 優先順: -C > --work-tree > --git-dir の親
                    target = dash_c or work_tree
                    if not target and git_dir:
                        # `.../.git` を指された場合は親、それ以外でも親を取る
                        # (worktree の場合 .git は親が作業ツリー)
                        target = os.path.dirname(git_dir.rstrip("/")) or git_dir
                    return target, True
                break
            i = j + 1
            continue
        i += 1
    return None, False


# シェル区切り (; && || |) をトークンとして残す split を自前で実装する。
# `(` `)` `{` `}` `$(` `` ` `` はサブシェル/コマンド置換境界として扱う。
# 既存実装は re.split で区切り文字を捨てていたため、cd と git の前後関係が
# 失われていた。ここでは「セグメントごとに先頭トークンを見る」方式に変える。
_SPLIT_RE = re.compile(r'(\|\||&&|;|\||\(|\)|\{|\}|`|\$\()')


def split_segments(command_str):
    """コマンド文字列をシェルの論理境界で分割する。
    返り値は (segment_text, ...) のリスト。
    """
    parts = _SPLIT_RE.split(command_str)
    segs = []
    cur = []
    for p in parts:
        if p in ("||", "&&", ";", "|", "(", ")", "{", "}", "`", "$("):
            segs.append("".join(cur))
            cur = []
        else:
            cur.append(p)
    segs.append("".join(cur))
    return [s.strip() for s in segs if s and s.strip()]


_CD_RE = re.compile(r'^(?:cd|pushd)\s+(.+?)\s*$')


def collapse_cd_path(base_cwd, raw_path):
    """raw_path を base_cwd 上で解決して絶対パスを返す。
    `~` は HOME に展開する。`$(...)` や `$VAR` の展開は試みない (失敗扱い)。
    解決不能ならば None を返す。
    """
    if not raw_path:
        return None
    p = raw_path
    # ` ~` / `~/...` 展開
    if p == "~":
        p = os.path.expanduser("~")
    elif p.startswith("~/"):
        p = os.path.expanduser(p)
    # コマンド置換や変数展開を含む場合は解決を諦める
    if any(marker in p for marker in ("$(", "`", "${")):
        return None
    if "$" in p:
        # 単純な $VAR も展開できないので諦める
        return None
    if not os.path.isabs(p):
        p = os.path.join(base_cwd, p)
    return os.path.normpath(p)


def find_cwd_before_git_commit(command_str, base_cwd):
    """cd / pushd を順に追って commit/push 直前の cwd を求める。

    アルゴリズム:
        - command を ; && || | ( ) { } 等で論理セグメントに分割し、
          先頭から順に走査する
        - `cd <path>` / `pushd <path>` が現れたら、現在の cwd 候補を更新
        - `git commit` / `git push` を含む段に到達したら、その時点の cwd を返す
        - 到達せずに走査が終われば None

    サブシェル `(cd X && git commit)` の場合、( ) はセグメント境界として
    扱うので、( と ) の間 (= サブシェル内) を独立に走査する。
    本実装は厳密な構文解析ではなく「セグメント順走査」する近似だが、
    現実的な利用パターン (cd 系の直後に git commit) はカバーできる。
    """
    segments = split_segments(command_str)
    cwd = base_cwd
    for seg in segments:
        try:
            seg_tokens = shlex.split(seg, posix=True)
        except ValueError:
            seg_tokens = []
        if not seg_tokens:
            continue

        # `cd <path>` または `pushd <path>` だけのセグメント
        if seg_tokens[0] in ("cd", "pushd") and len(seg_tokens) >= 2:
            new_cwd = collapse_cd_path(cwd, seg_tokens[1])
            if new_cwd:
                cwd = new_cwd
            else:
                # path 解決不能 (= コマンド置換等) の場合はそれ以上追えない
                # 攻撃面を広げないため cwd は更新しない (= base_cwd のまま)
                pass
            continue

        # git commit / git push (or git -C ... commit/push) を含む段に到達
        # ここでは tokens の中に "commit" / "push" があれば cwd を返す
        if seg_tokens[0] == "git":
            # find_git_target_dir でこのセグメント単体の git 呼び出しを評価
            target, has_cp = find_git_target_dir(seg_tokens)
            if has_cp:
                if target:
                    # -C / --work-tree / --git-dir 由来の path は cwd 相対
                    resolved = collapse_cd_path(cwd, target)
                    return resolved or cwd
                return cwd
    return None


# 1) git -C <path> / --work-tree / --git-dir を最優先
dir_from_git_opts, has_commit_push = find_git_target_dir(tokens)

# 2) commit/push が含まれていなければ何も出さない
if not has_commit_push:
    sys.exit(0)

if dir_from_git_opts:
    # 解決した path が相対なら base_cwd で絶対化
    resolved = collapse_cd_path(base_cwd, dir_from_git_opts)
    # コマンド置換等で解決できない場合は何も出さない (呼び出し側で cwd を使う)
    if resolved is None:
        sys.exit(0)
    print(resolved)
    sys.exit(0)

# 3) cd / pushd / subshell を辿って commit/push 直前の cwd を求める
cwd = find_cwd_before_git_commit(command, base_cwd)
if cwd:
    print(cwd)
    sys.exit(0)

# 4) なければ何も出さない (呼び出し側で cwd を使う)
PY
}

# master/main への直接 commit / push 拒否
if printf '%s\n' "$GIT_INVOCATIONS" | grep -Eq '^git[[:space:]]+(commit|push)([[:space:]]|$)'; then
  # base_cwd は hook プロセスの cwd (= Bash ツール実行時の cwd)
  BASE_CWD=$(pwd)
  TARGET_DIR=$(resolve_target_dir "$COMMAND" "$BASE_CWD" || true)

  # `--git-dir=` / `--work-tree=` が COMMAND 内に明示されているかを判定する
  # (これらが指定されていてかつ path 解決に失敗した場合は攻撃の意図が強いため
  #  block する。それ以外で TARGET_DIR が空になるのは cwd 相当で評価したい
  #  典型ケース or 解析に失敗したケースなので、cwd で fallback 評価する。)
  HAS_EXPLICIT_GIT_DIR_OPT=0
  if printf '%s' "$COMMAND" | grep -Eq '(^|[[:space:]])--(git-dir|work-tree)([[:space:]=])'; then
    HAS_EXPLICIT_GIT_DIR_OPT=1
  fi

  if [ -n "${TARGET_DIR:-}" ]; then
    # まず TARGET_DIR 自身で rev-parse を試す
    CURRENT_BRANCH=$(git -C "$TARGET_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    # 存在しない subdir 等で失敗した場合は祖先ディレクトリを最大 8 階層辿る
    # (実 git は cwd 配下から .git を探すので、これと挙動を合わせる)
    if [ -z "$CURRENT_BRANCH" ]; then
      ANCESTOR="$TARGET_DIR"
      for _ in 1 2 3 4 5 6 7 8; do
        PARENT=$(dirname "$ANCESTOR")
        if [ "$PARENT" = "$ANCESTOR" ] || [ "$PARENT" = "/" ]; then
          break
        fi
        ANCESTOR="$PARENT"
        CURRENT_BRANCH=$(git -C "$ANCESTOR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
        if [ -n "$CURRENT_BRANCH" ]; then
          break
        fi
      done
    fi
    if [ -z "$CURRENT_BRANCH" ]; then
      if [ "$HAS_EXPLICIT_GIT_DIR_OPT" = "1" ]; then
        # 明示的に --git-dir / --work-tree で path 指定 → 解決失敗は block
        block "--git-dir / --work-tree で指定された path がリポジトリとして解決できません: $TARGET_DIR"
      fi
      # それ以外は cwd にフォールバック (元実装の挙動と同等の安全側)
      CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    fi
  else
    # TARGET_DIR が空 = resolve_target_dir が path 推定を諦めた
    # この場合は元実装と同じく hook プロセスの cwd で評価する。
    # ただし --git-dir / --work-tree が明示されているのに path が拾えなかった
    # (コマンド置換等で解析不能) ケースは block する。
    if [ "$HAS_EXPLICIT_GIT_DIR_OPT" = "1" ]; then
      block "--git-dir / --work-tree の引数が解析できません。直接 path を指定してください。"
    fi
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
