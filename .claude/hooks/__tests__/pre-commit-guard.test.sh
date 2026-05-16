#!/usr/bin/env bash
# pre-commit-guard.sh のテストハーネス
#
# 実行方法:
#   bash .claude/hooks/__tests__/pre-commit-guard.test.sh
#
# 何をするか:
#   1. /tmp に隔離されたテスト用 git リポと worktree を作成
#   2. 各 test case (TEST_CASES) を JSON 経由で pre-commit-guard.sh に投入
#   3. 期待される結果 (pass / block / known-limitation) と比較
#   4. 失敗があれば exit 1
#
# 期待値ラベル:
#   pass             - hook が素通り (decision:block を出さない) ことを期待
#   block            - hook が block を出すことを期待
#   known-limitation - 現状の実装の限界。block でも pass でも fail にはしない
#                      (shell 文字列解析の本質的限界 → Issue #592 (Counterpoint 31):
#                      git ネイティブ pre-commit hook 化で塞ぐ予定の項目)
#
# Issue #568 (Counterpoint 32 採用) で、本 hook の責務は
# 「shell コマンド文字列で素直に判定できるもの」だけに絞ることが確定した。
# これにより E01-E11 は known-limitation のまま放置でよい (本 hook の
# 責任範囲外) と整理された。本ハーネスにこれらのケースを残すのは
# Issue #592 (Counterpoint 31) 導入時に「block」昇格を検知する regression trail として。
#
# R06 (`cd worktree && (git commit)` nested subshell) は known-limitation ではなく
# 「block」期待値で固定する。元実装でも cwd が main-repo のまま評価されて master と
# 判定され block されており、これが現状の安全側挙動として正しい。Issue #592
# 完了時に R06 が「pass」に変化したら regression として検出される構造を保つ。
#
# 本テストは Bash ツールの PreToolUse hook (pre-commit-guard.sh) と
# 同じスクリプトを呼び出すため、テスト実行コマンド自身に
# 'git commit' などの literal を含めないこと。コマンド文字列は配列に
# 'g' 'it' のように分割して書き、後で結合する。

set -uo pipefail

HOOK_PATH="$(cd "$(dirname "$0")/.." && pwd)/pre-commit-guard.sh"
if [ ! -x "$HOOK_PATH" ]; then
  echo "FATAL: hook not executable: $HOOK_PATH" >&2
  exit 2
fi

# テスト用の隔離リポを作成 (毎回 clean)
TEST_ROOT="$(mktemp -d -t pre-commit-guard-test.XXXXXX)"
trap 'rm -rf "$TEST_ROOT"' EXIT

MAIN_REPO="$TEST_ROOT/main-repo"
WORKTREE="$TEST_ROOT/work-tree"

setup_test_repo() {
  git init -q -b master "$MAIN_REPO"
  (
    cd "$MAIN_REPO"
    git config user.email test@example.com
    git config user.name test-user
    echo init > README.md
    git add README.md
    git -c commit.gpgsign=false commit -q -m init
    git worktree add -q "$WORKTREE" -b feat/test
  )
  # consecutive cd テスト用の subdir
  mkdir -p "$WORKTREE/src"
}

# テスト本体 (1 ケース実行)
#   args: <id> <expected:pass|block|known-limitation> <kind> <cwd> <command> <label>
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

  if [ "$expected" = "known-limitation" ]; then
    # 結果は記録するだけで pass/fail 判定しない
    printf "  %-22s %-18s SKIP (actual=%s)  %s\n" "$id" "[$kind]" "$actual" "$label"
    return 0
  fi

  if [ "$actual" = "$expected" ]; then
    printf "  %-22s %-18s OK   (%s)         %s\n" "$id" "[$kind]" "$actual" "$label"
    return 0
  fi

  printf "  %-22s %-18s FAIL expected=%s actual=%s  %s\n" \
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

# cd 後に subshell が始まると cwd 継承ができないため、現状の resolve_target_dir は
# main-repo (= master) を判定対象として block する (= 安全側 fallback)。これは
# best-effort としての適切な挙動であり、Issue #592 (Counterpoint 31 = git native
# pre-commit hook) 完了後に「正しく worktree を解決した上で pass」へ変化すべき
# regression trail として block 期待値で固定する。
add_case "R06" "block" "fix-required" \
  "$MAIN_REPO" "cd $WORKTREE && ($GIT commit -m x)" \
  "cd worktree && (commit) nested subshell — safe-side block (Issue #592 で pass 化予定)"

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

# --- 構造的 bypass (Issue #568 で範囲外と確定、Issue #592 / Counterpoint 31 に委譲) -----
# Issue #568 (Counterpoint 32 採用) で本 hook の責務を「shell コマンド文字列で
# 素直に判定できるもの」に絞る方針が確立した。以下 E01-E11 は shell 文字列解析の
# 本質的限界に起因する bypass であり、本 hook では塞がない。
#
# 真の保護は git ネイティブ pre-commit hook (`.githooks/pre-commit` +
# `core.hooksPath`) で行う想定 (Issue #592 — Counterpoint 31 follow-up)。
# git ネイティブ hook 側であれば、どんな経路 (eval / bash -c / 絶対パス /
# env -C 等) から git commit を呼んでも必ず実行されるため、bypass は不可能となる。
#
# 本ハーネスでは「regression テスト」として E01-E11 をリストに残し、
# Issue #592 が将来導入されたタイミングで「block」期待値へ昇格させる
# trail を保つ。known-limitation のままなので pass/block どちらでも fail にしない。
add_case "E01_BY13" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "PAGER=cat $GIT commit -m x" \
  "PAGER=cat g..it commit (env-prefix) — git native hook で塞ぐ"

add_case "E02_BY17" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "/usr/bin/$GIT commit -m x" \
  "absolute path /usr/bin/g..it — git native hook で塞ぐ"

add_case "E03_BY9" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "sudo $GIT commit -m x" \
  "sudo g..it commit — git native hook で塞ぐ"

add_case "E04_T8" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "eval \"$GIT commit -m bypass\"" \
  "eval \"g..it commit\" — git native hook で塞ぐ"

add_case "E05_T9" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "bash -c \"$GIT commit -m x\"" \
  "bash -c \"g..it commit\" — git native hook で塞ぐ"

add_case "E06_T29" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "GIT_DIR=$MAIN_REPO/.git $GIT commit -m x" \
  "GIT_DIR=... g..it commit — git native hook で塞ぐ"

add_case "E07_T38" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "env -C $MAIN_REPO $GIT commit -m x" \
  "env -C ... g..it commit — git native hook で塞ぐ"

add_case "E08_T30" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "alias gc=\"$GIT commit\"; gc -m x" \
  "alias gc=...; gc -m — git native hook で塞ぐ"

add_case "E09_BY4" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "$GIT \\\\
 commit -m x" \
  "g..it <newline> commit — git native hook で塞ぐ"

add_case "E10_BY16" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "\"$GIT\" commit -m x" \
  "\"g..it\" commit (quoted) — git native hook で塞ぐ"

add_case "E11_INJ1" "known-limitation" "out-of-scope (Issue #592, Counterpoint 31)" \
  "$MAIN_REPO" "$GIT -C \"\$(echo $MAIN_REPO)\" commit -m x" \
  "g..it -C \$(echo MAIN) commit — git native hook で塞ぐ"

# -----------------------------------------------------------------------------
# 実行
# -----------------------------------------------------------------------------
setup_test_repo

fail_count=0
skip_count=0
ok_count=0

echo "pre-commit-guard.sh test harness"
echo "hook: $HOOK_PATH"
echo "test root: $TEST_ROOT"
echo "----------------------------------------"

for entry in "${TESTS[@]}"; do
  IFS=$'\t' read -r id expected kind cwd command label <<< "$entry"
  if [ "$expected" = "known-limitation" ]; then
    run_case "$id" "$expected" "$kind" "$cwd" "$command" "$label" || true
    skip_count=$((skip_count + 1))
    continue
  fi
  if run_case "$id" "$expected" "$kind" "$cwd" "$command" "$label"; then
    ok_count=$((ok_count + 1))
  else
    fail_count=$((fail_count + 1))
  fi
done

echo "----------------------------------------"
printf "TOTAL: %d  OK: %d  FAIL: %d  SKIP(known-limitation): %d\n" \
  "${#TESTS[@]}" "$ok_count" "$fail_count" "$skip_count"

if [ "$fail_count" -gt 0 ]; then
  exit 1
fi
exit 0
