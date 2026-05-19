#!/usr/bin/env node

/**
 * Issue #685 / #701: `package.json` の `build` script と `build:ci` script の
 * drift を CI で機械的に検知するためのガードスクリプト。
 *
 * 背景:
 *   - `build:ci` (= `panda && tsc && vite build` の派生) は hash:true regression
 *     workflow 等で `build` の代用として呼ばれるサブセット。
 *   - 過去 (Issue #528) は CLAUDE.md 散文で「`build` 変更時は `build:ci`
 *     も同期させること」と運用ルール化していたが、散文ルールは時間経過で
 *     形骸化する。
 *   - 本スクリプトは `build` script の各 command に `build:ci` の各 command が
 *     **順序を保って** 含まれているかを word boundary 単位で判定し、ずれて
 *     いれば exit 1 で fail-fast する。
 *
 * 設計方針:
 *   - 本リポの `build` / `build:ci` 構造に絞った最小実装。汎用的な script
 *     依存解析は行わない。
 *   - 外部依存追加禁止 (`node:fs` / `node:path` のみ)。
 *   - 純粋関数 `checkSync(buildScript, buildCiScript)` をテスト用に export
 *     する。CLI エントリ (`main`) は副作用 (file IO / process.exit) に集約。
 *
 * Issue #701 follow-up (PR #702 DA レビュー):
 *   - Major #1: 短い token の誤検出リスク。`String#includes` の部分一致では
 *     `tsc` が `my-tsc-wrapper` 等のサブストリングに偶発混入する。
 *     → command を空白区切りで word 配列化し、`build:ci` 側 command の word
 *       列が `build` 側 command の word 列の **suffix (末尾揃え)** として
 *       完全一致するかを判定する方式 (案 A) に変更。
 *       wrapper prefix (`pnpm exec tsc` 等) は許容しつつ、`my-tsc-wrapper`
 *       のような単語境界を跨ぐ偶発混入を排除する。
 *   - Major #2: `build:ci` が空文字の場合に沈黙する。
 *     → `main` で `buildCiScript === ""` を構成不備として扱い exit 1 + メッセージ。
 *       (`checkSync` 自体は文字列入力の純粋関数として「検査対象なし → ok」を
 *        維持し、構成不備の判定は呼び出し側に集約する。)
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
 * command 文字列を空白区切りの word 配列に分解する。
 *
 * 例: `"tsc --project tsconfig.api.json"` → `["tsc", "--project", "tsconfig.api.json"]`
 * 例: `"pnpm exec tsc"` → `["pnpm", "exec", "tsc"]`
 *
 * 連続する空白 (タブ・複数スペース) は単一 separator として扱う。
 * 空 word は除外する。
 *
 * Issue #701: 本関数は `checkSync` の word boundary 判定で使用する。
 * `String#includes` による部分一致では `tsc` が `my-tsc-wrapper` の
 * サブストリングに偶発混入するため、word 単位での比較に切り替える。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const tokenizeWords = (command: string): string[] => {
  return command
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
};

/**
 * `ciWords` が `buildWords` の **suffix (末尾揃え)** として完全一致するかを判定する。
 *
 * 例 (match):
 *   - `["tsc"]` vs `["tsc"]` → match
 *   - `["tsc"]` vs `["pnpm", "exec", "tsc"]` → match (wrapper prefix 許容)
 *   - `["vite", "build"]` vs `["pnpm", "exec", "vite", "build"]` → match
 *   - `["tsc", "--project", "tsconfig.api.json"]` vs
 *     `["pnpm", "exec", "tsc", "--project", "tsconfig.api.json"]` → match
 *
 * 例 (no match):
 *   - `["tsc"]` vs `["my-tsc-wrapper"]` → no match (word 境界で `tsc` !== `my-tsc-wrapper`)
 *   - `["tsc"]` vs `["tsc", "--project", "tsconfig.api.json"]` → no match
 *     (suffix が `tsconfig.api.json` であり `tsc` と一致しない。`build` 側に
 *      flag 付き token と flag 無し token の両方が並ぶケースは、command 単位で
 *      別 token として並んでいる前提なので、別 token として独立に suffix match させる)
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const isSuffixMatch = (
  ciWords: readonly string[],
  buildWords: readonly string[],
): boolean => {
  if (ciWords.length === 0) {
    return false;
  }
  if (ciWords.length > buildWords.length) {
    return false;
  }
  const offset = buildWords.length - ciWords.length;
  for (let i = 0; i < ciWords.length; i += 1) {
    if (buildWords[offset + i] !== ciWords[i]) {
      return false;
    }
  }
  return true;
};

/**
 * `build` script 文字列の中に `build:ci` の各 command が「順序を保って」
 * word boundary 単位で出現するかを判定する。
 *
 * アルゴリズム:
 *   - `build` / `build:ci` を `splitCommands` で command 配列化する。
 *   - 各 command を `tokenizeWords` で空白区切りの word 配列に分解する。
 *   - `build:ci` の各 command の word 列を順に走査し、`build` command 配列の
 *     中から **suffix match** する次の command を線形検索する。
 *   - 全 `build:ci` command を順序を崩さず消費できれば ok。
 *   - 途中で見つからなくなった時点で reason 付き ng を返す。
 *
 * Word boundary 判定 (suffix match) を採用する理由 (Issue #701 Major #1):
 *   - `String#includes` による部分一致では `tsc` (CI 側) が `my-tsc-wrapper`
 *     (build 側) のサブストリングに偶発混入する誤検出が発生する。
 *   - 各 command を空白で分解した word 列の suffix 比較に切り替えることで、
 *     `pnpm exec tsc` のような wrapper prefix を許容しつつ、`my-tsc-wrapper`
 *     のような単語境界を跨ぐ混入を排除する。
 *
 * 空配列ケース:
 *   - `buildCiScript` が空 (command 0 件): 検査する command が無いので ok。
 *     ただし呼び出し側 (`main`) では「`build:ci` 自体が空文字」を構成不備
 *     として別途扱う (Issue #701 Major #2)。本関数は文字列入力に対する純粋
 *     関数のため、空文字判定は呼び出し側に委ねる。
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

  const buildCommands = splitCommands(buildScript);
  const buildWordLists = buildCommands.map((command) => tokenizeWords(command));

  let cursor = 0;
  for (const ciCommand of ciCommands) {
    const ciWords = tokenizeWords(ciCommand);
    let matchedIndex = -1;
    for (let i = cursor; i < buildWordLists.length; i += 1) {
      const buildWords = buildWordLists[i] ?? [];
      if (isSuffixMatch(ciWords, buildWords)) {
        matchedIndex = i;
        break;
      }
    }
    if (matchedIndex === -1) {
      const position = cursor === 0 ? "" : " (前 command 以降の位置で)";
      return {
        ok: false,
        reason: `build:ci の command "${ciCommand}" が build script 内${position}に word boundary 単位で見つかりません。`,
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

/**
 * `scripts["build:ci"]` の文字列が「構成不備 (空 / 空白のみ)」かどうかを判定する。
 *
 * Issue #701 Major #2: `build:ci = ""` で `checkSync` が ok を返してしまう問題に
 * 対応。`checkSync` 自体は文字列入力に対する純粋関数として「検査対象なし → ok」を
 * 維持し、構成不備の判定は本関数 + 呼び出し側 (`main`) に集約する。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const isBuildCiMisconfigured = (buildCiScript: string): boolean => {
  return buildCiScript.trim() === "";
};

/**
 * CLI エントリ。`package.json` を読み、`build` / `build:ci` の sync を検査する。
 *
 * Issue #701: 引数 `packageJsonPath` でテスト時に任意の package.json path を
 * 注入できるようにする (デフォルトは PROJECT_ROOT/package.json)。テストでは
 * `process.exit` を mock し、空文字 fail の振る舞いを直接検証する。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const main = (packageJsonPath: string = PACKAGE_JSON_PATH): void => {
  let scripts: PackageScripts;
  try {
    scripts = loadPackageScripts(packageJsonPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`checkBuildCiSync FATAL: ${message}`);
    process.exit(1);
  }

  // Issue #701 Major #2: build:ci が空文字なら構成不備として fail させる。
  // checkSync 自体は「検査対象なし → ok」のままにし、構成不備判定は CLI 側に集約する。
  if (isBuildCiMisconfigured(scripts.buildCi)) {
    console.error(
      'checkBuildCiSync NG - package.json の scripts["build:ci"] が空文字です。',
    );
    console.error(`  build    = ${scripts.build}`);
    console.error(`  build:ci = ${scripts.buildCi}`);
    console.error(HINT_MESSAGE);
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
export {
  checkSync,
  isBuildCiMisconfigured,
  isSuffixMatch,
  loadPackageScripts,
  main,
  splitCommands,
  tokenizeWords,
};
