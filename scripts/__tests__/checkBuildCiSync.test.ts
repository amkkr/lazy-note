/**
 * scripts/checkBuildCiSync.ts の単体テスト (Issue #685)
 *
 * 検証対象:
 *   - splitCommands: `&&` 区切りで command を取り出し、空 token を除外する
 *   - checkSync:
 *       - build に build:ci の全 command が順序を保って含まれていれば ok
 *       - 順序が崩れた / command が抜けていれば ng (reason 付き)
 *       - build:ci 側が空なら ok (検査対象なし)
 *       - 部分一致 (prefix 付き wrapper など) を許容する
 *   - loadPackageScripts: package.json から scripts.build / scripts["build:ci"] を取り出し、
 *     欠落 / 型違反は throw する
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkSync,
  loadPackageScripts,
  splitCommands,
} from "../checkBuildCiSync.ts";

describe("splitCommands", () => {
  it("`&&` 区切りで各 command を trim した配列を返す", () => {
    expect(splitCommands("panda && tsc && vite build")).toEqual([
      "panda",
      "tsc",
      "vite build",
    ]);
  });

  it("空文字列に対して空配列を返す", () => {
    expect(splitCommands("")).toEqual([]);
  });

  it("空白のみの token を除外する", () => {
    expect(splitCommands("panda && && tsc")).toEqual(["panda", "tsc"]);
  });
});

describe("checkSync", () => {
  it("build:ci の全 command が build に順序を保って含まれていれば ok", () => {
    const buildScript =
      "pnpm run lint && pnpm run test:run && pnpm run type-check && panda && tsc && vite build";
    const buildCiScript = "panda && tsc && vite build";
    const result = checkSync(buildScript, buildCiScript);
    expect(result.ok).toBe(true);
  });

  it("build と build:ci が完全一致でも ok", () => {
    const script = "panda && tsc && vite build";
    expect(checkSync(script, script).ok).toBe(true);
  });

  it("build:ci が空なら ok (検査対象なし)", () => {
    expect(checkSync("panda && tsc && vite build", "").ok).toBe(true);
  });

  it("build から build:ci の command が欠落していれば ng", () => {
    const buildScript = "panda && vite build";
    const buildCiScript = "panda && tsc && vite build";
    const result = checkSync(buildScript, buildCiScript);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tsc");
  });

  it("build:ci の command が build と逆順なら ng", () => {
    const buildScript = "vite build && tsc && panda";
    const buildCiScript = "panda && tsc && vite build";
    const result = checkSync(buildScript, buildCiScript);
    expect(result.ok).toBe(false);
  });

  it("部分一致 (wrapper prefix 付き) を許容する", () => {
    const buildScript =
      "pnpm exec panda && pnpm exec tsc && pnpm exec vite build";
    const buildCiScript = "panda && tsc && vite build";
    expect(checkSync(buildScript, buildCiScript).ok).toBe(true);
  });

  it("build が空かつ build:ci が非空なら ng", () => {
    const result = checkSync("", "panda && tsc && vite build");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("panda");
  });

  it("ng 時に reason に欠落 command 名が含まれる", () => {
    const result = checkSync("panda && tsc", "panda && tsc && vite build");
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("vite build");
  });
});

describe("loadPackageScripts", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "check-build-ci-sync-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("scripts.build / scripts['build:ci'] を取り出せる", () => {
    const packagePath = join(tempDir, "package.json");
    writeFileSync(
      packagePath,
      JSON.stringify({
        scripts: {
          build: "panda && tsc && vite build",
          "build:ci": "panda && tsc && vite build",
        },
      }),
    );
    const result = loadPackageScripts(packagePath);
    expect(result.build).toBe("panda && tsc && vite build");
    expect(result.buildCi).toBe("panda && tsc && vite build");
  });

  it("scripts フィールドが無いと throw する", () => {
    const packagePath = join(tempDir, "package.json");
    writeFileSync(packagePath, JSON.stringify({ name: "foo" }));
    expect(() => loadPackageScripts(packagePath)).toThrow(/scripts/);
  });

  it("scripts.build が無いと throw する", () => {
    const packagePath = join(tempDir, "package.json");
    writeFileSync(
      packagePath,
      JSON.stringify({
        scripts: { "build:ci": "panda && tsc && vite build" },
      }),
    );
    expect(() => loadPackageScripts(packagePath)).toThrow(/scripts\.build/);
  });

  it("scripts['build:ci'] が無いと throw する", () => {
    const packagePath = join(tempDir, "package.json");
    writeFileSync(
      packagePath,
      JSON.stringify({
        scripts: { build: "panda && tsc && vite build" },
      }),
    );
    expect(() => loadPackageScripts(packagePath)).toThrow(/build:ci/);
  });
});
