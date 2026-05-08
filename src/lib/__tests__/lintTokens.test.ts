import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
 *   src/ 全体に対して実行し、現状 0 件であることを担保する。
 * - パターン検出ロジックの正しさは「現実装が 0 件」「既知違反パターンを書くと
 *   検出される」両方をテストすることで担保する。
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(HERE, "..", "..", "..");
const SCRIPT_PATH = join(PROJECT_ROOT, "scripts", "lintTokens.ts");

const runScript = (cwd: string = PROJECT_ROOT) => {
  return spawnSync("node", [SCRIPT_PATH], {
    cwd,
    encoding: "utf8",
  });
};

describe("lint:tokens (scripts/lintTokens.ts)", () => {
  it("既存 src/ では旧 token 参照が 0 件で exit 0 になる", () => {
    const result = runScript();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("lint:tokens OK");
  });

  // ====================================================================
  // 違反パターン注入テスト
  //
  // tmp ディレクトリに `src/` を模した構造を作って lint script を実行する。
  // src/ ルートの位置 (PROJECT_ROOT) は固定だが、cwd を tmpRoot にしても
  // script は import.meta.dirname を起点に scripts/.. を解決するため、
  // PROJECT_ROOT を起点に一時ファイルを置いて消す方針にする。
  // ====================================================================
  describe("違反パターン検知", () => {
    let tmpDir: string;

    beforeEach(() => {
      // src/ 配下に一時ファイルを置き、テスト後に削除する。
      // 接頭辞 `.` を避ける (lint-tokens は隠しディレクトリを走査対象外にしているため)。
      tmpDir = mkdtempSync(join(PROJECT_ROOT, "src", "lint-tokens-test-"));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    const writeTmpFile = (filename: string, content: string): void => {
      writeFileSync(join(tmpDir, filename), content, "utf8");
    };

    it("bg.<digit> 参照を検出し exit 1 になる", () => {
      writeTmpFile("violation.tsx", "const c = css({ background: 'bg.0' });\n");
      const result = runScript();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-bg-numeric");
    });

    it("fg.<digit> 参照を検出し exit 1 になる", () => {
      writeTmpFile("violation.tsx", "const c = css({ color: 'fg.3' });\n");
      const result = runScript();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-fg-numeric");
    });

    it("token('colors.bg.<digit>') 参照を検出する", () => {
      writeTmpFile("violation.ts", "const v = token('colors.bg.2');\n");
      const result = runScript();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-token-colors-bg-numeric");
    });

    it("token(\"colors.fg.<digit>\") 参照を検出する", () => {
      writeTmpFile("violation.ts", 'const v = token("colors.fg.1");\n');
      const result = runScript();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-token-colors-fg-numeric");
    });

    it("var(--colors-bg-<digit>) 参照を検出する", () => {
      writeTmpFile("violation.css", "a { background: var(--colors-bg-0); }\n");
      const result = runScript();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-css-var-bg-numeric");
    });

    it("var(--colors-fg-<digit>) 参照を検出する", () => {
      writeTmpFile("violation.css", "a { color: var(--colors-fg-2); }\n");
      const result = runScript();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-css-var-fg-numeric");
    });

    it("token('colors.gruvbox.*') 参照を検出する", () => {
      writeTmpFile("violation.ts", "const v = token('colors.gruvbox.bg-0');\n");
      const result = runScript();
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("old-gruvbox-token");
    });

    it(".test.ts ファイルは検査対象外で違反検出されない", () => {
      writeTmpFile(
        "violation.test.ts",
        "const v = token('colors.bg.0');\n",
      );
      const result = runScript();
      expect(result.status).toBe(0);
    });
  });
});
