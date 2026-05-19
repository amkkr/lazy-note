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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  reportSkippedTargets,
  type ScanState,
  sanitizeFile,
  scanFile,
  scanFileScope,
  scanLineScope,
  shouldSkipEntry,
  type SkipRecord,
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

  // ====================================================================
  // skip 通知コールバック (Issue #637)
  //
  // tryStat は ENOENT / EACCES / EMFILE 等を一律 silent skip するが、
  // permission tampering を疑う場合に件数を可視化したい。
  // onSkip コールバックでパスと reason (errno code) を呼び出し側に
  // 通知できることを検証する。
  // ====================================================================
  describe("onSkip コールバック", () => {
    it("存在しないパスでは onSkip が ENOENT reason 付きで呼ばれる", () => {
      const onSkip = vi.fn();
      const missing = join(tmpDir, "missing-file");
      const result = tryStat(missing, onSkip);
      expect(result).toBeUndefined();
      expect(onSkip).toHaveBeenCalledTimes(1);
      expect(onSkip).toHaveBeenCalledWith(missing, "ENOENT");
    });

    it("broken symlink でも onSkip が ENOENT reason 付きで呼ばれる", () => {
      const onSkip = vi.fn();
      const link = join(tmpDir, "broken-link");
      symlinkSync(join(tmpDir, "nonexistent-target"), link);
      tryStat(link, onSkip);
      expect(onSkip).toHaveBeenCalledTimes(1);
      const callArgs = onSkip.mock.calls[0];
      expect(callArgs?.[0]).toBe(link);
      // ENOENT が一般的だが、OS / Node によって ELOOP 等が返る可能性も
      // 残しておく (errno code が何かしら文字列で来ることだけを保証)。
      expect(typeof callArgs?.[1]).toBe("string");
      expect(String(callArgs?.[1]).length).toBeGreaterThan(0);
    });

    it("存在するファイルでは onSkip は呼ばれない", () => {
      const file = join(tmpDir, "exists.ts");
      writeFileSync(file, "x", "utf8");
      const onSkip = vi.fn();
      tryStat(file, onSkip);
      expect(onSkip).not.toHaveBeenCalled();
    });

    it("onSkip 未指定 (省略) でも従来通り undefined を返す (silent skip)", () => {
      // 後方互換: onSkip を渡さなくても従来通り静かに skip できる。
      expect(tryStat(join(tmpDir, "missing-no-cb"))).toBeUndefined();
    });
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

  // ====================================================================
  // skip 通知コールバック伝播 (Issue #637)
  //
  // walkDirectory 内で tryStat が失敗した場合、main() 側で件数集計
  // できるよう onSkip コールバックがそのまま伝播することを検証する。
  // ====================================================================
  it("broken symlink で onSkip が呼ばれ件数集計できる", () => {
    writeFileSync(join(tmpDir, "real.ts"), "x", "utf8");
    symlinkSync(join(tmpDir, "missing-target"), join(tmpDir, "dangling"));
    const results: string[] = [];
    const onSkip = vi.fn();
    walkDirectory(tmpDir, results, onSkip);
    expect(results).toContain(join(tmpDir, "real.ts"));
    // dangling symlink 1 件分の skip 通知が来る。
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledWith(
      join(tmpDir, "dangling"),
      expect.any(String),
    );
  });

  it("onSkip 未指定でも従来通り skip 件を集めずに走査を継続する", () => {
    writeFileSync(join(tmpDir, "real.ts"), "x", "utf8");
    symlinkSync(join(tmpDir, "missing-target"), join(tmpDir, "dangling"));
    const results: string[] = [];
    expect(() => walkDirectory(tmpDir, results)).not.toThrow();
    expect(results).toContain(join(tmpDir, "real.ts"));
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

// ====================================================================
// サロゲートペア / マルチバイト文字境界条件 (Issue #656, Issue #638 を吸収)
//
// 背景:
//   `stripComments` / `processChar` / `handleStringLiteral` のステート
//   マシンは `for (let i = 0; i < line.length; i += 1)` で UTF-16
//   コードユニット単位走査する。サロゲートペア (`𠮷` = U+20BB7、絵文字
//   `🎉` = U+1F389 等) は high surrogate (0xD800-0xDBFF) + low surrogate
//   (0xDC00-0xDFFF) の 2 コードユニットに分割される。
//
//   サロゲート単体 (U+D800-U+DFFF の範囲) は ASCII クォート (U+0027
//   `'` / U+0022 `"` / U+0060 `` ` ``) ともコメント開始記号 (U+002F `/`
//   / U+002A `*`) とも一致しないため、ステート遷移を引き起こさず素通り
//   するのが正しい挙動。本テストは「**ステート崩壊が起きていない**」
//   ことを境界条件として担保する。
//
// Issue #638 重複範囲:
//   Issue #638 「日本語文字列リテラル / 絵文字でクォート開閉が崩壊しない
//   か」も本テスト群でカバーする (`'日本語'` / `"日本語"` /
//   `` `日本語` `` / `'🎉token🎉'`)。Issue #638 は本 PR で実装吸収済み
//   として close 提案する。
//
// 仕様確認 (CJK 全角クォート):
//   `「」` (U+300C / U+300D) は BMP 内の単一コードユニットだが ASCII
//   クォートではない。**ステート遷移を起こさず素通り**するのが期待
//   される挙動 (これらをクォートとして解釈してしまうと、コメント中の
//   日本語引用「これは bg.0 のこと」のような文言で stripComments が
//   崩壊し旧 token 検知に false positive / false negative が出る)。
//
// Tripwire 性の範囲に関する注意 (DA #656 フォローアップ):
//   本 describe の大半 (ケース 1-2, 4-6) は `stripComments` を経由する
//   が、現状仕様 (= UTF-16 コードユニット単位走査でもサロゲートペアが
//   境界を破壊しない) を**文書化する回帰テスト**として機能する。
//   本体走査方式を変更 (例: `for` ループ → `for...of` 化、`Array.from`
//   による code point 単位走査への切替等) しても、サロゲートペアが
//   ASCII クォート / コメント開始記号と一致しない限り依然 pass する
//   ケースが含まれるため、これらは**厳密な Tripwire ではなく、振る舞い
//   仕様の固定 (= 仕様変更時に明示的に書き換えるべき固定点)** として
//   読むこと。
//
//   一方、ケース 3 (`handleStringLiteral` 単体呼び出し) と末尾の統合
//   ケース「エスケープ + サロゲートペアを含む文字列リテラル全体を
//   stripComments で処理できる」は、`stripComments` 本体のループ
//   実装方式変更 (advance 量の解釈変化等) を `sanitized` の観測で検知
//   する**Tripwire 性**を持つ。
// ====================================================================
describe("stripComments / processChar - サロゲートペア境界", () => {
  it("サロゲートペアを含む文字列リテラルを破損せず通せる", () => {
    // `'𠮷'` (U+20BB7 サロゲートペア) を含む行が、開閉クォートを
    // 正しく検出して inBlockComment=false で完了できる。
    const { sanitized, inBlockComment } = stripComments(
      "const name = '𠮷野家';",
      { inBlockComment: false },
    );
    expect(inBlockComment).toBe(false);
    // サロゲートペアそのものが sanitized に保持される。
    expect(sanitized).toContain("𠮷野家");
    // 末尾セミコロンも保持される (= クォート開閉が正しく検出され、
    // 後続の `;` がコード領域として扱われている)。
    expect(sanitized.trimEnd().endsWith(";")).toBe(true);
  });

  it("サロゲートペアを含む行末コメントを空白で埋めても元の長さが保存される", () => {
    // `// 𠮷` 以降が空白置換され、サロゲートペアがコメント領域として
    // 正しく剥がされる。
    const original = "const a = 1; // 𠮷野家コメント";
    const { sanitized, inBlockComment } = stripComments(original, {
      inBlockComment: false,
    });
    expect(inBlockComment).toBe(false);
    expect(sanitized.startsWith("const a = 1; ")).toBe(true);
    // サロゲートペアもコメント領域なので残らない。
    expect(sanitized).not.toContain("𠮷");
    expect(sanitized).not.toContain("コメント");
    // column 不変条件: コメント剥がしは UTF-16 コードユニット単位の長さを
    // 保存する必要がある (後段の line/column 算出が `sanitized` の offset
    // に依存するため)。サロゲートペアの片割れを欠落させると 1 ずれて
    // column 整合が崩れる。
    expect(sanitized.length).toBe(original.length);
  });

  it("エスケープ後に高サロゲート / 低サロゲートが来てもステート崩壊しない", () => {
    // `\\𠮷` のように、バックスラッシュエスケープの直後に high
    // surrogate が来るケース。`handleStringLiteral` のエスケープ処理
    // (`advance: 1`) は次のコードユニットを「エスケープされた文字」
    // として消費するため、high surrogate 単体が advance 対象になる。
    // 低サロゲートが次イテレーションで素通りすることを確認する。
    const state = makeState({ inSingle: true });
    const out: string[] = [];
    // `'𠮷'` は ["'", high, low, "'"]。バックスラッシュ + high の組合せ
    // を `handleStringLiteral` 単体で再現する。
    const high = "\uD842";
    const low = "\uDFB7";
    const r1 = handleStringLiteral("\\", high, out, state, "'");
    expect(r1.advance).toBe(1);
    expect(state.inSingle).toBe(true);
    // 続く low surrogate は終端クォートでも何でもないので素通り。
    const r2 = handleStringLiteral(low, "'", out, state, "'");
    expect(r2.advance).toBe(0);
    expect(state.inSingle).toBe(true);
    expect(out.join("")).toBe(`\\${high}${low}`);
  });

  it("日本語文字列リテラル (シングル / ダブル / バッククォート) のクォート開閉を検出できる", () => {
    // Issue #638 重複範囲。3 種類のクォートで日本語文字列リテラルが
    // 正しく開閉検出されることを確認する。
    for (const quote of ["'", '"', "`"] as const) {
      const { sanitized, inBlockComment } = stripComments(
        `const v = ${quote}日本語${quote};`,
        { inBlockComment: false },
      );
      expect(inBlockComment).toBe(false);
      expect(sanitized).toContain("日本語");
      // 末尾セミコロンが残る = クォートが正しく閉じたとみなされている。
      expect(sanitized.trimEnd().endsWith(";")).toBe(true);
    }
  });

  it("絵文字 (`'🎉token🎉'`) のクォート開閉を検出できる", () => {
    // `🎉` は U+1F389 (サロゲートペア)。文字列リテラル内に複数含まれて
    // もステートマシンが崩壊せず、後続の `;` がコード領域として扱われる。
    const { sanitized, inBlockComment } = stripComments(
      "const e = '🎉token🎉';",
      { inBlockComment: false },
    );
    expect(inBlockComment).toBe(false);
    expect(sanitized).toContain("🎉token🎉");
    expect(sanitized.trimEnd().endsWith(";")).toBe(true);
  });

  it("CJK 全角クォート (`「」`) は ASCII クォート扱いされない (仕様確認)", () => {
    // `「` (U+300C) / `」` (U+300D) は ASCII シングル / ダブル / バック
    // クォートとは別の Unicode コードポイント。ステート遷移を起こさず
    // 素通りすべきで、続く `// 旧 bg.0` が**行コメントとして剥がされる**
    // ことが期待される (= 全角クォートを文字列リテラル開始と誤判定して
    // 行コメントを保持してしまうと false negative になる)。
    const { sanitized, inBlockComment } = stripComments(
      "const v = 「日本語」; // 旧 bg.0",
      { inBlockComment: false },
    );
    expect(inBlockComment).toBe(false);
    // 全角クォート自体はコード領域として保持される (≒ 元の文字列が残る)。
    expect(sanitized).toContain("「日本語」");
    // `// 旧 bg.0` 以降は空白置換されるため `bg.0` は sanitized に残らない。
    expect(sanitized).not.toContain("bg.0");
    expect(sanitized).not.toContain("旧");
  });

  it("エスケープ + サロゲートペアを含む文字列リテラル全体を stripComments で処理できる (統合 Tripwire)", () => {
    // DA #656 フォローアップ: ケース 3 は `handleStringLiteral` を内部
    // API として単体呼び出しするため、`stripComments` 本体のループ実装
    // 方式変更 (例: `for...of` 化 / `Array.from` による code point 単位
    // 走査への切替 / advance 量解釈の取り違え) からは切り離されている。
    //
    // 本ケースは「エスケープ (`\\`) + サロゲートペア (`𠮷`)」を含む
    // 文字列リテラル全体を `stripComments` レベルで処理し、`sanitized`
    // の文字列観測でステート遷移が崩壊していないことを担保する統合
    // Tripwire として機能する。本体走査方式を変更した場合、
    // `handleStringLiteral` の advance:1 解釈が UTF-16 / code point の
    // どちらに基づくかでサロゲートペアの片割れが境界外にずれ、終端
    // クォート検出が崩壊するため、本ケースが regression を fail で
    // 検知する。
    const original = "const v = '\\𠮷野家';";
    const { sanitized, inBlockComment } = stripComments(original, {
      inBlockComment: false,
    });
    expect(inBlockComment).toBe(false);
    // エスケープ + サロゲートペアが sanitized に保持される
    // (= ステート遷移が崩れていない / クォート終端検出が成立している)。
    expect(sanitized).toContain("\\𠮷野家");
    // 末尾セミコロンが残る = 終端クォートを正しく検出してコード領域に
    // 復帰している。
    expect(sanitized.trimEnd().endsWith(";")).toBe(true);
    // column 不変条件: `stripComments` は長さ保存が前提なので、
    // サロゲートペア境界で 1 ずれていないことを併せて担保する。
    expect(sanitized.length).toBe(original.length);
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
    expect(extractSanitizedLine(file.sanitized, file.lineStartOffsets, 1)).toBe(
      "line1",
    );
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
    expect(extractSanitizedLine(file.sanitized, file.lineStartOffsets, 0)).toBe(
      "",
    );
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

// ====================================================================
// reportSkippedTargets (Issue #637)
//
// main() 末尾で呼ばれる skip 件数ログ出力の挙動を検証する。
// - 件数 0 のときは何も出さない (通常 CI ログのノイズを増やさない)
// - 件数 > 0 のときは件数行 + 各 skip パス / reason を warn ログとして出す
// ====================================================================
describe("reportSkippedTargets", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("skip 件数 0 のときは console.warn を呼ばない", () => {
    reportSkippedTargets([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("skip 件数 > 0 のときは件数行 + パス / reason を warn 出力できる", () => {
    const skipped: SkipRecord[] = [
      { path: "/repo/src/a.ts", reason: "EACCES" },
      { path: "/repo/src/b.ts", reason: "EMFILE" },
    ];
    reportSkippedTargets(skipped);
    // 件数行 1 + 各 skip 1 行ずつ = 計 3 回呼ばれる。
    expect(warnSpy).toHaveBeenCalledTimes(3);
    // 件数行に件数が含まれること。
    const headerCall = warnSpy.mock.calls[0]?.[0];
    expect(String(headerCall)).toContain("2 path(s) skipped");
    // 各 skip 行に reason とパス (の一部) が含まれること。
    const detailCalls = warnSpy.mock.calls
      .slice(1)
      .map((c: unknown[]) => String(c[0]));
    expect(detailCalls.join("\n")).toContain("EACCES");
    expect(detailCalls.join("\n")).toContain("EMFILE");
    expect(detailCalls.join("\n")).toContain("a.ts");
    expect(detailCalls.join("\n")).toContain("b.ts");
  });
});
