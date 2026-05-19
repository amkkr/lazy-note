/**
 * scripts/checkBuildCiSync.ts の単体テスト (Issue #685 / #701)
 *
 * 検証対象:
 *   - splitCommands: `&&` 区切りで command を取り出し、空 token を除外する
 *   - tokenizeWords: command 文字列を空白区切りの word 配列に分解する (Issue #701)
 *   - isSuffixMatch: word 配列の suffix (末尾揃え) 完全一致判定 (Issue #701)
 *   - checkSync:
 *       - build に build:ci の全 command が順序を保って含まれていれば ok
 *       - 順序が崩れた / command が抜けていれば ng (reason 付き)
 *       - build:ci 側が空なら ok (検査対象なし)
 *       - 部分一致 (wrapper prefix など) を word boundary 単位で許容する
 *       - 単語境界を跨ぐ偶発混入 (`tsc` ⊂ `my-tsc-wrapper` 等) は ng (Issue #701)
 *   - isBuildCiMisconfigured: build:ci が空文字 / 空白のみなら true (Issue #701)
 *   - loadPackageScripts: package.json から scripts.build / scripts["build:ci"] を取り出し、
 *     欠落 / 型違反は throw する
 *   - main: build:ci が空文字なら exit 1 (構成不備として fail) (Issue #701)
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkSync,
  isBuildCiMisconfigured,
  isSuffixMatch,
  loadPackageScripts,
  main,
  splitCommands,
  tokenizeWords,
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

describe("tokenizeWords", () => {
  it("空白区切りで word 配列を返す", () => {
    expect(tokenizeWords("tsc --project tsconfig.api.json")).toEqual([
      "tsc",
      "--project",
      "tsconfig.api.json",
    ]);
  });

  it("単独 word でも word 配列として返す", () => {
    expect(tokenizeWords("tsc")).toEqual(["tsc"]);
  });

  it("連続する空白を単一 separator として扱う", () => {
    expect(tokenizeWords("pnpm   exec    tsc")).toEqual([
      "pnpm",
      "exec",
      "tsc",
    ]);
  });

  it("タブ区切りも単一 separator として扱う", () => {
    expect(tokenizeWords("pnpm\texec\ttsc")).toEqual(["pnpm", "exec", "tsc"]);
  });

  it("空文字列に対して空配列を返す", () => {
    expect(tokenizeWords("")).toEqual([]);
  });

  it("空白のみの文字列に対して空配列を返す", () => {
    expect(tokenizeWords("   ")).toEqual([]);
  });
});

describe("isSuffixMatch", () => {
  it("完全一致なら true", () => {
    expect(isSuffixMatch(["tsc"], ["tsc"])).toBe(true);
  });

  it("ciWords が buildWords の suffix なら true (wrapper prefix 許容)", () => {
    expect(isSuffixMatch(["tsc"], ["pnpm", "exec", "tsc"])).toBe(true);
    expect(isSuffixMatch(["vite", "build"], ["pnpm", "exec", "vite", "build"]))
      .toBe(true);
  });

  it("複数 word の ciWords が build 側 suffix と一致するなら true", () => {
    expect(
      isSuffixMatch(
        ["tsc", "--project", "tsconfig.api.json"],
        ["pnpm", "exec", "tsc", "--project", "tsconfig.api.json"],
      ),
    ).toBe(true);
  });

  it("word 境界が一致しない (substring混入) なら false", () => {
    // `tsc` が `my-tsc-wrapper` のサブストリングだが word としては別 → false
    expect(isSuffixMatch(["tsc"], ["my-tsc-wrapper"])).toBe(false);
    expect(isSuffixMatch(["tsc"], ["pnpm", "exec", "my-tsc-wrapper"])).toBe(
      false,
    );
  });

  it("ciWords が buildWords より長ければ false", () => {
    expect(isSuffixMatch(["pnpm", "exec", "tsc"], ["tsc"])).toBe(false);
  });

  it("ciWords が空なら false (空はマッチ対象外として扱う)", () => {
    expect(isSuffixMatch([], ["tsc"])).toBe(false);
  });

  it("buildWords が prefix で一致しても suffix が一致しなければ false", () => {
    // ciWords=["tsc"] vs buildWords=["tsc", "--project", "tsconfig.api.json"]
    // → suffix は "tsconfig.api.json" であり "tsc" と一致しない
    expect(
      isSuffixMatch(["tsc"], ["tsc", "--project", "tsconfig.api.json"]),
    ).toBe(false);
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

  it("部分一致 (wrapper prefix 付き) を word boundary 単位で許容する", () => {
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

  it("複数 word の command (tsc --project ...) も word boundary 単位で match できる", () => {
    // 本リポ実態と一致する build:ci 構成
    const buildScript =
      "pnpm run lint && pnpm run test:run && panda && tsc && tsc --project tsconfig.api.json && vite build";
    const buildCiScript =
      "panda && tsc && tsc --project tsconfig.api.json && vite build";
    expect(checkSync(buildScript, buildCiScript).ok).toBe(true);
  });

  // Issue #701 Major #1: 短い token の誤検出回避テスト
  it("build 側に `my-tsc-wrapper` 等のサブストリング混入がある場合は ng になる", () => {
    // `tsc` (build:ci 側) が `my-tsc-wrapper` (build 側) の substring として
    // 含まれるが、word boundary 判定では別単語として扱われるため ng となる
    const buildScript = "panda && my-tsc-wrapper && vite build";
    const buildCiScript = "panda && tsc && vite build";
    const result = checkSync(buildScript, buildCiScript);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tsc");
  });

  it("build 側が `tsc-wrapper` (suffix 違い) でも word boundary で ng", () => {
    const buildScript = "panda && tsc-wrapper && vite build";
    const buildCiScript = "panda && tsc && vite build";
    expect(checkSync(buildScript, buildCiScript).ok).toBe(false);
  });

  it("build 側が `wrapper-tsc` (prefix 違い) でも word boundary で ng", () => {
    const buildScript = "panda && wrapper-tsc && vite build";
    const buildCiScript = "panda && tsc && vite build";
    expect(checkSync(buildScript, buildCiScript).ok).toBe(false);
  });
});

describe("isBuildCiMisconfigured", () => {
  it("空文字なら true", () => {
    expect(isBuildCiMisconfigured("")).toBe(true);
  });

  it("空白のみなら true", () => {
    expect(isBuildCiMisconfigured("   ")).toBe(true);
    expect(isBuildCiMisconfigured("\t\n")).toBe(true);
  });

  it("非空 command なら false", () => {
    expect(isBuildCiMisconfigured("panda && tsc && vite build")).toBe(false);
  });

  it("`&&` のみでも (= splitCommands で空になるが) false 扱い (構成不備検査は文字列の空を見るのみ)", () => {
    // 本関数は「文字列として空 / 空白のみか」のみを判定する。
    // command 配列としての空 (例: `&& &&`) は checkSync 側の責務として ok を返す。
    expect(isBuildCiMisconfigured("&&")).toBe(false);
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

describe("main (build:ci 空文字 fail) (Issue #701 Major #2)", () => {
  let tempDir: string;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "check-build-ci-sync-main-"));
    // process.exit を throw に差し替え、後続コードの実行を止めつつ exit code を検証する
    exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit:${code ?? 0}`);
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    }) as any);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    exitSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("build:ci が空文字の package.json を渡すと exit 1 で fail する", () => {
    const packagePath = join(tempDir, "package.json");
    writeFileSync(
      packagePath,
      JSON.stringify({
        scripts: {
          build: "panda && tsc && vite build",
          "build:ci": "",
        },
      }),
    );
    expect(() => main(packagePath)).toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    const messages = errorSpy.mock.calls
      .map((args: unknown[]) => args.join(" "))
      .join("\n");
    expect(messages).toContain('scripts["build:ci"] が空文字');
  });

  it("build:ci が空白のみの package.json を渡すと exit 1 で fail する", () => {
    const packagePath = join(tempDir, "package.json");
    writeFileSync(
      packagePath,
      JSON.stringify({
        scripts: {
          build: "panda && tsc && vite build",
          "build:ci": "   ",
        },
      }),
    );
    expect(() => main(packagePath)).toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("正常系 (build:ci が非空 + build に含まれる) では exit が呼ばれない", () => {
    const packagePath = join(tempDir, "package.json");
    writeFileSync(
      packagePath,
      JSON.stringify({
        scripts: {
          build:
            "pnpm run lint && panda && tsc && tsc --project tsconfig.api.json && vite build",
          "build:ci":
            "panda && tsc && tsc --project tsconfig.api.json && vite build",
        },
      }),
    );
    main(packagePath);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });

  it("build に my-tsc-wrapper のような誤検出ケースが含まれていれば exit 1 で fail する (Issue #701 Major #1)", () => {
    const packagePath = join(tempDir, "package.json");
    writeFileSync(
      packagePath,
      JSON.stringify({
        scripts: {
          build: "panda && my-tsc-wrapper && vite build",
          "build:ci": "panda && tsc && vite build",
        },
      }),
    );
    expect(() => main(packagePath)).toThrow("process.exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
