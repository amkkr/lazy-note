#!/usr/bin/env bash
# pre-commit-guard.sh + .githooks/pre-commit のテストハーネス
#
# 実行方法:
#   bash .claude/hooks/__tests__/pre-commit-guard.test.sh
#
# 何をするか:
#   1. /tmp に隔離されたテスト用 git リポと worktree を作成
#   2. テスト用リポに core.hooksPath を設定し、.githooks/pre-commit と
#      .githooks/commit-msg を有効化する (Issue #592)
#   3. 各 test case (TESTS) を JSON 経由で pre-commit-guard.sh に投入し、
#      shell hook 経路で block されるかを確認する (Phase 1)
#   4. Phase 1 で pass だったケースのうち、native-hook 期待値が block の
#      ものは、実際に shell でコマンドを eval して .githooks/pre-commit
#      (= git ネイティブ hook) が block するかを確認する (Phase 2)
#   5. 失敗があれば exit 1
#
# 期待値ラベル (Phase 1 = shell hook):
#   pass             - hook が素通り (decision:block を出さない)
#   block            - hook が block を出す
#   block-via-native - shell hook では検知不能だが、git native hook で必ず塞がれる
#                      (= 構造的 bypass パターン。Issue #592 で塞ぐ対象)
#
# 旧 known-limitation ラベルは Issue #592 (Counterpoint 31) の実装完了に伴い廃止し、
# 全件 block-via-native へ昇格した。
#
# harness exit code contract (CI 側と共有):
#   - FAIL > 0       -> exit 1 (CI を fail させる)
#   - FAIL == 0      -> exit 0
#
# 本テストは Bash ツールの PreToolUse hook (pre-commit-guard.sh) と
# 同じスクリプトを呼び出すため、テスト実行コマンド自身に
# 'git commit' などの literal を含めないこと。コマンド文字列は配列に
# 'g' 'it' のように分割して書き、後で結合する。

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
HOOK_PATH="$REPO_ROOT/.claude/hooks/pre-commit-guard.sh"
GITHOOKS_DIR="$REPO_ROOT/.githooks"
NATIVE_PRE_COMMIT="$GITHOOKS_DIR/pre-commit"
NATIVE_COMMIT_MSG="$GITHOOKS_DIR/commit-msg"

if [ ! -x "$HOOK_PATH" ]; then
  echo "FATAL: hook not executable: $HOOK_PATH" >&2
  exit 2
fi

if [ ! -x "$NATIVE_PRE_COMMIT" ]; then
  echo "FATAL: native pre-commit hook not executable: $NATIVE_PRE_COMMIT" >&2
  exit 2
fi

if [ ! -x "$NATIVE_COMMIT_MSG" ]; then
  echo "FATAL: native commit-msg hook not executable: $NATIVE_COMMIT_MSG" >&2
  exit 2
fi

# テスト用の隔離リポを作成 (毎回 clean)
TEST_ROOT="$(mktemp -d -t pre-commit-guard-test.XXXXXX)"
# クリーンアップ:
#   - sudo g..it commit を実行する E03 ケースは、CI (passwordless sudo) 環境では
#     root 所有の .git/objects を作成する。通常の `rm -rf` だと EACCES で消せず
#     exit 1 になり、harness 末尾の `exit 0` が trap によって上書きされる
#     ( = テスト全件 OK でも CI が fail する )。
#   - 対策として: (1) chmod -R u+w で書き込み権限を強制し、(2) それでも消せない
#     場合は sudo rm を試み、(3) 最終的にエラーは無視する。
#   - trap 内の失敗は trap 自体の exit code に伝播し最終 exit を上書きしうるため、
#     `|| true` で握り潰し、stderr も `2>/dev/null` に流す。
cleanup_test_root() {
  if [ -z "${TEST_ROOT:-}" ] || [ ! -e "$TEST_ROOT" ]; then
    return 0
  fi
  chmod -R u+w "$TEST_ROOT" 2>/dev/null || true
  rm -rf "$TEST_ROOT" 2>/dev/null || true
  if [ -e "$TEST_ROOT" ]; then
    # 残骸があれば sudo -n (non-interactive) で再試行。CI の passwordless sudo
    # でのみ成功する想定。ローカル (sudo にパスワード要求) では何もしない。
    sudo -n rm -rf "$TEST_ROOT" 2>/dev/null || true
  fi
  return 0
}
trap cleanup_test_root EXIT

MAIN_REPO="$TEST_ROOT/main-repo"
WORKTREE="$TEST_ROOT/work-tree"

setup_test_repo() {
  git init -q -b master "$MAIN_REPO"
  (
    cd "$MAIN_REPO"
    git config user.email test@example.com
    git config user.name test-user
    # Issue #592: テスト用リポでも本リポと同じ git ネイティブ hooks を有効化する。
    # core.hooksPath は per-repository 設定なので、$MAIN_REPO の .git/config に
    # 書かれ、worktree (= $WORKTREE) からも共有される。
    git config core.hooksPath "$GITHOOKS_DIR"
    echo init > README.md
    git add README.md
    # 初回 init commit は master 上で行うため、本来 native pre-commit が block する。
    # ここは setup なので明示的に --no-verify を使う (現実のリポ運用と分離した
    # テスト fixture 整備のため許容)。
    git -c commit.gpgsign=false commit -q --no-verify -m init
    git worktree add -q "$WORKTREE" -b feat/test
  )
  # consecutive cd テスト用の subdir
  mkdir -p "$WORKTREE/src"
}

# Phase 2 用: 「commit を試みる前にステージ済み変更を作る」ヘルパ。
# 各 case 実行前に呼ぶことで、commit が「stageに変更がない」理由で fail することを防ぐ。
stage_dummy_change() {
  local repo_dir="$1"
  local stamp
  stamp=$(date +%s%N)
  printf 'change-%s\n' "$stamp" > "$repo_dir/dummy-$stamp.txt"
  git -C "$repo_dir" add "dummy-$stamp.txt"
}

# Phase 2 用: native hook 経路の評価。
# - 隔離リポを stage 状態にしてから、引数の shell コマンドを `bash -c` で実行する
# - 実行結果 exit code が非ゼロ (= commit が拒否された) なら "block"、ゼロなら "pass"
# - sudo / 絶対パス /usr/bin/git / env -C / alias / etc. の現実環境依存はそのまま eval する
# - PAGER 等の env-prefix も bash -c で評価される
#
# 注意: commit が成功してしまった場合、testリポの履歴が伸びてしまうので、
# 後続ケースの判定に影響する可能性は低い (各ケース独立) が、念のため
# stage_dummy_change で commit ごとに新規ファイルを使う設計にしている。
run_native_hook_case() {
  local id="$1"
  local cwd="$2"
  local command="$3"
  local label="$4"

  # cwd が main-repo または worktree のどちらかであることを前提に
  # stage_dummy_change の対象を決める。コマンド内で cd / git -C で
  # 移動するケースは「commit が実行される側」のリポにステージが必要。
  # ここでは保守的に両方にステージを作る。
  stage_dummy_change "$MAIN_REPO"
  stage_dummy_change "$WORKTREE"

  # bash -c で eval。stderr/stdout は捨てる (block message は不要)
  # PATH は親シェルから引き継ぐ。
  local exit_code
  if (cd "$cwd" && bash -c "$command") >/dev/null 2>&1; then
    exit_code=0
  else
    exit_code=$?
  fi

  if [ "$exit_code" -ne 0 ]; then
    printf "  %-22s %-22s OK   (block via native hook)  %s\n" \
      "$id" "[native-hook]" "$label"
    return 0
  fi

  printf "  %-22s %-22s FAIL native hook did not block  %s\n" \
    "$id" "[native-hook]" "$label"
  return 1
}

# テスト本体 (1 ケース実行 — Phase 1: shell hook 経路)
#   args: <id> <expected:pass|block|block-via-native> <kind> <cwd> <command> <label>
# 戻り値:
#   0 = OK (Phase 1 のみで判定確定)
#   1 = FAIL
#   2 = DEFER (Phase 2 = native hook 経路で再評価が必要)
run_case() {
  local id="$1"
  local expected="$2"
  local kind="$3"
  local cwd="$4"
  local command="$5"
  local label="$6"

  local json
  json=$(python3 -c '
import json, sys
print(json.dumps({"tool_input": {"command": sys.argv[1]}}))
' "$command")

  local out exit_code actual
  out=$(cd "$cwd" && printf "%s" "$json" | "$HOOK_PATH" 2>&1)
  exit_code=$?
  if [ $exit_code -ne 0 ]; then
    actual="sh-err"
  elif printf "%s" "$out" | grep -q '"decision":"block"'; then
    actual="block"
  else
    actual="pass"
  fi

  if [ "$expected" = "block-via-native" ]; then
    # shell hook が block していれば「両層で塞がれている」状態なので OK
    if [ "$actual" = "block" ]; then
      printf "  %-22s %-22s OK   (block via shell)       %s\n" \
        "$id" "[$kind]" "$label"
      return 0
    fi
    # shell hook が pass / sh-err の場合は native hook 経路で再評価する
    return 2
  fi

  if [ "$actual" = "$expected" ]; then
    printf "  %-22s %-22s OK   (%s)              %s\n" \
      "$id" "[$kind]" "$actual" "$label"
    return 0
  fi

  printf "  %-22s %-22s FAIL expected=%s actual=%s  %s\n" \
    "$id" "[$kind]" "$expected" "$actual" "$label"
  return 1
}

# -----------------------------------------------------------------------------
# テストケース定義
# -----------------------------------------------------------------------------
# 注: コマンド文字列に literal の "git commit" を入れると、本テスト実行に
# Bash ツール (PreToolUse hook = pre-commit-guard.sh) が反応する場合がある。
# それを避けるため、`g` と `it` を分けて連結する書き方を採用する。
GIT="g""it"

declare -a TESTS=()

# kind / expected / cwd / command / label
add_case() {
  TESTS+=("$1"$'\t'"$2"$'\t'"$3"$'\t'"$4"$'\t'"$5"$'\t'"$6")
}

# --- baseline (sanity) -------------------------------------------------------
add_case "S01" "block" "sanity" \
  "$MAIN_REPO" "$GIT commit -m x" \
  "direct commit on master is blocked"

add_case "S02" "pass" "sanity" \
  "$WORKTREE" "$GIT commit -m x" \
  "direct commit on worktree branch passes"

# --- Issue #550 fix (worktree 対応) ------------------------------------------
add_case "R01" "pass" "fix-required" \
  "$MAIN_REPO" "cd $WORKTREE && $GIT commit -m x" \
  "cd worktree && commit (basic Issue #550 fix)"

add_case "R02" "pass" "fix-required" \
  "$MAIN_REPO" "$GIT -C $WORKTREE commit -m x" \
  "git -C worktree commit"

add_case "R03" "pass" "fix-required" \
  "$MAIN_REPO" "(cd $WORKTREE && $GIT commit -m x)" \
  "subshell (cd worktree && commit)"

add_case "R04" "pass" "fix-required" \
  "$MAIN_REPO" "pushd $WORKTREE && $GIT commit -m x" \
  "pushd worktree && commit"

add_case "R05" "pass" "fix-required" \
  "$MAIN_REPO" "cd $WORKTREE && cd src && $GIT commit -m x" \
  "consecutive cd: cd worktree && cd subdir && commit"

# Issue #592: cd 後の subshell で shell hook の cwd 解析は main-repo に
# 落ちて「master 判定 → block」となるが、実際にコマンドを eval すると
# subshell 内で cwd は worktree (= feat/test) なので native hook は pass する。
# 本ケースは shell hook が安全側に block する挙動を block-via-native (= 両層で
# どちらかが block すれば OK) として固定する。Issue #592 完了後に shell hook の
# 解析精度が上がって R06 が pass 化したら、その時点で expected を pass に戻す
# (native hook 側でも pass する想定であり、現実の commit が block されないことが正しい)。
add_case "R06" "block" "fix-required" \
  "$MAIN_REPO" "cd $WORKTREE && ($GIT commit -m x)" \
  "cd worktree && (commit) nested subshell — shell hook safe-side block"

# --- --git-dir / --work-tree 系 (Critical 19-20) -----------------------------
add_case "X01" "pass" "fix-required" \
  "$MAIN_REPO" "$GIT --git-dir=$WORKTREE/.git --work-tree=$WORKTREE commit -m x" \
  "--git-dir + --work-tree on worktree path passes"

add_case "X02" "pass" "fix-required" \
  "$MAIN_REPO" "$GIT --work-tree=$WORKTREE commit -m x" \
  "--work-tree only on worktree path passes"

add_case "X03" "block" "fix-required" \
  "$MAIN_REPO" "$GIT --git-dir=/nonexistent/path/.git commit -m x" \
  "--git-dir=<nonexistent> is blocked (attack-surface safeguard)"

# --- Co-Authored-By 検出 (regression sanity) ---------------------------------
add_case "CA01" "block" "sanity" \
  "$WORKTREE" "$GIT commit -m \"feat\\n\\nCo-Authored-By: x <x@x>\"" \
  "Co-Authored-By in -m blocks"

add_case "CA02" "pass" "sanity" \
  "$WORKTREE" "echo Co-Authored-By > /tmp/x.txt && $GIT commit" \
  "Co-Authored-By in unrelated arg does not block"

# --- rebase / force push (regression sanity) ---------------------------------
add_case "RB01" "block" "sanity" \
  "$WORKTREE" "$GIT rebase master" \
  "git rebase is blocked"

add_case "FP01" "block" "sanity" \
  "$WORKTREE" "$GIT push --force origin feat/test" \
  "git push --force is blocked"

add_case "FP02" "block" "sanity" \
  "$WORKTREE" "$GIT push -f origin feat/test" \
  "git push -f is blocked"

# --- 構造的 bypass (Issue #592 / Counterpoint 31 で git native hook により塞ぐ) -----
# Issue #568 (Counterpoint 32 採用) で本 shell hook の責務は「shell コマンド文字列で
# 素直に判定できるもの」だけに絞ることが確定した。以下 E01-E11 は shell 文字列解析の
# 本質的限界に起因する bypass であり、shell hook では塞がない。
#
# Issue #592 (Counterpoint 31) で .githooks/pre-commit を導入し、git ネイティブ層で
# 必ず塞ぐ構造を作った。本ハーネスは Phase 2 で実際に bash -c で eval し、native
# hook (= core.hooksPath=.githooks 経由で発火する .githooks/pre-commit) が block する
# ことを確認する。
#
# expected = block-via-native:
#   - shell hook が block していれば Phase 1 で OK
#   - shell hook が pass / sh-err でも、native hook が block すれば Phase 2 で OK
#   - 両方とも block しなかった場合のみ FAIL
add_case "E01_BY13" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "PAGER=cat $GIT commit -m x" \
  "PAGER=cat g..it commit (env-prefix)"

add_case "E02_BY17" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "/usr/bin/$GIT commit -m x" \
  "absolute path /usr/bin/g..it"

add_case "E03_BY9" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "sudo $GIT commit -m x" \
  "sudo g..it commit"

add_case "E04_T8" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "eval \"$GIT commit -m bypass\"" \
  "eval \"g..it commit\""

add_case "E05_T9" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "bash -c \"$GIT commit -m x\"" \
  "bash -c \"g..it commit\""

add_case "E06_T29" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "GIT_DIR=$MAIN_REPO/.git $GIT commit -m x" \
  "GIT_DIR=... g..it commit"

add_case "E07_T38" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "env -C $MAIN_REPO $GIT commit -m x" \
  "env -C ... g..it commit"

add_case "E08_T30" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "alias gc=\"$GIT commit\"; gc -m x" \
  "alias gc=...; gc -m"

add_case "E09_BY4" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "$GIT \\\\
 commit -m x" \
  "g..it <newline> commit"

add_case "E10_BY16" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "\"$GIT\" commit -m x" \
  "\"g..it\" commit (quoted)"

add_case "E11_INJ1" "block-via-native" "structural-bypass" \
  "$MAIN_REPO" "$GIT -C \"\$(echo $MAIN_REPO)\" commit -m x" \
  "g..it -C \$(echo MAIN) commit"

# -----------------------------------------------------------------------------
# 実行
# -----------------------------------------------------------------------------
setup_test_repo

fail_count=0
ok_count=0

echo "pre-commit-guard.sh + .githooks/pre-commit test harness (Issue #592)"
echo "shell hook: $HOOK_PATH"
echo "native pre-commit hook: $NATIVE_PRE_COMMIT"
echo "native commit-msg hook: $NATIVE_COMMIT_MSG"
echo "test root: $TEST_ROOT"
echo "----------------------------------------"

for entry in "${TESTS[@]}"; do
  IFS=$'\t' read -r id expected kind cwd command label <<< "$entry"

  set +e
  run_case "$id" "$expected" "$kind" "$cwd" "$command" "$label"
  rc=$?
  set -e

  case "$rc" in
    0)
      ok_count=$((ok_count + 1))
      ;;
    1)
      fail_count=$((fail_count + 1))
      ;;
    2)
      # Phase 2: shell hook で塞げなかった block-via-native ケースを
      # 実際に bash -c で eval して native hook の block を確認する
      set +e
      run_native_hook_case "$id" "$cwd" "$command" "$label"
      native_rc=$?
      set -e
      if [ "$native_rc" -eq 0 ]; then
        ok_count=$((ok_count + 1))
      else
        fail_count=$((fail_count + 1))
      fi
      ;;
  esac
done

echo "----------------------------------------"
printf "TOTAL: %d  OK: %d  FAIL: %d\n" \
  "${#TESTS[@]}" "$ok_count" "$fail_count"

if [ "$fail_count" -gt 0 ]; then
  exit 1
fi
exit 0
