/**
 * scripts/lintTokens.ts のヘルパー関数群に対する単体テスト (Issue #621 / Should #5)。
 *
 * E2E (src/lib/__tests__/lintTokens.test.ts) は spawnSync ベースで
 * パターン検知の総合動作を担保するが、内部ヘルパーの境界条件
 * (broken symlink / 0 幅 RegExp / lineStartOffsets 末尾行抽出 等) は
 * 単体テストで個別にカバーする。
 */

import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectTargetFiles,
  extractSanitizedLine,
  handleBlockComment,
  handleDefault,
  handleStringLiteral,
  isAcceptableFile,
  iterateMatches,
  type LintPattern,
  processChar,
  sanitizeFile,
  scanFile,
  scanFileScope,
  scanLineScope,
  type ScanState,
  shouldSkipEntry,
  stripComments,
  tryStat,
  type Violation,
  walkDirectory,
} from "../lintTokens";

const makeState = (overrides: Partial<ScanState> = {}): ScanState => ({
  inBlockComment: false,
  inSingle: false,
  inDouble: false,
  inBacktick: false,
  ...overrides,
});

describe("tryStat", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "lint-tokens-trystat-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("存在するファイルなら Stats を返せる", () => {
    const file = join(tmpDir, "exists.ts");
    writeFileSync(file, "const a = 1;\n", "utf8");
    const stats = tryStat(file);
    expect(stats).toBeDefined();
    expect(stats?.isFile()).toBe(true);
  });

  it("存在しないパスなら undefined を返す", () => {
    expect(tryStat(join(tmpDir, "missing"))).toBeUndefined();
  });

  it("broken symlink を渡しても throw せず undefined を返す", () => {
    const link = join(tmpDir, "broken-link");
    symlinkSync(join(tmpDir, "nonexistent-target"), link);
    expect(() => tryStat(link)).not.toThrow();
    expect(tryStat(link)).toBeUndefined();
  });
});

describe("shouldSkipEntry", () => {
  it("隠しディレクトリ (`.` で始まる) を skip 対象にできる", () => {
    expect(shouldSkipEntry(".git")).toBe(true);
    expect(shouldSkipEntry(".cache")).toBe(true);
  });

  it("node_modules を skip 対象にできる", () => {
    expect(shouldSkipEntry("node_modules")).toBe(true);
  });

  it("__tests__ ディレクトリを skip 対象にできる", () => {
    expect(shouldSkipEntry("__tests__")).toBe(true);
  });

  it("通常のディレクトリ名は skip しない", () => {
    expect(shouldSkipEntry("src")).toBe(false);
    expect(shouldSkipEntry("lib")).toBe(false);
    expect(shouldSkipEntry("test")).toBe(false);
  });
});

describe("isAcceptableFile", () => {
  it("対象拡張子 .ts / .tsx / .css は受理する", () => {
    expect(isAcceptableFile("/x/foo.ts")).toBe(true);
    expect(isAcceptableFile("/x/foo.tsx")).toBe(true);
    expect(isAcceptableFile("/x/foo.css")).toBe(true);
  });

  it("対象外拡張子は弾く", () => {
    expect(isAcceptableFile("/x/foo.md")).toBe(false);
    expect(isAcceptableFile("/x/foo.json")).toBe(false);
    expect(isAcceptableFile("/x/foo.js")).toBe(false);
  });

  it(".test.ts / .test.tsx は除外 suffix で弾く", () => {
    expect(isAcceptableFile("/x/foo.test.ts")).toBe(false);
    expect(isAcceptableFile("/x/foo.test.tsx")).toBe(false);
  });

  it("scripts/lintTokens.ts (自身) は除外 suffix で弾く", () => {
    expect(isAcceptableFile("/repo/scripts/lintTokens.ts")).toBe(false);
  });
});

describe("walkDirectory", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "lint-tokens-walk-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("受理可能ファイルだけを results に追記できる", () => {
    writeFileSync(join(tmpDir, "ok.ts"), "x", "utf8");
    writeFileSync(join(tmpDir, "skip.md"), "x", "utf8");
    const results: string[] = [];
    walkDirectory(tmpDir, results);
    expect(results).toContain(join(tmpDir, "ok.ts"));
    expect(results).not.toContain(join(tmpDir, "skip.md"));
  });

  it("__tests__ ディレクトリ配下はスキップできる", () => {
    const testsDir = join(tmpDir, "__tests__");
    mkdirSync(testsDir);
    writeFileSync(join(testsDir, "fixture.ts"), "x", "utf8");
    writeFileSync(join(tmpDir, "real.ts"), "x", "utf8");
    const results: string[] = [];
    walkDirectory(tmpDir, results);
    expect(results).toContain(join(tmpDir, "real.ts"));
    expect(results).not.toContain(join(testsDir, "fixture.ts"));
  });

  it("broken symlink を含むディレクトリでも throw せず他のファイルを集められる", () => {
    writeFileSync(join(tmpDir, "real.ts"), "x", "utf8");
    symlinkSync(join(tmpDir, "missing-target"), join(tmpDir, "dangling"));
    const results: string[] = [];
    expect(() => walkDirectory(tmpDir, results)).not.toThrow();
    expect(results).toContain(join(tmpDir, "real.ts"));
  });

  it("再帰的にサブディレクトリのファイルも集められる", () => {
    const sub = join(tmpDir, "sub");
    mkdirSync(sub);
    writeFileSync(join(sub, "deep.ts"), "x", "utf8");
    const results: string[] = [];
    walkDirectory(tmpDir, results);
    expect(results).toContain(join(sub, "deep.ts"));
  });
});

describe("collectTargetFiles", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "lint-tokens-collect-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("存在しないパスでは空配列を返す", () => {
    expect(collectTargetFiles(join(tmpDir, "no-such-dir"))).toEqual([]);
  });

  it("単一ファイル指定で受理可能なら 1 件返す", () => {
    const file = join(tmpDir, "single.ts");
    writeFileSync(file, "x", "utf8");
    expect(collectTargetFiles(file)).toEqual([file]);
  });

  it("単一ファイル指定でも対象外拡張子なら空配列を返す", () => {
    const file = join(tmpDir, "single.md");
    writeFileSync(file, "x", "utf8");
    expect(collectTargetFiles(file)).toEqual([]);
  });
});

describe("handleBlockComment", () => {
  it("`*` と次が `/` ならブロックコメントを終端できる", () => {
    const state = makeState({ inBlockComment: true });
    const out: string[] = [];
    const result = handleBlockComment("*", "/", out, state);
    expect(state.inBlockComment).toBe(false);
    expect(out.join("")).toBe("  ");
    expect(result.advance).toBe(1);
  });

  it("終端でない文字はブロックコメントを維持し空白で置換する", () => {
    const state = makeState({ inBlockComment: true });
    const out: string[] = [];
    const result = handleBlockComment("a", "b", out, state);
    expect(state.inBlockComment).toBe(true);
    expect(out.join("")).toBe(" ");
    expect(result.advance).toBe(0);
  });
});

describe("handleStringLiteral", () => {
  it("シングルクォート文字列内で同じクォートを検出すると inSingle を下ろせる", () => {
    const state = makeState({ inSingle: true });
    const out: string[] = [];
    handleStringLiteral("'", "", out, state, "'");
    expect(state.inSingle).toBe(false);
    expect(out.join("")).toBe("'");
  });

  it("ダブルクォート文字列内で同じクォートを検出すると inDouble を下ろせる", () => {
    const state = makeState({ inDouble: true });
    const out: string[] = [];
    handleStringLiteral('"', "", out, state, '"');
    expect(state.inDouble).toBe(false);
  });

  it("バッククォート文字列内で同じクォートを検出すると inBacktick を下ろせる", () => {
    const state = makeState({ inBacktick: true });
    const out: string[] = [];
    handleStringLiteral("`", "", out, state, "`");
    expect(state.inBacktick).toBe(false);
  });

  it("バックスラッシュエスケープでは次の文字も維持し advance=1 を返す", () => {
    const state = makeState({ inSingle: true });
    const out: string[] = [];
    const result = handleStringLiteral("\\", "n", out, state, "'");
    expect(out.join("")).toBe("\\n");
    expect(result.advance).toBe(1);
    expect(state.inSingle).toBe(true);
  });

  it("クォート以外の文字ではフラグは下ろさず文字を維持する", () => {
    const state = makeState({ inDouble: true });
    const out: string[] = [];
    handleStringLiteral("a", "b", out, state, '"');
    expect(state.inDouble).toBe(true);
    expect(out.join("")).toBe("a");
  });
});

describe("handleDefault", () => {
  it("シングルクォートで inSingle フラグを立てられる", () => {
    const state = makeState();
    const out: string[] = [];
    handleDefault("'", "", out, state, 1);
    expect(state.inSingle).toBe(true);
    expect(out.join("")).toBe("'");
  });

  it("ダブルクォートで inDouble フラグを立てられる", () => {
    const state = makeState();
    const out: string[] = [];
    handleDefault('"', "", out, state, 1);
    expect(state.inDouble).toBe(true);
  });

  it("バッククォートで inBacktick フラグを立てられる", () => {
    const state = makeState();
    const out: string[] = [];
    handleDefault("`", "", out, state, 1);
    expect(state.inBacktick).toBe(true);
  });

  it("`//` を検出すると残り全長を空白で埋めて terminated=true を返す", () => {
    const state = makeState();
    const out: string[] = [];
    const result = handleDefault("/", "/", out, state, 5);
    expect(result.terminated).toBe(true);
    expect(out.join("")).toBe("     ");
  });

  it("`/*` でブロックコメントに入り `advance=1` を返す", () => {
    const state = makeState();
    const out: string[] = [];
    const result = handleDefault("/", "*", out, state, 2);
    expect(state.inBlockComment).toBe(true);
    expect(result.advance).toBe(1);
    expect(out.join("")).toBe("  ");
  });

  it("通常文字はそのまま追記する", () => {
    const state = makeState();
    const out: string[] = [];
    handleDefault("a", "b", out, state, 2);
    expect(out.join("")).toBe("a");
    expect(state.inBlockComment).toBe(false);
  });
});

describe("processChar", () => {
  it("ブロックコメント中は handleBlockComment にディスパッチできる", () => {
    const state = makeState({ inBlockComment: true });
    const out: string[] = [];
    processChar("*", "/", 2, out, state);
    expect(state.inBlockComment).toBe(false);
  });

  it("シングル文字列内は handleStringLiteral にディスパッチできる", () => {
    const state = makeState({ inSingle: true });
    const out: string[] = [];
    processChar("'", "", 1, out, state);
    expect(state.inSingle).toBe(false);
  });

  it("いずれにも該当しなければ handleDefault にディスパッチできる", () => {
    const state = makeState();
    const out: string[] = [];
    processChar("a", "b", 2, out, state);
    expect(out.join("")).toBe("a");
  });
});

describe("stripComments", () => {
  it("行コメント以降を空白で埋められる", () => {
    const { sanitized, inBlockComment } = stripComments(
      "const a = 1; // 旧 bg.0",
      { inBlockComment: false },
    );
    expect(inBlockComment).toBe(false);
    expect(sanitized).not.toContain("bg.0");
    expect(sanitized.startsWith("const a = 1; ")).toBe(true);
  });

  it("ブロックコメントが行をまたぐ場合は state.inBlockComment を継続できる", () => {
    const first = stripComments("/* start", { inBlockComment: false });
    expect(first.inBlockComment).toBe(true);
    const second = stripComments("still comment */ const a = 1;", {
      inBlockComment: first.inBlockComment,
    });
    expect(second.inBlockComment).toBe(false);
    expect(second.sanitized).toContain("const a = 1;");
  });

  it("文字列リテラル内の `//` はコメント開始と見做さない", () => {
    const { sanitized } = stripComments("const v = '// keep';", {
      inBlockComment: false,
    });
    expect(sanitized).toContain("// keep");
  });
});

describe("iterateMatches", () => {
  it("全マッチを onMatch コールバックで列挙できる", () => {
    const collected: string[] = [];
    iterateMatches(/foo/g, "foo bar foo baz foo", (m) => {
      collected.push(`${m.index}`);
    });
    expect(collected).toEqual(["0", "8", "16"]);
  });

  it("0 幅マッチで無限ループしない", () => {
    let count = 0;
    iterateMatches(/(?:)/g, "abc", () => {
      count += 1;
      if (count > 100) {
        throw new Error("infinite loop");
      }
    });
    expect(count).toBeLessThanOrEqual(10);
  });

  it("呼び出しのたびに RegExp の lastIndex が独立する (副作用しない)", () => {
    const pattern = /a/g;
    iterateMatches(pattern, "aaa", () => {});
    expect(pattern.lastIndex).toBe(0);
  });
});

describe("extractSanitizedLine", () => {
  it("途中行を改行を除外して切り出せる", () => {
    const file = sanitizeFile("line0\nline1\nline2\n");
    expect(
      extractSanitizedLine(file.sanitized, file.lineStartOffsets, 1),
    ).toBe("line1");
  });

  it("最終行 (改行なしで終わる) を末尾までスライスできる", () => {
    const file = sanitizeFile("a\nb");
    const lastIndex = file.lineStartOffsets.length - 1;
    expect(
      extractSanitizedLine(file.sanitized, file.lineStartOffsets, lastIndex),
    ).toBe("b");
  });

  it("空行を空文字として切り出せる", () => {
    const file = sanitizeFile("\n\n");
    expect(
      extractSanitizedLine(file.sanitized, file.lineStartOffsets, 0),
    ).toBe("");
  });
});

describe("scanFileScope / scanLineScope", () => {
  const bgKeyPattern: LintPattern = {
    name: "test-bg-key",
    description: "test",
    pattern: /\bbg\s*:\s*\{[^}]*?['"]?[0-9]['"]?\s*:/gs,
    scope: "file",
  };
  const bgDotPattern: LintPattern = {
    name: "test-bg-dot",
    description: "test",
    pattern: /\bbg\.[0-9]\b/g,
  };

  it("scanFileScope が複数行構造を検出できる", () => {
    const content = ["{", "  bg: {", '    "0": {}', "  }", "}"].join("\n");
    const fileScope = sanitizeFile(content);
    const violations: Violation[] = [];
    scanFileScope("/x/a.ts", bgKeyPattern, fileScope, violations);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.patternName).toBe("test-bg-key");
  });

  it("scanLineScope が行単位で line / column を吐ける", () => {
    const fileScope = sanitizeFile("const ok = 1;\nconst ng = 'bg.0';\n");
    const violations: Violation[] = [];
    scanLineScope("/x/a.ts", bgDotPattern, fileScope, violations);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.line).toBe(2);
    expect(violations[0]?.snippet).toBe("const ng = 'bg.0';");
  });
});

describe("scanFile", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "lint-tokens-scanfile-"));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("旧 token 参照を含むファイルで違反を返せる", () => {
    const file = join(tmpDir, "v.ts");
    writeFileSync(file, "const v = 'bg.0';\n", "utf8");
    const violations = scanFile(file, [
      {
        name: "test-bg-dot",
        description: "test",
        pattern: /\bbg\.[0-9]\b/g,
      },
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.file).toBe(file);
  });

  it("旧 token を含まないファイルでは空配列を返せる", () => {
    const file = join(tmpDir, "safe.ts");
    writeFileSync(file, "const v = 1;\n", "utf8");
    const violations = scanFile(file, [
      {
        name: "test-bg-dot",
        description: "test",
        pattern: /\bbg\.[0-9]\b/g,
      },
    ]);
    expect(violations).toEqual([]);
  });
});
