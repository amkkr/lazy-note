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
 * 除外: `**`/`__tests__/**`/`*.test.ts` (lint-tokens 自身を Tripwire させるテストは別途存在しうるため、テストでは検出しない) / `scripts/lintTokens.ts` (自己除外)
 *
 * 結果:
 *   - 0 件: exit 0 (CI 通過)
 *   - 1 件以上: exit 1 (CI ブロック)
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

import { readdirSync, readFileSync, statSync } from "node:fs";
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
 *   ただし `__tests__` 配下の通常テストは内部実装ではなく動作検証なので、
 *   旧 token をハードコードする可能性は低い。実害が出たら個別に除外を増やす。
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
 */
interface LintPattern {
  readonly name: string;
  readonly description: string;
  readonly pattern: RegExp;
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

  let stats;
  try {
    stats = statSync(target);
  } catch {
    return results;
  }

  // 単一ファイル指定 (panda.config.ts 等) のショートカット。
  if (stats.isFile()) {
    const ext = extname(target);
    if (!TARGET_EXTENSIONS.has(ext)) {
      return results;
    }
    const isExcluded = EXCLUDED_FILE_SUFFIXES.some((suffix) =>
      target.endsWith(suffix),
    );
    if (isExcluded) {
      return results;
    }
    results.push(target);
    return results;
  }

  if (!stats.isDirectory()) {
    return results;
  }

  const walk = (current: string): void => {
    const entries = readdirSync(current);

    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "node_modules") {
        continue;
      }

      const fullPath = join(current, entry);
      const entryStats = statSync(fullPath);

      if (entryStats.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entryStats.isFile()) {
        continue;
      }

      const ext = extname(fullPath);
      if (!TARGET_EXTENSIONS.has(ext)) {
        continue;
      }

      const isExcluded = EXCLUDED_FILE_SUFFIXES.some((suffix) =>
        fullPath.endsWith(suffix),
      );
      if (isExcluded) {
        continue;
      }

      results.push(fullPath);
    }
  };

  walk(target);
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

const stripComments = (
  line: string,
  state: CommentStripState,
): CommentStripResult => {
  let inBlockComment = state.inBlockComment;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  const out: string[] = [];

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = i + 1 < line.length ? line[i + 1] : "";

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        out.push(" ", " ");
        i += 1;
        continue;
      }
      out.push(" ");
      continue;
    }

    if (inSingle) {
      out.push(ch);
      if (ch === "\\" && next !== "") {
        out.push(next);
        i += 1;
        continue;
      }
      if (ch === "'") {
        inSingle = false;
      }
      continue;
    }

    if (inDouble) {
      out.push(ch);
      if (ch === "\\" && next !== "") {
        out.push(next);
        i += 1;
        continue;
      }
      if (ch === '"') {
        inDouble = false;
      }
      continue;
    }

    if (inBacktick) {
      out.push(ch);
      if (ch === "\\" && next !== "") {
        out.push(next);
        i += 1;
        continue;
      }
      if (ch === "`") {
        inBacktick = false;
      }
      continue;
    }

    // 文字列開始
    if (ch === "'") {
      inSingle = true;
      out.push(ch);
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      out.push(ch);
      continue;
    }
    if (ch === "`") {
      inBacktick = true;
      out.push(ch);
      continue;
    }

    // コメント開始
    if (ch === "/" && next === "/") {
      // 行末まで全て空白扱い
      for (let j = i; j < line.length; j += 1) {
        out.push(" ");
      }
      return { sanitized: out.join(""), inBlockComment: false };
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      out.push(" ", " ");
      i += 1;
      continue;
    }

    out.push(ch);
  }

  return { sanitized: out.join(""), inBlockComment };
};

/**
 * 1 ファイル分の検査。
 *
 * - 行単位で検出位置 (line / column) を出すと CI ログでジャンプしやすい。
 * - 大文字小文字は区別する (token 名は確定的にケースが決まっている)。
 * - 行コメント / ブロックコメント内は検査対象から除外する (Issue #413)。
 */
const scanFile = (
  filePath: string,
  patterns: readonly LintPattern[],
): Violation[] => {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const violations: Violation[] = [];

  let stripState: CommentStripState = { inBlockComment: false };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (line === undefined) {
      continue;
    }

    const { sanitized, inBlockComment } = stripComments(line, stripState);
    stripState = { inBlockComment };

    for (const { name, description, pattern } of patterns) {
      // RegExp の lastIndex を使い回すため毎回新規インスタンスにする。
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null = regex.exec(sanitized);
      while (match !== null) {
        violations.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          patternName: name,
          description,
          // 元のコメント込みの行を見せたほうが文脈が分かるので元行を表示する。
          snippet: line.trim(),
        });
        // 無限ループ回避: 0 幅マッチには進める。
        if (match.index === regex.lastIndex) {
          regex.lastIndex += 1;
        }
        match = regex.exec(sanitized);
      }
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
