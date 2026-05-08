import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * R-5 (Issue #393) `pnpm lint:tokens` (scripts/lintTokens.ts) の動作テスト。
 *
 * scripts/ 配下のスクリプトはアプリ src の外側にあり、Vitest の include 対象外。
 * そのため subprocess (Node) で実行し、stdout / exit code を検証する形を取る。
 *
 * - 旧 token を含むダミーソースファイルを tmp ディレクトリに書き出して
 *   scripts/lintTokens.ts を import する単体テストは難しいため、E2E 形式で
 *   一時ディレクトリに対して実行し、現状 0 件であることを担保する。
 * - パターン検出ロジックの正しさは「現実装が 0 件」「既知違反パターンを書くと
 *   検出される」両方をテストすることで担保する。
 *
 * R-5 修正 (DA 重大 3 対応):
 *   旧実装は `mkdtempSync(join(PROJECT_ROOT, "src", ...))` で実 src/ 直下に
 *   tmp dir を作っていたため、テスト失敗 / Ctrl-C 時の残置が `pnpm lint:tokens`
 *   の検査対象に含まれて exit 1 を引き起こす副作用があった。
 *   現実装は OS tmp dir に書き出し、スクリプト側で受け取れる
 *   `LINT_TOKENS_SRC_DIR` env var で対象ディレクトリを切り替える。
 *
 * Issue #413 拡張:
 *   走査範囲を `panda.config.ts` / `scripts/` / `e2e/` まで広げたため、
 *   コメント中の旧 token 言及 (旧→新マッピング表) が誤検知されないよう
 *   コメント除外ロジックを追加した。本ファイルでは
 *   - コメント除外 (行コメント / ブロックコメント / 文字列リテラル中の
 *     `//` `/*` 非除外)
 *   - 既定の複数 path 走査 (panda.config.ts 等が含まれる)
 *   をテストする。
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(HERE, "..", "..", "..");
const SCRIPT_PATH = join(PROJECT_ROOT, "scripts", "lintTokens.ts");

const runScript = (envOverrides: NodeJS.ProcessEnv = {}) => {
  return spawnSync("node", [SCRIPT_PATH], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
};

describe("lint:tokens (scripts/lintTokens.ts)", () => {
  it("既定 (src/ + panda.config.ts + scripts/ + e2e/) で旧 token 参照が 0 件で exit 0 になる", () => {
    const result = runScript();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("lint:tokens OK");
  });

  it("既定の走査では panda.config.ts / scripts / e2e も含めて src/ より多くの files を走査する", () => {
    // src/ のみだった旧挙動 (54 files) より多いことを期待する。
    // 厳密な数値は将来変動するため「54 を超えること」を緩めに検証する。
    const result = runScript();
    expect(result.status).toBe(0);
    const match = result.stdout.match(/(\d+) files scanned/);
    expect(match).not.toBeNull();
    if (match === null) {
      return;
    }
    const scanned = Number.parseInt(match[1] as string, 10);
    expect(scanned).toBeGreaterThan(54);
  });

  // ====================================================================
  // 違反パターン注入テスト
  //
  // OS tmp ディレクトリに走査対象相当の構造を作って lint script を実行する。
  // 既定の TARGET_PATHS は固定だが、テストでは `LINT_TOKENS_SRC_DIR` env var で
  // 走査対象を tmp dir 1 つに絞り込む。
  // これにより src/ 直下に一時ファイルが残置するリスクを排除する。
  // ====================================================================
  describe("違反パターン検知", () => {
    let tmpDir: string;

    beforeEach(() => {
      // OS の tmp dir に置く。テスト失敗 / Ctrl-C 時に残置しても
      // pnpm lint:tokens の通常検査対象 (src/) には影響しない。
      tmpDir = mkdtempSync(join(tmpdir(), "lint-tokens-test-"));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    const writeTmpFile = (filename: string, content: string): void => {
      writeFileSync(join(tmpDir, filename), content, "utf8");
    };

    const runWithTmpDir = () => runScript({ LINT_TOKENS_SRC_DIR: tmpDir });

    it("bg.<digit> 参照を検出し exit 1 になる", () => {
      writeTmpFile("violation.tsx", "const c = css({ background: 'bg.0' });\n");
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-bg-numeric");
    });

    it("fg.<digit> 参照を検出し exit 1 になる", () => {
      writeTmpFile("violation.tsx", "const c = css({ color: 'fg.3' });\n");
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-fg-numeric");
    });

    it("token('colors.bg.<digit>') 参照を検出する", () => {
      writeTmpFile("violation.ts", "const v = token('colors.bg.2');\n");
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-token-colors-bg-numeric");
    });

    it('token("colors.fg.<digit>") 参照を検出する', () => {
      writeTmpFile("violation.ts", 'const v = token("colors.fg.1");\n');
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-token-colors-fg-numeric");
    });

    it("var(--colors-bg-<digit>) 参照を検出する", () => {
      writeTmpFile("violation.css", "a { background: var(--colors-bg-0); }\n");
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-css-var-bg-numeric");
    });

    it("var(--colors-fg-<digit>) 参照を検出する", () => {
      writeTmpFile("violation.css", "a { color: var(--colors-fg-2); }\n");
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-css-var-fg-numeric");
    });

    it("token('colors.gruvbox.*') 参照を検出する", () => {
      writeTmpFile("violation.ts", "const v = token('colors.gruvbox.bg-0');\n");
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-gruvbox-token");
    });

    // ====================================================================
    // オブジェクトキー記法検知 (Issue #413 / DA 致命 1 対応)
    //
    // panda.config.ts の theme 定義で `bg: { "0": { value: "..." } }` のように
    // 旧 5 段階トークンを再導入した場合に検出する。複数行にまたがるため
    // scope: "file" で走査する必要がある。
    // ====================================================================
    it("オブジェクトキー記法 `bg: { '0': ... }` を検出する (panda.config.ts 想定)", () => {
      writeTmpFile(
        "config.ts",
        [
          "export default {",
          "  theme: {",
          "    tokens: {",
          "      colors: {",
          "        bg: {",
          '          "0": { value: "test" },',
          "        },",
          "      },",
          "    },",
          "  },",
          "};",
          "",
        ].join("\n"),
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-bg-numeric-key");
    });

    it("オブジェクトキー記法 `fg: { '0': ... }` を検出する", () => {
      writeTmpFile(
        "config.ts",
        [
          "export default {",
          "  fg: {",
          '    "0": { value: "test" },',
          "  },",
          "};",
          "",
        ].join("\n"),
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-fg-numeric-key");
    });

    it("オブジェクトキー記法 `gruvbox: {` を検出する", () => {
      writeTmpFile(
        "config.ts",
        [
          "export default {",
          "  gruvbox: {",
          '    "bg-0": { value: "test" },',
          "  },",
          "};",
          "",
        ].join("\n"),
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-gruvbox-key");
    });

    it("既存の `bg: { canvas: ... }` (新 semantic token) はオブジェクトキー記法として誤検知されない", () => {
      writeTmpFile(
        "config.ts",
        [
          "export default {",
          "  bg: {",
          "    canvas: { value: { _light: 'cream-50' } },",
          "    surface: { value: { _light: 'cream-100' } },",
          "    elevated: { value: { _light: 'cream-50' } },",
          "  },",
          "  fg: {",
          "    primary: { value: { _light: 'ink-900' } },",
          "    code: { value: { _light: '#3c3836' } },",
          "  },",
          "};",
          "",
        ].join("\n"),
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(0);
    });

    it(".test.ts ファイルは検査対象外で違反検出されない", () => {
      // `.test.ts` は EXCLUDED_FILE_SUFFIXES で除外される。
      // 0 files scanned ガード (DA 致命 2) を回避するため、検出対象外の通常 `.ts` を併置する。
      writeTmpFile("safe.ts", "const safe = 1;\n");
      writeTmpFile("violation.test.ts", "const v = token('colors.bg.0');\n");
      const result = runWithTmpDir();
      expect(result.status).toBe(0);
    });
  });

  // ====================================================================
  // コメント除外テスト (Issue #413)
  //
  // 走査範囲を panda.config.ts / scripts / e2e に拡大したことで、
  // コメント中の旧→新マッピング表 (例: panda.config.ts の JSDoc) が
  // 誤検知されないようにする。
  //
  // 文字列リテラル中の `//` `/*` はコメント開始と見做さないことも検証する
  // (旧 token を文字列リテラルとして書いたケースは検知したいため)。
  // ====================================================================
  describe("コメント除外", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), "lint-tokens-comment-test-"));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    const writeTmpFile = (filename: string, content: string): void => {
      writeFileSync(join(tmpDir, filename), content, "utf8");
    };

    const runWithTmpDir = () => runScript({ LINT_TOKENS_SRC_DIR: tmpDir });

    it("行コメント (`//`) 中の旧 token は誤検知されない", () => {
      writeTmpFile(
        "doc.ts",
        "// 旧トークン bg.0 / fg.0 / colors.gruvbox.bg-0 は廃止済み\nconst v = 1;\n",
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(0);
    });

    it("ブロックコメント (`/* ... */`) 中の旧 token は誤検知されない", () => {
      writeTmpFile(
        "doc.ts",
        "/* bg.0..bg.4 は R-2c で削除済み (panda.config.ts JSDoc 相当) */\nconst v = 1;\n",
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(0);
    });

    it("複数行にまたがるブロックコメント中の旧 token は誤検知されない", () => {
      writeTmpFile(
        "doc.ts",
        [
          "/**",
          " * 旧トークン bg.0..bg.4 / fg.0..fg.4 / colors.gruvbox.* は",
          " * R-2c (Issue #390) で削除済み。",
          " * `token('colors.bg.0')` などの参照も同時に削除されている。",
          " */",
          "const v = 1;",
          "",
        ].join("\n"),
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(0);
    });

    it("ブロックコメント終了後の同一行の旧 token は検知される", () => {
      writeTmpFile("violation.ts", "/* これはコメント */ const v = 'bg.0';\n");
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-bg-numeric");
    });

    it("文字列リテラル (シングルクォート) 中の `//` はコメント開始と見做さず旧 token を検知する", () => {
      writeTmpFile(
        "violation.ts",
        "const v = '// bg.0 はリテラル中なので検知される';\n",
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-bg-numeric");
    });

    it("文字列リテラル (ダブルクォート) 中の `/*` はコメント開始と見做さず旧 token を検知する", () => {
      writeTmpFile(
        "violation.ts",
        'const v = "/* bg.0 はリテラル中なので検知される */";\n',
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-bg-numeric");
    });

    it("テンプレートリテラル (バッククォート) 中の旧 token は検知される", () => {
      writeTmpFile(
        "violation.ts",
        "const v = `bg.0 はテンプレートリテラル中で検知される`;\n",
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-bg-numeric");
    });

    it("行コメント以降に旧 token があってもコード部の旧 token は検知される", () => {
      writeTmpFile(
        "violation.ts",
        "const v = 'bg.0'; // bg.0 / fg.0 は削除済み (この部分は検知されない)\n",
      );
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      // 'bg.0' (コード部) のみ検知され、行コメント中の bg.0 / fg.0 は無視される。
      const stderr = result.stderr;
      expect(stderr).toContain("old-bg-numeric");
      // 行コメント側にあった `fg.0` が誤検知されていないことを担保する。
      expect(stderr).not.toContain("old-fg-numeric");
    });

    it("コメント中に旧 token を含むファイルとコードに旧 token を含むファイルが混在する場合、コードのみ検知される", () => {
      writeTmpFile(
        "doc.ts",
        "// bg.0 / fg.0 / colors.gruvbox.bg-0 は廃止 (コメントなので無視)\nconst safe = 1;\n",
      );
      writeTmpFile("violation.tsx", "const c = css({ background: 'bg.2' });\n");
      const result = runWithTmpDir();
      expect(result.status).toBe(1);
      // 違反は 1 件のみ (doc.ts のコメントは検知されない)。
      expect(result.stderr).toContain("1 legacy token reference(s) found");
      expect(result.stderr).toContain("violation.tsx");
      expect(result.stderr).not.toContain("doc.ts");
    });
  });

  // ====================================================================
  // 単一ファイル走査テスト (Issue #413)
  //
  // panda.config.ts のような単一ファイル指定にも対応していることを確認する。
  // ====================================================================
  describe("単一ファイル走査", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), "lint-tokens-singlefile-test-"));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("LINT_TOKENS_SRC_DIR に単一ファイルを指定しても旧 token を検知する", () => {
      const filePath = join(tmpDir, "single.ts");
      writeFileSync(filePath, "const v = 'bg.0';\n", "utf8");
      const result = runScript({ LINT_TOKENS_SRC_DIR: filePath });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-bg-numeric");
    });

    it("LINT_TOKENS_SRC_DIR に対象拡張子外の単一ファイルを指定すると 0 files で exit 2 になる", () => {
      // .md は走査対象外なので 0 files になる。
      // 0 files scanned ガード (DA 致命 2 対応) で exit 2 (FATAL) になることを検証する。
      const filePath = join(tmpDir, "single.md");
      writeFileSync(filePath, "bg.0 in markdown\n", "utf8");
      const result = runScript({ LINT_TOKENS_SRC_DIR: filePath });
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("lint:tokens FATAL: no files scanned");
    });
  });

  // ====================================================================
  // 0 files scanned ガード (DA 致命 2 対応)
  //
  // LINT_TOKENS_SRC_DIR が誤設定 (存在しないパス / 空ディレクトリ) の場合に、
  // exit 0 で素通りせず fail-fast (exit 2) することを検証する。
  // exit 1 (旧 token 検出) と exit 2 (構成不備) は別ステータスにする。
  // ====================================================================
  describe("0 files scanned ガード", () => {
    it("LINT_TOKENS_SRC_DIR に存在しないパスを指定すると exit 2 になる", () => {
      const result = runScript({
        LINT_TOKENS_SRC_DIR: "/nonexistent-lint-tokens-test-path",
      });
      expect(result.status).toBe(2);
      expect(result.stderr).toContain("lint:tokens FATAL: no files scanned");
    });

    it("LINT_TOKENS_SRC_DIR に空ディレクトリを指定すると exit 2 になる", () => {
      const emptyDir = mkdtempSync(join(tmpdir(), "lint-tokens-empty-"));
      try {
        const result = runScript({ LINT_TOKENS_SRC_DIR: emptyDir });
        expect(result.status).toBe(2);
        expect(result.stderr).toContain("lint:tokens FATAL: no files scanned");
      } finally {
        rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });
});
