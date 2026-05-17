#!/usr/bin/env node

/**
 * R-5 (Issue #393) で追加した、旧 5 段階パレット参照を CI で検出する Tripwire スクリプト。
 *
 * 検知パターン (R-2c で削除済みの旧 token を `src/**` で参照していないか確認):
 *   1. `bg.<digit>` (例: bg.0, bg.1, ..., bg.9)
 *   2. `fg.<digit>` (例: fg.0, fg.1, ..., fg.9)
 *   3. `token('colors.bg.<digit>')` / `token("colors.bg.<digit>")` (Panda token() 関数経由)
 *   4. `token('colors.fg.<digit>')` / `token("colors.fg.<digit>")`
 *   5. `var(--colors-bg-<digit>)` (Panda 生成 CSS 変数の直接参照)
 *   6. `var(--colors-fg-<digit>)`
 *   7. `token('colors.gruvbox.<...>')` (旧 Gruvbox 階層、R-2c で削除済み)
 *
 * 走査対象 (Issue #413 で拡張):
 *   - `<root>/src/**` の `.ts` / `.tsx` / `.css`
 *   - `<root>/panda.config.ts` (theme tokens 正本)
 *   - `<root>/scripts/**` の `.ts` (走査スクリプト自身は自己除外)
 *   - `<root>/e2e/**` の `.ts` / `.spec.ts`
 * 除外:
 *   - `__tests__/**` ディレクトリ (lint-tokens 自身を Tripwire させるテストや
 *     fixture でハードコードされた旧 token を検出してしまうのを避けるため、
 *     ディレクトリ単位で skip する)
 *   - `*.test.ts` / `*.test.tsx` (上記 `__tests__/**` 配下以外で配置されているテスト)
 *   - `scripts/lintTokens.ts` (自己除外: 本ファイルにパターンを文字列リテラルで保持しているため)
 *
 * 結果:
 *   - 0 件: exit 0 (CI 通過)
 *   - 1 件以上: exit 1 (CI ブロック)
 *   - 走査ファイル 0 件: exit 2 (構成不備 / 致命エラー、Issue #413 / DA 致命 2 対応)
 *
 * 設計メモ:
 * - 標準ライブラリ (`node:fs` / `node:path`) のみで実装し、追加依存は導入しない。
 * - サブディレクトリ走査は再帰的に実装する (glob ライブラリ不要)。
 * - パターンは Plain RegExp で書き、Panda の式リテラル展開や CSS 変数の
 *   双方を統一的に検出する。
 * - 行コメント (`//`) と複数行コメント (`/* ... *\/`) 内は走査対象から
 *   除外する (Issue #413)。コメント中の旧 token 言及 (旧→新マッピング表)
 *   による false positive を防ぐ。文字列リテラル中の `//` `/*` は
 *   コメント開始と見做さない。
 *
 * 拡張メモ:
 * - 追加の旧 token を検知したい場合は `LINT_PATTERNS` に正規表現を追加するだけで良い。
 * - false positive が出た場合は `EXCLUDED_FILE_SUFFIXES` 経由で除外する。
 */

import { type Stats, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");

/**
 * 走査対象パス (Issue #413 で複数 path 化)。
 * 既定は `src/`, `panda.config.ts`, `scripts/`, `e2e/` だが、テストから
 * `LINT_TOKENS_SRC_DIR` env で別パス (OS tmp 配下に作った擬似 src 等)
 * を単一指定できる。副作用として src/ 直下に一時ファイルを残置するリスクを
 * 排除する。
 *
 * env で指定された場合はそのパス 1 つに絞り込む (テスト時の独立性確保のため)。
 */
const TARGET_PATHS: readonly string[] = process.env.LINT_TOKENS_SRC_DIR
  ? [resolve(process.env.LINT_TOKENS_SRC_DIR)]
  : [
      join(PROJECT_ROOT, "src"),
      join(PROJECT_ROOT, "panda.config.ts"),
      join(PROJECT_ROOT, "scripts"),
      join(PROJECT_ROOT, "e2e"),
    ];

/** 走査対象拡張子 */
const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

/**
 * 除外する suffix (検知対象から外したい末尾パターン)。
 * - 自テストの中で「文字列としてパターンを書いている」可能性があるため `.test.ts(x)` は除外する。
 *   `__tests__` 配下のテストは walkDirectory のディレクトリ単位 skip でも除外しているが、
 *   `__tests__` 外に配置された `*.test.ts(x)` を救うため suffix 除外も併用する。
 * - `scripts/lintTokens.ts` (本ファイル): パターン定義 (LINT_PATTERNS) や
 *   CI 失敗時のヒントメッセージで旧 token 名を文字列リテラルで参照しており、
 *   走査範囲拡大 (Issue #413) で自己検知してしまうため自身を除外する。
 */
const EXCLUDED_FILE_SUFFIXES = [
  ".test.ts",
  ".test.tsx",
  "scripts/lintTokens.ts",
];

/**
 * lint パターン定義。
 *
 * 各パターンには human-readable な name を付与しておき、検出時に
 * 「どの旧 token に違反したか」を分かりやすく表示できるようにする。
 *
 * scope:
 *   - "line" (既定): 行単位で走査する。コメント除去後の各行に対して RegExp 実行。
 *   - "file": ファイル全体を 1 つのテキストとして走査する。
 *     panda.config.ts のような複数行にまたがるオブジェクトリテラル
 *     (例: `bg: {\n  "0": { value: ... }\n}`) を検出するため。
 *     コメント除去はファイル単位で適用する。
 */
interface LintPattern {
  readonly name: string;
  readonly description: string;
  readonly pattern: RegExp;
  readonly scope?: "line" | "file";
}

const LINT_PATTERNS: readonly LintPattern[] = [
  {
    name: "old-bg-numeric",
    description: "旧 5 段階エイリアス bg.<digit> の参照",
    // \b で単語境界を要求。bg.0..bg.9 を検出。
    // class 名や変数名の中で `bg.0` がそのまま現れる panda の表記。
    pattern: /\bbg\.[0-9]\b/g,
  },
  {
    name: "old-fg-numeric",
    description: "旧 5 段階エイリアス fg.<digit> の参照",
    pattern: /\bfg\.[0-9]\b/g,
  },
  {
    name: "old-token-colors-bg-numeric",
    description: "Panda token() 経由の旧 colors.bg.<digit> 参照",
    // token('colors.bg.0') / token("colors.bg.0")
    pattern: /token\(['"]colors\.bg\.[0-9]['"]\)/g,
  },
  {
    name: "old-token-colors-fg-numeric",
    description: "Panda token() 経由の旧 colors.fg.<digit> 参照",
    pattern: /token\(['"]colors\.fg\.[0-9]['"]\)/g,
  },
  {
    name: "old-css-var-bg-numeric",
    description: "Panda 生成 CSS 変数 --colors-bg-<digit> の直接参照",
    pattern: /var\(--colors-bg-[0-9]\)/g,
  },
  {
    name: "old-css-var-fg-numeric",
    description: "Panda 生成 CSS 変数 --colors-fg-<digit> の直接参照",
    pattern: /var\(--colors-fg-[0-9]\)/g,
  },
  {
    name: "old-gruvbox-token",
    description: "旧 colors.gruvbox.* token の参照 (R-2c で削除済み)",
    // token('colors.gruvbox.bg-0') 形式。kebab-case や数字を含む値も拾う。
    pattern: /token\(['"]colors\.gruvbox\.[a-z0-9-]+['"]\)/g,
  },
  // ====================================================================
  // オブジェクトキー記法検知 (Issue #413 / DA 致命 1 対応)
  //
  // panda.config.ts のような theme 定義ファイルでは、旧 5 段階トークンが
  // `bg: { "0": { value: "..." } }` の形で再導入される可能性がある。
  // これは `bg.0` のドット記法とは別形式で、行単位 RegExp では捕まえにくい。
  //
  // 複数行にまたがるオブジェクトリテラルを検出するため scope: "file" を指定し、
  // ファイル全体に対して `[^}]*?` (非欲張り) で展開する。`/s` フラグで
  // 改行も `.` に含めるが、本パターンは `[^}]` を使っているため `s` フラグは
  // 厳密には不要。ただし将来 `.` を含むパターンが追加されたとき安全側に倒すため付与する。
  // ====================================================================
  {
    name: "old-bg-numeric-key",
    description:
      "オブジェクトキー記法 `bg: { '0': ... }` で旧 5 段階 token を再導入している可能性",
    // `bg: {` から閉じ `}` まで遡って数値キーを検出。`}` を含まない範囲で短く match。
    pattern: /\bbg\s*:\s*\{[^}]*?['"]?[0-9]['"]?\s*:/gs,
    scope: "file",
  },
  {
    name: "old-fg-numeric-key",
    description:
      "オブジェクトキー記法 `fg: { '0': ... }` で旧 5 段階 token を再導入している可能性",
    pattern: /\bfg\s*:\s*\{[^}]*?['"]?[0-9]['"]?\s*:/gs,
    scope: "file",
  },
  {
    name: "old-gruvbox-key",
    description:
      "オブジェクトキー記法 `gruvbox: {` で旧 Gruvbox パレットを再導入している可能性",
    pattern: /\bgruvbox\s*:\s*\{/g,
    scope: "file",
  },
] as const;

interface Violation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly patternName: string;
  readonly description: string;
  readonly snippet: string;
}

/**
 * `statSync` を try/catch でラップし、対象が存在しない場合は undefined を返す。
 * `collectTargetFiles` の cognitive complexity を抑えるための補助関数。
 *
 * CLAUDE.md「null vs undefined」方針に従い、戻り値型は `Stats | undefined` を
 * 採用する (DA レビュー Should Consider #1 / Issue #521 PR #619)。
 */
const tryStat = (target: string): Stats | undefined => {
  try {
    return statSync(target);
  } catch {
    return undefined;
  }
};

/**
 * 走査対象ファイルとして受理可能か判定する。
 * - 拡張子が `TARGET_EXTENSIONS` に含まれること
 * - `EXCLUDED_FILE_SUFFIXES` のいずれにも該当しないこと
 */
const isAcceptableFile = (filePath: string): boolean => {
  if (!TARGET_EXTENSIONS.has(extname(filePath))) {
    return false;
  }
  return !EXCLUDED_FILE_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
};

/**
 * ディレクトリ走査時に entry 名でスキップ判定する。
 * 隠しディレクトリ / `node_modules` / `__tests__` を弾く。
 *
 * `__tests__` は本ファイル冒頭 JSDoc で「除外対象」と明記済みだが、
 * 実装側で skip しないとテスト fixture (例: `__tests__/util.ts` 等の
 * 非 `.test.ts` ファイル) が `EXCLUDED_FILE_SUFFIXES` (suffix だけで
 * 判定) を素通りしてしまい、テストコード中の旧 token 言及で CI が
 * 落ちる潜在バグになる (Issue #413 / DA 重大 2 対応)。
 */
const shouldSkipEntry = (entry: string): boolean => {
  return (
    entry.startsWith(".") || entry === "node_modules" || entry === "__tests__"
  );
};

/**
 * ディレクトリを再帰走査し、受理可能ファイルを `results` に追記する。
 * `collectTargetFiles` から呼び出される内部ヘルパー。
 */
const walkDirectory = (current: string, results: string[]): void => {
  const entries = readdirSync(current);
  for (const entry of entries) {
    if (shouldSkipEntry(entry)) {
      continue;
    }
    const fullPath = join(current, entry);
    const entryStats = statSync(fullPath);
    if (entryStats.isDirectory()) {
      walkDirectory(fullPath, results);
      continue;
    }
    if (entryStats.isFile() && isAcceptableFile(fullPath)) {
      results.push(fullPath);
    }
  }
};

/**
 * 指定パスを走査し、対象ファイルのパスリストを返す (Issue #413)。
 *
 * - 単一ファイル指定 (panda.config.ts 等) なら拡張子と除外 suffix を確認した
 *   上でそのファイルを返す。
 * - ディレクトリ指定なら再帰的に走査する。
 * - `node_modules` / 隠しディレクトリ (`.` から始まる) はスキップする
 *   (scripts/ から実行する都合、`src/` 配下に限ればこれらは出てこないが
 *   将来 PROJECT_ROOT 走査に変えたとき耐えるためガードを入れておく)。
 * - 走査対象が存在しない場合は空配列を返す (例: e2e/ 未配置構成でも壊れない)。
 */
const collectTargetFiles = (target: string): string[] => {
  const results: string[] = [];
  const stats = tryStat(target);
  if (!stats) {
    return results;
  }

  // 単一ファイル指定 (panda.config.ts 等) のショートカット。
  if (stats.isFile()) {
    if (isAcceptableFile(target)) {
      results.push(target);
    }
    return results;
  }

  if (!stats.isDirectory()) {
    return results;
  }

  walkDirectory(target, results);
  return results;
};

/**
 * 1 行から行コメント (`//`) と複数行コメント (`/* ... *\/`) を除去する
 * 簡易ストリッパー (Issue #413)。
 *
 * - state machine で「コメントブロック内かどうか」を保持する必要があるため
 *   呼び出し側でブロック状態を渡してもらい、新しい状態と検査用文字列を返す。
 * - 文字列リテラル (`"..."` / `'...'` / `` `...` ``) 内の `//` や `/*` は
 *   コメント開始と見做さず、そのまま検査対象に残す (旧 token を文字列リテラル
 *   として記述したケースも検知したいため)。
 * - column 位置を維持するため、コメント領域は同じ長さの空白で置換する。
 *
 * 戻り値:
 *   - sanitized: 検査対象として残す部分 (コメント領域は空白に置換済み)。
 *   - inBlockComment: 行末で複数行コメントが継続中かどうか。
 */
interface CommentStripState {
  readonly inBlockComment: boolean;
}

interface CommentStripResult {
  readonly sanitized: string;
  readonly inBlockComment: boolean;
}

/**
 * `stripComments` の状態機械内部状態。
 * 状態ごとのハンドラ間で受け渡される、行内の文字種コンテキスト。
 */
interface ScanState {
  inBlockComment: boolean;
  inSingle: boolean;
  inDouble: boolean;
  inBacktick: boolean;
}

/**
 * 1 文字処理後の進行情報。
 * `advance` は追加で消費すべきインデックス数 (0 もしくは 1)。
 * `terminated` が true の場合、その時点で行の処理を打ち切る (行コメント検出時)。
 */
interface StepResult {
  readonly advance: number;
  readonly terminated: boolean;
}

const NO_ADVANCE: StepResult = { advance: 0, terminated: false };

/**
 * ブロックコメント中の 1 文字を処理する。
 * `* /` を検出したら終端、それ以外は空白に置換して維持する。
 */
const handleBlockComment = (
  ch: string,
  next: string,
  out: string[],
  state: ScanState,
): StepResult => {
  if (ch === "*" && next === "/") {
    state.inBlockComment = false;
    out.push(" ", " ");
    return { advance: 1, terminated: false };
  }
  out.push(" ");
  return NO_ADVANCE;
};

/**
 * 文字列リテラル内 (シングル / ダブル / バッククォート) の 1 文字を処理する。
 * - エスケープシーケンス (`\\x`) は次の文字も維持する。
 * - 終端クォートを検出したら該当フラグを下ろす。
 *
 * `quote` 引数で文字列リテラルの種類を切り替える。
 * `closer` は ScanState のどのフラグを下ろすかを示す関数。
 */
const handleStringLiteral = (
  ch: string,
  next: string,
  out: string[],
  state: ScanState,
  quote: string,
  closer: (s: ScanState) => void,
): StepResult => {
  out.push(ch);
  if (ch === "\\" && next !== "") {
    out.push(next);
    return { advance: 1, terminated: false };
  }
  if (ch === quote) {
    closer(state);
  }
  return NO_ADVANCE;
};

/**
 * 通常コード領域での 1 文字を処理する。
 * - 文字列開始クォートを検出したら該当フラグを立てる。
 * - 行コメント `//` を検出した場合は行末まで空白で埋めて打ち切り。
 * - ブロックコメント開始 `/ *` を検出したら inBlockComment を立てる。
 * - それ以外は文字をそのまま追記する。
 */
const handleDefault = (
  ch: string,
  next: string,
  out: string[],
  state: ScanState,
  remainingLength: number,
): StepResult => {
  if (ch === "'") {
    state.inSingle = true;
    out.push(ch);
    return NO_ADVANCE;
  }
  if (ch === '"') {
    state.inDouble = true;
    out.push(ch);
    return NO_ADVANCE;
  }
  if (ch === "`") {
    state.inBacktick = true;
    out.push(ch);
    return NO_ADVANCE;
  }
  if (ch === "/" && next === "/") {
    for (let j = 0; j < remainingLength; j += 1) {
      out.push(" ");
    }
    return { advance: 0, terminated: true };
  }
  if (ch === "/" && next === "*") {
    state.inBlockComment = true;
    out.push(" ", " ");
    return { advance: 1, terminated: false };
  }
  out.push(ch);
  return NO_ADVANCE;
};

/**
 * 現在の `ScanState` に応じて適切なハンドラを呼び分ける。
 * `stripComments` の主ループを薄く保つためのディスパッチ層。
 */
const processChar = (
  ch: string,
  next: string,
  remainingLength: number,
  out: string[],
  state: ScanState,
): StepResult => {
  if (state.inBlockComment) {
    return handleBlockComment(ch, next, out, state);
  }
  if (state.inSingle) {
    return handleStringLiteral(ch, next, out, state, "'", (s) => {
      s.inSingle = false;
    });
  }
  if (state.inDouble) {
    return handleStringLiteral(ch, next, out, state, '"', (s) => {
      s.inDouble = false;
    });
  }
  if (state.inBacktick) {
    return handleStringLiteral(ch, next, out, state, "`", (s) => {
      s.inBacktick = false;
    });
  }
  return handleDefault(ch, next, out, state, remainingLength);
};

const stripComments = (
  line: string,
  state: CommentStripState,
): CommentStripResult => {
  const scanState: ScanState = {
    inBlockComment: state.inBlockComment,
    inSingle: false,
    inDouble: false,
    inBacktick: false,
  };
  const out: string[] = [];

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i] ?? "";
    const next = i + 1 < line.length ? (line[i + 1] ?? "") : "";
    const step = processChar(ch, next, line.length - i, out, scanState);
    if (step.terminated) {
      return { sanitized: out.join(""), inBlockComment: false };
    }
    i += step.advance;
  }

  return { sanitized: out.join(""), inBlockComment: scanState.inBlockComment };
};

/**
 * ファイル全体に対してコメント除去を適用した結果と、
 * 各行の元テキスト / 行頭オフセットを返すユーティリティ。
 *
 * `scope: "file"` パターンの match.index (ファイル全体オフセット) から
 * 行番号 / カラム位置 / 元行 snippet を逆引きするのに使う。
 */
interface SanitizedFile {
  /** コメント領域を空白に置換したファイル全体テキスト */
  readonly sanitized: string;
  /** 各行の元テキスト (snippet 表示用) */
  readonly originalLines: string[];
  /** 各行の先頭 offset (sanitized 上の絶対位置) */
  readonly lineStartOffsets: number[];
}

const sanitizeFile = (content: string): SanitizedFile => {
  const lines = content.split(/\r?\n/);
  const sanitizedLines: string[] = [];
  const lineStartOffsets: number[] = [];
  let cursor = 0;
  let stripState: CommentStripState = { inBlockComment: false };

  for (const line of lines) {
    lineStartOffsets.push(cursor);
    const { sanitized, inBlockComment } = stripComments(line, stripState);
    stripState = { inBlockComment };
    sanitizedLines.push(sanitized);
    // sanitizedLines は join("\n") で連結する想定。改行 1 文字ぶん cursor を進める。
    cursor += sanitized.length + 1;
  }

  return {
    sanitized: sanitizedLines.join("\n"),
    originalLines: lines,
    lineStartOffsets,
  };
};

/**
 * sanitized 全体オフセットから「何行目の何カラム目か」を逆引きする。
 * lineStartOffsets は昇順なので二分探索で O(log n)。
 */
const offsetToLineColumn = (
  offset: number,
  lineStartOffsets: readonly number[],
): { readonly line: number; readonly column: number } => {
  let lo = 0;
  let hi = lineStartOffsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    const start = lineStartOffsets[mid];
    if (start === undefined) {
      // 配列範囲外を二分探索で踏むことは無いはずだが、型ガードとして扱う。
      hi = mid - 1;
      continue;
    }
    if (start <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  const lineIndex = lo;
  const start = lineStartOffsets[lineIndex] ?? 0;
  return { line: lineIndex + 1, column: offset - start + 1 };
};

/**
 * regex.exec を反復し、ヒットごとに `onMatch` を呼ぶ汎用イテレータ。
 * 0 幅マッチによる無限ループを避けるため、lastIndex を強制前進させる。
 */
const iterateMatches = (
  pattern: RegExp,
  haystack: string,
  onMatch: (match: RegExpExecArray) => void,
): void => {
  const regex = new RegExp(pattern.source, pattern.flags);
  let match: RegExpExecArray | null = regex.exec(haystack);
  while (match !== null) {
    onMatch(match);
    if (match.index === regex.lastIndex) {
      regex.lastIndex += 1;
    }
    match = regex.exec(haystack);
  }
};

/**
 * ファイル全体スコープでパターン照合する (複数行にまたがるパターン用)。
 * panda.config.ts の `bg: { "0": ... }` のような複数行構造を検出するために使う。
 */
const scanFileScope = (
  filePath: string,
  pattern: LintPattern,
  fileScope: SanitizedFile,
  violations: Violation[],
): void => {
  const { sanitized, originalLines, lineStartOffsets } = fileScope;
  iterateMatches(pattern.pattern, sanitized, (match) => {
    const { line, column } = offsetToLineColumn(match.index, lineStartOffsets);
    const snippetLine = originalLines[line - 1] ?? "";
    violations.push({
      file: filePath,
      line,
      column,
      patternName: pattern.name,
      description: pattern.description,
      snippet: snippetLine.trim(),
    });
  });
};

/**
 * sanitized テキスト上で `lineIndex` 行目に対応する範囲を切り出す。
 * `scanLineScope` の内部ヘルパー。
 */
const extractSanitizedLine = (
  sanitized: string,
  lineStartOffsets: readonly number[],
  lineIndex: number,
): string => {
  const start = lineStartOffsets[lineIndex] ?? 0;
  const nextStart = lineStartOffsets[lineIndex + 1] ?? sanitized.length + 1;
  // nextStart は次行の先頭 (改行直後)。改行 1 文字ぶん除いた範囲を取る。
  return sanitized.slice(start, Math.max(start, nextStart - 1));
};

/**
 * 行スコープでパターン照合する (既定動作)。
 * 行ごとに sanitized 行を取り出して RegExp を実行し、行 / カラムを直接記録する。
 */
const scanLineScope = (
  filePath: string,
  pattern: LintPattern,
  fileScope: SanitizedFile,
  violations: Violation[],
): void => {
  const { sanitized, originalLines, lineStartOffsets } = fileScope;
  for (let lineIndex = 0; lineIndex < originalLines.length; lineIndex += 1) {
    const line = originalLines[lineIndex];
    if (line === undefined) {
      continue;
    }
    const sanitizedLine = extractSanitizedLine(
      sanitized,
      lineStartOffsets,
      lineIndex,
    );
    iterateMatches(pattern.pattern, sanitizedLine, (match) => {
      violations.push({
        file: filePath,
        line: lineIndex + 1,
        column: match.index + 1,
        patternName: pattern.name,
        description: pattern.description,
        // 元のコメント込みの行を見せたほうが文脈が分かるので元行を表示する。
        snippet: line.trim(),
      });
    });
  }
};

/**
 * 1 ファイル分の検査。
 *
 * - 行単位 (`scope: "line"` 既定) で検出位置 (line / column) を出すと
 *   CI ログでジャンプしやすい。
 * - 複数行 (`scope: "file"`) パターンはファイル全体のテキストに RegExp を実行し、
 *   match.index から逆引きで行 / カラムを出す。
 * - 大文字小文字は区別する (token 名は確定的にケースが決まっている)。
 * - 行コメント / ブロックコメント内は検査対象から除外する (Issue #413)。
 */
const scanFile = (
  filePath: string,
  patterns: readonly LintPattern[],
): Violation[] => {
  const content = readFileSync(filePath, "utf8");
  const violations: Violation[] = [];
  const fileScope = sanitizeFile(content);

  for (const pattern of patterns) {
    if (pattern.scope === "file") {
      scanFileScope(filePath, pattern, fileScope, violations);
    } else {
      scanLineScope(filePath, pattern, fileScope, violations);
    }
  }

  return violations;
};

const formatViolation = (v: Violation): string => {
  const relPath = relative(PROJECT_ROOT, v.file);
  return `${relPath}:${v.line}:${v.column}  [${v.patternName}] ${v.description}\n    ${v.snippet}`;
};

const main = (): void => {
  const files: string[] = [];
  for (const target of TARGET_PATHS) {
    files.push(...collectTargetFiles(target));
  }

  // 0 files scanned ガード (Issue #413 / DA 致命 2 対応)。
  // `LINT_TOKENS_SRC_DIR=/nonexistent` のような誤設定や `TARGET_PATHS` の
  // 全パスが空 / 非存在になっている状態では、走査が成立せず Tripwire
  // 自体が機能しない。`exit 0` だと CI が誤って通ってしまうため、
  // 走査ファイル 0 件は構成不備として `exit 2` で fail-fast する
  // (旧 token 検出による `exit 1` と区別する)。
  if (files.length === 0) {
    console.error(
      "lint:tokens FATAL: no files scanned. TARGET_PATHS or LINT_TOKENS_SRC_DIR may be misconfigured.",
    );
    process.exit(2);
  }

  const violations: Violation[] = [];

  for (const file of files) {
    violations.push(...scanFile(file, LINT_PATTERNS));
  }

  if (violations.length === 0) {
    console.log(
      `lint:tokens OK - ${files.length} files scanned, no legacy token reference found.`,
    );
    process.exit(0);
  }

  console.error(
    `lint:tokens NG - ${violations.length} legacy token reference(s) found in ${files.length} files scanned:`,
  );
  for (const v of violations) {
    console.error(formatViolation(v));
  }
  console.error("");
  console.error(
    "Editorial Citrus 移行 (R-2c / Issue #390) で削除した旧 5 段階パレット",
  );
  console.error(
    "(bg.0..bg.4 / fg.0..fg.4 / colors.gruvbox.*) は既に panda.config.ts から",
  );
  console.error(
    "削除済みです。新 semantic token (bg.canvas / surface / elevated /",
  );
  console.error(
    "fg.primary / secondary / muted / accent.brand / link / focus.ring) に",
  );
  console.error(
    "置き換えてください。詳細は docs/rfc/editorial-citrus/02-color-system.md。",
  );
  process.exit(1);
};

main();
