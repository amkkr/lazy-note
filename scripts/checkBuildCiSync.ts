#!/usr/bin/env node

/**
 * Issue #685: `package.json` の `build` script と `build:ci` script の
 * drift を CI で機械的に検知するためのガードスクリプト。
 *
 * 背景:
 *   - `build:ci` (= `panda && tsc && vite build`) は hash:true regression
 *     workflow 等で `build` の代用として呼ばれるサブセット。
 *   - 過去 (Issue #528) は CLAUDE.md 散文で「`build` 変更時は `build:ci`
 *     も同期させること」と運用ルール化していたが、散文ルールは時間経過で
 *     形骸化する。
 *   - 本スクリプトは `build` 文字列に `build:ci` の各 command (`panda` /
 *     `tsc` / `vite build`) が **順序を保って** 含まれているかを部分一致で
 *     判定し、ずれていれば exit 1 で fail-fast する。
 *
 * 設計方針:
 *   - 本リポの `build` / `build:ci` 構造に絞った最小実装。汎用的な script
 *     依存解析は行わない。
 *   - 外部依存追加禁止 (`node:fs` / `node:path` のみ)。
 *   - 純粋関数 `checkSync(buildScript, buildCiScript)` をテスト用に export
 *     する。CLI エントリ (`main`) は副作用 (file IO / process.exit) に集約。
 *
 * 使い方:
 *   - `pnpm exec tsx scripts/checkBuildCiSync.ts`
 *   - 成功時: exit 0
 *   - drift 検知時 / 構成不備時: exit 1 (stderr にヒントを出力)
 */

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const PACKAGE_JSON_PATH = resolve(PROJECT_ROOT, "package.json");

/**
 * `checkSync` の戻り値。
 * - `ok`: true なら drift なし、false なら drift あり。
 * - `reason`: ok=false のときのみ設定する違反理由 (human readable)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
interface CheckResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/**
 * script 文字列を `&&` 区切りで分割し、各 command を trim した配列にする。
 *
 * `build:ci` は `panda && tsc && vite build` のような単純な直列 chain を
 * 前提とする。`|` / `;` / `&` 等の他の shell 演算子は本スクリプトの対象外
 * (将来 `build:ci` がそうした構造に変わった場合は本ガードも見直す)。
 *
 * 空 / 空白のみの token は除外する (例: `panda && && tsc` のような
 * 異常入力に対する防御)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const splitCommands = (script: string): string[] => {
  return script
    .split("&&")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

/**
 * `build` script 文字列の中に `build:ci` の各 command が「順序を保って」
 * 部分一致で出現するかを判定する。
 *
 * アルゴリズム:
 *   - `build` を `splitCommands` で token 配列化する。
 *   - `build:ci` の各 command を順に走査し、`build` token 列の中から
 *     部分一致 (`String#includes`) する次の token を線形検索する。
 *   - 全 `build:ci` command を順序を崩さず消費できれば ok。
 *   - 途中で見つからなくなった時点で reason 付き ng を返す。
 *
 * 部分一致 (`includes`) を採用する理由:
 *   - `build` 側に `pnpm run lint && ... && panda && tsc && vite build`
 *     のように prefix (`pnpm run`) や追加 flag が付くケースを許容するため。
 *   - 完全一致では `pnpm run build:ci` のような wrapper にも対応できない。
 *
 * 空配列ケース:
 *   - `buildCiScript` が空 (token 0 件): 検査する command が無いので ok。
 *     ただし呼び出し側 (`main`) では「`build:ci` 自体が未定義 / 空」を
 *     構成不備として別途扱う (本関数は文字列入力に対する純粋関数のため、
 *     未定義との区別は呼び出し側に委ねる)。
 *   - `buildScript` が空かつ `buildCiScript` が非空: ng (drift)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const checkSync = (
  buildScript: string,
  buildCiScript: string,
): CheckResult => {
  const ciCommands = splitCommands(buildCiScript);
  if (ciCommands.length === 0) {
    return { ok: true };
  }

  const buildTokens = splitCommands(buildScript);
  let cursor = 0;
  for (const ciCommand of ciCommands) {
    let matchedIndex = -1;
    for (let i = cursor; i < buildTokens.length; i += 1) {
      const token = buildTokens[i] ?? "";
      if (token.includes(ciCommand)) {
        matchedIndex = i;
        break;
      }
    }
    if (matchedIndex === -1) {
      const position =
        cursor === 0 ? "" : " (前 command 以降の位置で)";
      return {
        ok: false,
        reason: `build:ci の command "${ciCommand}" が build script 内${position}に見つかりません。`,
      };
    }
    cursor = matchedIndex + 1;
  }

  return { ok: true };
};

/**
 * `package.json` を読み、`scripts.build` / `scripts.build:ci` を取り出す。
 *
 * 構成不備 (フィールド欠落 / 型違反) は throw する。`main` 側で
 * catch し exit 1 にする。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
interface PackageScripts {
  readonly build: string;
  readonly buildCi: string;
}

/** @internal テスト専用 export. 本番コードから import しないこと */
const loadPackageScripts = (packageJsonPath: string): PackageScripts => {
  const raw = readFileSync(packageJsonPath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("package.json のトップレベルがオブジェクトではありません");
  }
  const scriptsField = (parsed as Record<string, unknown>).scripts;
  if (typeof scriptsField !== "object" || scriptsField === null) {
    throw new Error("package.json に scripts フィールドがありません");
  }
  const scripts = scriptsField as Record<string, unknown>;
  const build = scripts.build;
  const buildCi = scripts["build:ci"];
  if (typeof build !== "string") {
    throw new Error("package.json の scripts.build が文字列ではありません");
  }
  if (typeof buildCi !== "string") {
    throw new Error(
      'package.json の scripts["build:ci"] が文字列ではありません',
    );
  }
  return { build, buildCi };
};

const HINT_MESSAGE = [
  "",
  "Issue #685: build / build:ci の drift を検知しました。",
  "対処方針はいずれか:",
  "  1. build:ci を build に合わせて更新する (panda / tsc / vite build の順を維持)",
  "  2. build から該当 command を削除した意図的変更であれば、本検査スクリプト",
  "     (scripts/checkBuildCiSync.ts) と CLAUDE.md「Panda hash:true の運用判断」",
  "     セクションの記述を併せて更新する",
].join("\n");

const main = (): void => {
  let scripts: PackageScripts;
  try {
    scripts = loadPackageScripts(PACKAGE_JSON_PATH);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`checkBuildCiSync FATAL: ${message}`);
    process.exit(1);
  }

  const result = checkSync(scripts.build, scripts.buildCi);
  if (result.ok) {
    console.log(
      "checkBuildCiSync OK - build script に build:ci の全 command が順序を保って含まれています。",
    );
    return;
  }

  console.error(`checkBuildCiSync NG - ${result.reason ?? "理由不明"}`);
  console.error(`  build    = ${scripts.build}`);
  console.error(`  build:ci = ${scripts.buildCi}`);
  console.error(HINT_MESSAGE);
  process.exit(1);
};

/**
 * CLI として直接起動された場合のみ `main()` を実行する。
 * テストから import した際に副作用 (file IO / process.exit) が走らないよう
 * にするためのエントリポイントガード (scripts/lintTokens.ts / calculateContrast.ts と同パターン)。
 */
const isDirectInvocation = (): boolean => {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return basename(entry) === "checkBuildCiSync.ts";
};

if (isDirectInvocation()) {
  main();
}

export type { CheckResult, PackageScripts };
export { checkSync, loadPackageScripts, splitCommands };
