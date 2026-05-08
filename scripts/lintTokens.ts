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
 * 走査対象: `src/**` 配下の `.ts` / `.tsx` / `.css`
 * 除外: `**`/`__tests__/**`/`*.test.ts` (lint-tokens 自身を Tripwire させるテストは別途存在しうるため、テストでは検出しない)
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
 *
 * 拡張メモ:
 * - 追加の旧 token を検知したい場合は `LINT_PATTERNS` に正規表現を追加するだけで良い。
 * - false positive が出た場合は `EXCLUDED_FILE_SUFFIXES` 経由で除外する。
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");

/**
 * 走査対象ディレクトリ。
 * 既定は `<PROJECT_ROOT>/src` だが、テストから `LINT_TOKENS_SRC_DIR` env で
 * 別ディレクトリ (OS tmp 配下に作った擬似 src 等) を指定できる。
 * 副作用として src/ 直下に一時ファイルを残置するリスクを排除する。
 */
const SRC_DIR = process.env.LINT_TOKENS_SRC_DIR
  ? resolve(process.env.LINT_TOKENS_SRC_DIR)
  : join(PROJECT_ROOT, "src");

/** 走査対象拡張子 */
const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

/**
 * 除外する suffix (検知対象から外したい末尾パターン)。
 * - 自テストの中で「文字列としてパターンを書いている」可能性があるため `.test.ts(x)` は除外する。
 *   ただし `__tests__` 配下の通常テストは内部実装ではなく動作検証なので、
 *   旧 token をハードコードする可能性は低い。実害が出たら個別に除外を増やす。
 */
const EXCLUDED_FILE_SUFFIXES = [".test.ts", ".test.tsx"];

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
 * 指定ディレクトリを再帰走査し、対象ファイルのパスリストを返す。
 *
 * - `node_modules` / 隠しディレクトリ (`.` から始まる) はスキップする
 *   (scripts/ から実行する都合、`src/` 配下に限ればこれらは出てこないが
 *   将来 PROJECT_ROOT 走査に変えたとき耐えるためガードを入れておく)。
 */
const collectTargetFiles = (dir: string): string[] => {
  const results: string[] = [];

  const walk = (current: string): void => {
    const entries = readdirSync(current);

    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "node_modules") {
        continue;
      }

      const fullPath = join(current, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!stats.isFile()) {
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

  walk(dir);
  return results;
};

/**
 * 1 ファイル分の検査。
 *
 * - 行単位で検出位置 (line / column) を出すと CI ログでジャンプしやすい。
 * - 大文字小文字は区別する (token 名は確定的にケースが決まっている)。
 */
const scanFile = (
  filePath: string,
  patterns: readonly LintPattern[],
): Violation[] => {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const violations: Violation[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (line === undefined) {
      continue;
    }

    for (const { name, description, pattern } of patterns) {
      // RegExp の lastIndex を使い回すため毎回新規インスタンスにする。
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null = regex.exec(line);
      while (match !== null) {
        violations.push({
          file: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          patternName: name,
          description,
          snippet: line.trim(),
        });
        // 無限ループ回避: 0 幅マッチには進める。
        if (match.index === regex.lastIndex) {
          regex.lastIndex += 1;
        }
        match = regex.exec(line);
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
  const files = collectTargetFiles(SRC_DIR);
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
