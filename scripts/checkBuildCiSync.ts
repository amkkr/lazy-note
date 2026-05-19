#!/usr/bin/env node

/**
 * Issue #685 / #701: `package.json` の `build` script と `build:ci` script の
 * drift を CI で機械的に検知するためのガードスクリプト。
 *
 * 背景:
 *   - `build:ci` (= `panda && tsc && vite build`) は hash:true regression
 *     workflow 等で `build` の代用として呼ばれるサブセット。
 *   - 過去 (Issue #528) は CLAUDE.md 散文で「`build` 変更時は `build:ci`
 *     も同期させること」と運用ルール化していたが、散文ルールは時間経過で
 *     形骸化する。
 *   - 本スクリプトは `build` 文字列に `build:ci` の各 command が
 *     **順序を保って** 含まれているかを word-tokenize ベースで判定し、
 *     ずれていれば exit 1 で fail-fast する。
 *
 * 設計方針:
 *   - 本リポの `build` / `build:ci` 構造に絞った最小実装。汎用的な script
 *     依存解析は行わない。
 *   - 外部依存追加禁止 (`node:fs` / `node:path` のみ)。
 *   - 純粋関数 `checkSync(buildScript, buildCiScript)` をテスト用に export
 *     する。CLI エントリ (`main`) は副作用 (file IO / process.exit) に集約。
 *
 * Issue #701 (DA Major 指摘対応): 旧実装は `String#includes` の部分一致で
 *   command を判定していたため、`build:ci` の `tsc` が `build` 側の
 *   `pnpm exec my-tsc-wrapper` のような別 command にマッチしてしまう
 *   誤検出があった。`tokenizeCommand` で空白分割し、build:ci の token 列が
 *   build token の **末尾と完全一致** するかで判定するよう変更した。
 *   これにより `pnpm exec tsc` (= 末尾 `[tsc]`) は OK のまま、
 *   `pnpm exec my-tsc-wrapper` (= 末尾 `[my-tsc-wrapper]`) は NG になる。
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
 * command 文字列を空白で分割し、空 token を除外した token 配列を返す。
 *
 * 例:
 *   - `"tsc"` → `["tsc"]`
 *   - `"pnpm exec tsc"` → `["pnpm", "exec", "tsc"]`
 *   - `"tsc --project tsconfig.api.json"`
 *     → `["tsc", "--project", "tsconfig.api.json"]`
 *
 * シェルクォート非対応の限界 (Issue #723 M-2):
 *   - 本実装は `"..."` / `'...'` のシェルクォートを解釈しない単純な空白
 *     split である (= shell quoting / escape は scope 外)。
 *   - そのため空白を含むパス (例: `"path with space/file.ts"`) は
 *     `["\"path", "with", "space/file.ts\""]` のように別 word に分割される。
 *   - 現状 `package.json` の `build` / `build:ci` script コマンドに空白入り
 *     パスは含まれない設計判断のため、この限界は許容している。
 *   - 将来空白入りパスを script に含める必要が出た場合は、`shell-quote` 等の
 *     外部ライブラリ導入を再検討する (本プロジェクトの外部依存追加禁止方針
 *     との兼ね合いで、現状は inline 実装を優先する)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const tokenizeCommand = (command: string): readonly string[] => {
  return command
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
};

/**
 * `buildTokens` (build 側 token の word-tokenize 結果) の末尾が
 * `ciTokens` (build:ci 側 command の word-tokenize 結果) と完全一致するか
 * を判定する。
 *
 * 「末尾完全一致」を採用するのは、`pnpm exec tsc` のような wrapper prefix
 * を許容しつつ、`pnpm exec my-tsc-wrapper` ⊃ `tsc` のような部分一致誤検出
 * を排除するため (Issue #701)。
 */
const matchesAsSuffix = (
  buildTokens: readonly string[],
  ciTokens: readonly string[],
): boolean => {
  if (ciTokens.length === 0 || ciTokens.length > buildTokens.length) {
    return false;
  }
  const offset = buildTokens.length - ciTokens.length;
  for (let i = 0; i < ciTokens.length; i += 1) {
    if (buildTokens[offset + i] !== ciTokens[i]) {
      return false;
    }
  }
  return true;
};

/**
 * `build` script 文字列の中に `build:ci` の各 command が「順序を保って」
 * 出現するかを word-tokenize ベースで判定する。
 *
 * アルゴリズム (Issue #701 で部分一致 → word-tokenize 末尾一致へ変更):
 *   - `build` / `build:ci` をそれぞれ `splitCommands` で `&&` 区切りの
 *     command 配列にする。
 *   - 各 command を `tokenizeCommand` で空白分割し、token 列に展開する。
 *   - `build:ci` の各 command (token 列) を順に走査し、`build` 側の
 *     command (token 列) の **末尾と完全一致** するものを線形検索する。
 *   - 全 `build:ci` command を順序を崩さず消費できれば ok。
 *   - 途中で見つからなくなった時点で reason 付き ng を返す。
 *
 * 末尾完全一致を採用する理由 (Issue #701 DA Major 指摘対応):
 *   - 旧実装は `String#includes` の部分一致で、`build:ci` の短い token
 *     (例 `tsc`) が `build` 側の `pnpm exec my-tsc-wrapper` のような別
 *     command にもマッチして誤検出していた。
 *   - 末尾完全一致なら `pnpm exec tsc` (suffix = `[tsc]`) は OK のまま、
 *     `pnpm exec my-tsc-wrapper` (suffix = `[my-tsc-wrapper]`) を NG に
 *     できる。multi-token command (`tsc --project tsconfig.api.json` 等)
 *     も token 列単位の完全一致として自然に扱える。
 *
 * 案 A (word 単位 suffix match / 現採用) と案 B (regex `\b<token>$`) の比較
 * (Issue #701 で採用判断、Issue #723 で JSDoc 化):
 *   - 案 A: 各 command を空白分割した token 配列の末尾を要素比較する方式
 *     (現実装)。
 *   - 案 B: `build` 側 command 文字列に対し正規表現 `\b<ciCommand>$` で
 *     末尾マッチを判定する方式。
 *   - 採用判断 (案 A):
 *     1. **JS `\b` がハイフン区切り suffix で意図せずマッチする**:
 *        ECMAScript の `\b` は ASCII の `[A-Za-z0-9_]` 境界として定義されて
 *        おり、`-` や `.` 等の記号は word 文字扱いされない。そのため
 *        `\btsc$` は `pnpm exec my-tsc` の末尾 `tsc` (`-` の直後で word
 *        境界が成立) にもマッチしてしまい、本来 NG にしたい誤検出を素直に
 *        排除できない。案 A は token 列 `[..., "my-tsc"]` の suffix が
 *        `[tsc]` ではないため `my-tsc !== tsc` として自然に弾ける。
 *     2. **可読性**: token 配列の要素比較は手続きが直線的で、`offset` /
 *        ループ index を読めば挙動が一意に追える。案 B は `<ciCommand>`
 *        を正規表現に埋め込む際の escape 処理が必要になり、副次的な
 *        コードが増える。
 *     3. **テスト容易性**: `tokenizeCommand` / `matchesAsSuffix` を純粋関数
 *        として独立 export できるため、token 化と suffix 判定を別々に
 *        単体テストできる。案 B は regex 1 本に挙動を集約するため、境界
 *        ケースを分割テストしにくい。
 *   - 詳細な検討経緯は Issue #701 / PR #717 (master `f32e516`) の history を
 *     参照。
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

  const buildTokenLists = splitCommands(buildScript).map((cmd) =>
    tokenizeCommand(cmd),
  );
  let cursor = 0;
  for (const ciCommand of ciCommands) {
    const ciTokens = tokenizeCommand(ciCommand);
    if (ciTokens.length === 0) {
      // splitCommands で空 token は除外しているため通常到達しないが、
      // tokenizeCommand 単独の戻り値型を信頼するためのガード。
      continue;
    }
    let matchedIndex = -1;
    for (let i = cursor; i < buildTokenLists.length; i += 1) {
      const buildTokens = buildTokenLists[i] ?? [];
      if (matchesAsSuffix(buildTokens, ciTokens)) {
        matchedIndex = i;
        break;
      }
    }
    if (matchedIndex === -1) {
      const position = cursor === 0 ? "" : " (前 command 以降の位置で)";
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

/**
 * `scripts["build:ci"]` の文字列が「構成不備 (空 / 空白のみ)」かどうかを
 * 判定する純粋関数。
 *
 * Issue #701 / #724: 旧実装では `main` 内インラインで
 * `scripts.buildCi.trim().length === 0` を判定していたが、
 *   - 単体テストから直接検証できない (`main` 経由でしか叩けない)
 *   - 同種判定を他所で再利用するときに 1 箇所に集約しておきたい
 * という理由で純粋関数として独立 export する。
 *
 * `checkSync` 自体は文字列入力に対する純粋関数として
 * 「検査対象なし → ok」を維持する設計のため、構成不備判定は本関数 +
 * 呼び出し側 (`main`) に集約する責務分割になっている。
 *
 * 判定対象は **文字列としての空 / 空白のみ** のみであり、
 * `"&&"` や `"&& &&"` のような「command 列としては空だが文字列としては非空」
 * のケースは `false` を返す (= 構成不備とは扱わない)。後者は `checkSync` 側で
 * 「ciCommands.length === 0 → ok」と扱うのが既存契約。
 *
 * @param buildCiScript - `package.json` の `scripts["build:ci"]` の生文字列
 * @returns 空文字 / 空白のみなら `true`、それ以外は `false`
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const isBuildCiMisconfigured = (buildCiScript: string): boolean => {
  return buildCiScript.trim().length === 0;
};

/**
 * CLI エントリポイント。`package.json` を読み、`checkSync` の結果に応じて
 * stdout / stderr に出力し、drift / 構成不備時は `process.exit(1)` する。
 *
 * Issue #701 で `buildCiScript === ""` (構成不備) を明示的に fail させる
 * 分岐を追加した。`checkSync` 自体は「空 build:ci なら ok」を返す純粋関数
 * だが、CLI ガードとしての契約は「build:ci が定義されており非空」を要求する。
 *
 * @param packageJsonPath - 通常は `PACKAGE_JSON_PATH`。テスト時のみ別 path
 *   を渡せるよう optional 引数として公開する (既存呼び出しの互換性維持)。
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

  if (isBuildCiMisconfigured(scripts.buildCi)) {
    console.error(
      'checkBuildCiSync FATAL: package.json の scripts["build:ci"] が空文字列です (構成不備)。',
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
  loadPackageScripts,
  main,
  splitCommands,
  tokenizeCommand,
};
