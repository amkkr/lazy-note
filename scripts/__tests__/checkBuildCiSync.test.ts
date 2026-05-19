/**
 * scripts/checkBuildCiSync.ts の単体テスト (Issue #685 / #701)
 *
 * 検証対象:
 *   - splitCommands: `&&` 区切りで command を取り出し、空 token を除外する
 *   - tokenizeCommand: 空白区切りで token 列を返し、空 token を除外する
 *   - checkSync:
 *       - build に build:ci の全 command が順序を保って含まれていれば ok
 *       - 順序が崩れた / command が抜けていれば ng (reason 付き)
 *       - build:ci 側が空なら ok (検査対象なし)
 *       - wrapper prefix (`pnpm exec tsc` 等) を許容する
 *       - 部分一致誤検出 (`pnpm exec my-tsc-wrapper` ⊃ `tsc`) を排除する (Issue #701)
 *       - multi-token command (`tsc --project tsconfig.api.json`) を token 列単位で扱う
 *   - loadPackageScripts: package.json から scripts.build / scripts["build:ci"] を取り出し、
 *     欠落 / 型違反は throw する
 *   - main: buildCi が空文字列の場合に exit 1 で fail する (Issue #701)
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkSync,
  loadPackageScripts,
  main,
  splitCommands,
  tokenizeCommand,
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

describe("tokenizeCommand", () => {
  it("空白区切りで token 配列を返す", () => {
    expect(tokenizeCommand("pnpm exec tsc")).toEqual(["pnpm", "exec", "tsc"]);
  });

  it("単一 token の command をそのまま 1 要素配列にする", () => {
    expect(tokenizeCommand("tsc")).toEqual(["tsc"]);
  });

  it("連続する空白を 1 つの区切りとして扱う", () => {
    expect(tokenizeCommand("pnpm   exec   tsc")).toEqual([
      "pnpm",
      "exec",
      "tsc",
    ]);
  });

  it("flag 付き command を token に展開する", () => {
    expect(tokenizeCommand("tsc --project tsconfig.api.json")).toEqual([
      "tsc",
      "--project",
      "tsconfig.api.json",
    ]);
  });

  it("空文字列に対して空配列を返す", () => {
    expect(tokenizeCommand("")).toEqual([]);
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

  it("wrapper prefix (`pnpm exec` 等) 付き build token を末尾完全一致で許容する", () => {
    const buildScript =
      "pnpm exec panda && pnpm exec tsc && pnpm exec vite build";
    const buildCiScript = "panda && tsc && vite build";
    expect(checkSync(buildScript, buildCiScript).ok).toBe(true);
  });

  it("build 側に `my-tsc-wrapper` のような別 command が含まれていても `tsc` を誤検出しない (Issue #701)", () => {
    // 旧実装は `String#includes` の部分一致で `my-tsc-wrapper` が `tsc` に
    // マッチしてしまっていた。word-tokenize 末尾完全一致では別 token として
    // 区別されるため、build:ci の `tsc` は build に存在しないと判定される。
    const buildScript = "panda && pnpm exec my-tsc-wrapper && vite build";
    const buildCiScript = "panda && tsc && vite build";
    const result = checkSync(buildScript, buildCiScript);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tsc");
  });

  it("multi-token command (`tsc --project tsconfig.api.json`) を token 列単位で完全一致判定する", () => {
    const buildScript =
      "panda && tsc && tsc --project tsconfig.api.json && vite build";
    const buildCiScript =
      "panda && tsc && tsc --project tsconfig.api.json && vite build";
    expect(checkSync(buildScript, buildCiScript).ok).toBe(true);
  });

  it("multi-token command の flag が欠けていれば ng (token 列の完全一致が崩れる)", () => {
    const buildScript =
      "panda && tsc && tsc --project tsconfig.app.json && vite build";
    const buildCiScript =
      "panda && tsc && tsc --project tsconfig.api.json && vite build";
    const result = checkSync(buildScript, buildCiScript);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tsc --project tsconfig.api.json");
  });

  it("build 側 token が `tscx` のような prefix 拡張でも `tsc` を誤検出しない", () => {
    // 末尾完全一致なので `tscx` !== `tsc` で別 token と判定される。
    const buildScript = "panda && tscx && vite build";
    const buildCiScript = "panda && tsc && vite build";
    const result = checkSync(buildScript, buildCiScript);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("tsc");
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

describe("main", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "check-build-ci-sync-main-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  /**
   * `process.exit(code)` を呼び出されたら同期的に throw する spy を仕込む。
   * これにより main 内の早期 return ロジック (exit 後にコードが続かない前提)
   * をテスト側でも担保できる。
   */
  const installExitSpy = (): void => {
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit(${code ?? 0})`);
    }) as never);
  };

  it("buildCi が空文字列なら exit 1 で fail する (Issue #701)", () => {
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
    installExitSpy();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => main(packagePath)).toThrow(/process\.exit\(1\)/);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("build:ci"),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringMatching(/空文字列|構成不備/),
    );
  });

  it("buildCi が空白のみでも exit 1 で fail する (Issue #701)", () => {
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
    installExitSpy();
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => main(packagePath)).toThrow(/process\.exit\(1\)/);
  });

  it("build / build:ci が同期していれば exit せず stdout に OK を出す", () => {
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
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`process.exit(${code ?? 0})`);
      }) as never);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    expect(() => main(packagePath)).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining("checkBuildCiSync OK"),
    );
  });

  it("build に build:ci の command が欠落していれば exit 1 で fail する", () => {
    const packagePath = join(tempDir, "package.json");
    writeFileSync(
      packagePath,
      JSON.stringify({
        scripts: {
          build: "panda && vite build",
          "build:ci": "panda && tsc && vite build",
        },
      }),
    );
    installExitSpy();
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => main(packagePath)).toThrow(/process\.exit\(1\)/);
  });

  it("Issue #701 誤検出シナリオ: build に my-tsc-wrapper があり tsc が無いと exit 1 で fail する", () => {
    const packagePath = join(tempDir, "package.json");
    writeFileSync(
      packagePath,
      JSON.stringify({
        scripts: {
          build: "panda && pnpm exec my-tsc-wrapper && vite build",
          "build:ci": "panda && tsc && vite build",
        },
      }),
    );
    installExitSpy();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => main(packagePath)).toThrow(/process\.exit\(1\)/);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("tsc"),
    );
  });
});
