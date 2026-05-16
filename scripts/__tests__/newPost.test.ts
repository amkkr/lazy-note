/**
 * scripts/newPost.ts のテスト (Anchor / Cast)
 *
 * 設計書: epic #487 / Issue #490
 *
 * 検証対象:
 *   - 火種 HTML コメントの構築 (buildIgnitionComment)
 *   - 火種コメントが marked → sanitizePostHtml を通すと除去されることの回帰
 *     (Issue #490 の最重要 AC: 公開ページに火種が出ない)
 *   - milestones.json の読み込み (存在時 / 不在時 / 不正値混入時)
 *   - milestones.json 現状サマリの整形 (formatMilestonesSummary)
 *   - 直近記事タイトル抽出 (extractMarkdownTitle / findPreviousPost)
 *   - 最古記事フォールバック (computeSiteOpeningFallback)
 *   - HTML コメント境界エスケープ (escapeHtmlCommentLabel)
 *   - 完全な .md 出力フォーマット (buildPostMarkdown)
 *
 * テスト方針:
 *   - t-wada 的 TDD で振る舞い単位を 1 ケースずつ書く
 *   - 一時ディレクトリを作って fs に対するテストを行う
 *   - 外部ライブラリ (marked / dompurify) の挙動はモックせず実物を呼ぶ
 *     (sanitizePostHtml を実際に通過させて回帰確認するため)
 */

import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { marked } from "marked";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Milestone } from "../../src/lib/anchors.ts";
import { sanitizePostHtml } from "../../src/lib/sanitize.ts";
import {
  buildIgnitionComment,
  buildPostMarkdown,
  computeSiteOpeningFallback,
  type EnforceAnchorDiscriminatorField_ForTest,
  type EnforceAnchorDiscriminatorFields_ForTest,
  escapeHtmlCommentLabel,
  extractMarkdownTitle,
  findPreviousPost,
  formatMilestonesSummary,
  type HasAnchorDiscriminator_ForTest,
  type IgnitionInput,
  type IsAnchorShape_ForTest,
  listPostFileNames,
  loadMilestones,
} from "../newPost.ts";
import type { Coordinate, Elapsed } from "../../src/lib/anchors.ts";

// =============================================================================
// 一時ディレクトリ用ヘルパ
// =============================================================================

const createTempDir = (): string => {
  return mkdtempSync(join(tmpdir(), "newpost-test-"));
};

const removeTempDir = (path: string): void => {
  rmSync(path, { recursive: true, force: true });
};

// =============================================================================
// escapeHtmlCommentLabel
// =============================================================================

describe("escapeHtmlCommentLabel: HTML コメント終端の偶発生成を防ぐ", () => {
  it("`--` を含まないラベルはそのまま返す", () => {
    expect(escapeHtmlCommentLabel("社会復帰")).toBe("社会復帰");
  });

  it("ラベル内の `--` を `- -` に分解する", () => {
    expect(escapeHtmlCommentLabel("a--b")).toBe("a- -b");
  });

  it("`-->` を含むラベルでもコメント終端を作らない", () => {
    const escaped = escapeHtmlCommentLabel("foo-->bar");
    expect(escaped).not.toContain("-->");
  });

  it("複数箇所の `--` をすべて置換する", () => {
    expect(escapeHtmlCommentLabel("a--b--c")).toBe("a- -b- -c");
  });
});

// =============================================================================
// buildIgnitionComment
// =============================================================================

describe("buildIgnitionComment: 火種 HTML コメントの構築", () => {
  it("座標が 1 件あれば `・ラベルから N 日目` 形式の行を含む", () => {
    const result = buildIgnitionComment({
      coordinates: [{ kind: "coordinate", label: "社会復帰", tone: "neutral", daysSince: 100 }],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-04-11T12:00:00+09:00",
    });
    expect(result).toContain("・社会復帰から 100 日目");
  });

  it("HTML コメント `<!--` と `-->` で囲まれている", () => {
    const result = buildIgnitionComment({
      coordinates: [{ kind: "coordinate", label: "社会復帰", tone: "neutral", daysSince: 1 }],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-02T12:00:00+09:00",
    });
    expect(result.startsWith("<!--")).toBe(true);
    expect(result.includes("-->\n")).toBe(true);
  });

  it("tone:heavy の節目に [重い節目] マークを付ける", () => {
    const result = buildIgnitionComment({
      coordinates: [{ kind: "coordinate", label: "喪失体験", tone: "heavy", daysSince: 365 }],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2026-01-01T12:00:00+09:00",
    });
    expect(result).toContain("・喪失体験から 365 日目 [重い節目]");
  });

  it("tone:neutral / light には特別マークを付けない", () => {
    const result = buildIgnitionComment({
      coordinates: [
        { kind: "coordinate", label: "サイト開設", tone: "neutral", daysSince: 10 },
        { kind: "coordinate", label: "節目イベント", tone: "light", daysSince: 5 },
      ],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-10T12:00:00+09:00",
    });
    expect(result).not.toContain("サイト開設から 10 日目 [");
    expect(result).not.toContain("節目イベントから 5 日目 [");
  });

  it("座標が空かつ siteOpeningElapsed/previousPost も null なら空文字列を返す", () => {
    const result = buildIgnitionComment({
      coordinates: [],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-01T12:00:00+09:00",
    });
    expect(result).toBe("");
  });

  it("siteOpeningElapsed (フォールバック) があるとサイト開設行を含む", () => {
    const result = buildIgnitionComment({
      coordinates: [],
      siteOpeningElapsed: { kind: "elapsed", label: "サイト開設", daysSince: 42 },
      previousPost: null,
      publishedAt: "2025-10-01T12:00:00+09:00",
    });
    expect(result).toContain("・サイト開設から 42 日目");
  });

  it("previousPost があると `・前回の記事「(タイトル)」から N 日` 行を含む", () => {
    const result = buildIgnitionComment({
      coordinates: [],
      siteOpeningElapsed: null,
      previousPost: {
        fileName: "20250101120000.md",
        title: "テスト記事",
        publishedAt: "2025-01-01T12:00:00+09:00",
      },
      publishedAt: "2025-01-11T12:00:00+09:00",
    });
    expect(result).toContain("・前回の記事「テスト記事」から 10 日");
  });

  it("ラベル内の `-->` を埋め込んでも HTML コメントが壊れない", () => {
    const result = buildIgnitionComment({
      coordinates: [
        { kind: "coordinate", label: "悪意-->ラベル", tone: "neutral", daysSince: 1 },
      ],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-02T12:00:00+09:00",
    });
    // 構造: <!-- ... -->\n しか終端が無いこと
    const closeOccurrences = result.match(/-->/g) ?? [];
    expect(closeOccurrences).toHaveLength(1);
  });

  it("previousPost.title 内の `-->` も同様にエスケープされる", () => {
    const result = buildIgnitionComment({
      coordinates: [],
      siteOpeningElapsed: null,
      previousPost: {
        fileName: "20250101120000.md",
        title: "破壊-->タイトル",
        publishedAt: "2025-01-01T12:00:00+09:00",
      },
      publishedAt: "2025-01-02T12:00:00+09:00",
    });
    const closeOccurrences = result.match(/-->/g) ?? [];
    expect(closeOccurrences).toHaveLength(1);
  });

  it("Cast の呼び水文 (一行目の呼び水) が含まれる", () => {
    const result = buildIgnitionComment({
      coordinates: [{ kind: "coordinate", label: "社会復帰", tone: "neutral", daysSince: 1 }],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-02T12:00:00+09:00",
    });
    expect(result).toContain(
      "この座標を一行目の呼び水にしてもいいし、消してもいい。",
    );
  });

  it("末尾が `-->\\n\\n` で終わり後続セクションとの間に空行が確保される", () => {
    // `buildPostMarkdown` で `${ignitionComment}## 本文` と直接連結するため、
    // ここで末尾に空行を 1 つ含めておくことで `-->` と `## 本文` が密着しない。
    const result = buildIgnitionComment({
      coordinates: [{ kind: "coordinate", label: "社会復帰", tone: "neutral", daysSince: 1 }],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-02T12:00:00+09:00",
    });
    expect(result.endsWith("-->\n\n")).toBe(true);
  });
});

// =============================================================================
// 公開ページに火種が出ないことの回帰 (最重要 AC)
// =============================================================================

describe("公開ページ非露出の回帰: marked → sanitizePostHtml を通すと火種は除去される", () => {
  it("火種コメントを含む Markdown を marked → sanitizePostHtml に通すと火種文字列が残らない", () => {
    const ignition = buildIgnitionComment({
      coordinates: [
        { kind: "coordinate", label: "社会復帰", tone: "neutral", daysSince: 100 },
        { kind: "coordinate", label: "喪失体験", tone: "heavy", daysSince: 365 },
      ],
      siteOpeningElapsed: null,
      previousPost: {
        fileName: "20250101120000.md",
        title: "前の記事",
        publishedAt: "2025-01-01T12:00:00+09:00",
      },
      publishedAt: "2025-04-11T12:00:00+09:00",
    });
    const markdown = buildPostMarkdown({
      displayDate: "2025/04/11 12:00",
      authorName: "test-author",
      ignitionComment: ignition,
    });

    // marked は HTML コメントをそのまま出力に残す (本 Issue の前提)
    const html = marked.parse(markdown) as string;
    expect(html).toContain("Anchor / Cast");
    expect(html).toContain("社会復帰から 100 日目");

    // sanitizePostHtml (DOMPurify) は HTML コメントを除去する
    const sanitized = sanitizePostHtml(html);
    expect(sanitized).not.toContain("Anchor / Cast");
    expect(sanitized).not.toContain("社会復帰から 100 日目");
    expect(sanitized).not.toContain("喪失体験から 365 日目");
    expect(sanitized).not.toContain("前回の記事");
    // コメントマーカー自体も残らない
    expect(sanitized).not.toContain("<!--");
    expect(sanitized).not.toContain("-->");
  });

  it("火種以外の本文 (見出し / 段落) は sanitizePostHtml 通過後も保持される", () => {
    const ignition = buildIgnitionComment({
      coordinates: [{ kind: "coordinate", label: "社会復帰", tone: "neutral", daysSince: 1 }],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-02T12:00:00+09:00",
    });
    const markdown = buildPostMarkdown({
      displayDate: "2025/01/02 12:00",
      authorName: "tester",
      ignitionComment: ignition,
    });
    const html = marked.parse(markdown) as string;
    const sanitized = sanitizePostHtml(html);

    // 既存の出力項目が壊れていない
    expect(sanitized).toContain("新しい記事のタイトル");
    expect(sanitized).toContain("投稿日時");
    expect(sanitized).toContain("筆者名");
    expect(sanitized).toContain("本文");
    expect(sanitized).toContain("記事の内容をここに書きます");
  });
});

// =============================================================================
// loadMilestones
// =============================================================================

describe("loadMilestones: milestones.json の読み込み", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  it("ファイルが存在しないと null を返す", () => {
    const result = loadMilestones(join(tempDir, "milestones.json"));
    expect(result).toBeNull();
  });

  it("空配列が書かれている場合は空配列を返す (null ではない)", () => {
    const path = join(tempDir, "milestones.json");
    writeFileSync(path, "[]", "utf8");
    expect(loadMilestones(path)).toEqual([]);
  });

  it("正常な節目 1 件をパースできる", () => {
    const path = join(tempDir, "milestones.json");
    const data: Milestone[] = [
      { date: "2025-01-01", label: "社会復帰", tone: "neutral" },
    ];
    writeFileSync(path, JSON.stringify(data), "utf8");
    expect(loadMilestones(path)).toEqual(data);
  });

  it("複数の節目をすべてパースできる", () => {
    const path = join(tempDir, "milestones.json");
    const data: Milestone[] = [
      { date: "2025-01-01", label: "社会復帰", tone: "neutral" },
      { date: "2025-08-26", label: "サイト開設", tone: "light" },
      { date: "2025-12-01", label: "喪失体験", tone: "heavy" },
    ];
    writeFileSync(path, JSON.stringify(data), "utf8");
    expect(loadMilestones(path)).toEqual(data);
  });

  it("不正な JSON は空配列にフォールバックする", () => {
    const path = join(tempDir, "milestones.json");
    writeFileSync(path, "not a json", "utf8");
    expect(loadMilestones(path)).toEqual([]);
  });

  it("配列でないルートは空配列にフォールバックする", () => {
    const path = join(tempDir, "milestones.json");
    writeFileSync(path, '{"foo":"bar"}', "utf8");
    expect(loadMilestones(path)).toEqual([]);
  });

  it("date が文字列でない要素は除外する", () => {
    const path = join(tempDir, "milestones.json");
    const data = [
      { date: 12345, label: "bad", tone: "neutral" },
      { date: "2025-01-01", label: "good", tone: "neutral" },
    ];
    writeFileSync(path, JSON.stringify(data), "utf8");
    const result = loadMilestones(path);
    expect(result).toHaveLength(1);
    expect(result?.[0].label).toBe("good");
  });

  it("tone が許容値外の要素は除外する", () => {
    const path = join(tempDir, "milestones.json");
    const data = [
      { date: "2025-01-01", label: "invalid-tone", tone: "extreme" },
      { date: "2025-01-02", label: "valid", tone: "light" },
    ];
    writeFileSync(path, JSON.stringify(data), "utf8");
    const result = loadMilestones(path);
    expect(result).toHaveLength(1);
    expect(result?.[0].label).toBe("valid");
  });
});

// =============================================================================
// formatMilestonesSummary
// =============================================================================

describe("formatMilestonesSummary: 現状サマリの整形", () => {
  it("milestones が null なら未作成を案内する文言を返す", () => {
    const result = formatMilestonesSummary(null);
    expect(result).toContain("milestones.json は未作成");
  });

  it("milestones が空配列なら空であることを案内する", () => {
    const result = formatMilestonesSummary([]);
    expect(result).toContain("milestones.json は空");
  });

  it("登録件数を含むサマリを返す", () => {
    const result = formatMilestonesSummary([
      { date: "2025-01-01", label: "社会復帰", tone: "neutral" },
      { date: "2025-08-26", label: "サイト開設", tone: "light" },
    ]);
    expect(result).toContain("2 件");
    expect(result).toContain("社会復帰");
    expect(result).toContain("サイト開設");
  });

  it("tone:heavy には [重い節目] マークを付ける", () => {
    const result = formatMilestonesSummary([
      { date: "2025-12-01", label: "喪失体験", tone: "heavy" },
    ]);
    expect(result).toContain("[重い節目]");
  });

  it("tone:light には [軽め] マークを付ける", () => {
    const result = formatMilestonesSummary([
      { date: "2025-08-26", label: "サイト開設", tone: "light" },
    ]);
    expect(result).toContain("[軽め]");
  });

  it("tone:neutral には特別マークを付けない", () => {
    const result = formatMilestonesSummary([
      { date: "2025-01-01", label: "社会復帰", tone: "neutral" },
    ]);
    expect(result).not.toContain("[重い節目]");
    expect(result).not.toContain("[軽め]");
  });
});

// =============================================================================
// listPostFileNames
// =============================================================================

describe("listPostFileNames: YYYYMMDDhhmmss.md ファイル一覧の取得", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  it("ディレクトリ不在なら空配列を返す", () => {
    const result = listPostFileNames(join(tempDir, "nonexistent"));
    expect(result).toEqual([]);
  });

  it("命名規約外のファイル (README.md / images/) は除外する", () => {
    writeFileSync(join(tempDir, "README.md"), "x", "utf8");
    writeFileSync(join(tempDir, "20250101120000.md"), "x", "utf8");
    mkdirSync(join(tempDir, "images"));
    const result = listPostFileNames(tempDir);
    expect(result).toEqual(["20250101120000.md"]);
  });

  it("文字列昇順でソートされる", () => {
    writeFileSync(join(tempDir, "20260101120000.md"), "x", "utf8");
    writeFileSync(join(tempDir, "20250101120000.md"), "x", "utf8");
    writeFileSync(join(tempDir, "20251231120000.md"), "x", "utf8");
    const result = listPostFileNames(tempDir);
    expect(result).toEqual([
      "20250101120000.md",
      "20251231120000.md",
      "20260101120000.md",
    ]);
  });
});

// =============================================================================
// extractMarkdownTitle
// =============================================================================

describe("extractMarkdownTitle: 1 行目 H1 タイトルの抽出", () => {
  it("先頭の `# タイトル` 行からタイトルを返す", () => {
    expect(extractMarkdownTitle("# テスト記事\n\n本文", "fallback.md")).toBe(
      "テスト記事",
    );
  });

  it("CRLF 改行でもタイトルを抽出できる", () => {
    expect(extractMarkdownTitle("# CRLF\r\n本文", "fallback.md")).toBe("CRLF");
  });

  it("途中の `# 見出し` も最初の見出しが採用される", () => {
    expect(
      extractMarkdownTitle("\n\n# 最初\n# 二番目", "fallback.md"),
    ).toBe("最初");
  });

  it("H1 が無ければファイル名 (拡張子なし) を返す", () => {
    expect(extractMarkdownTitle("本文のみ", "20250101120000.md")).toBe(
      "20250101120000",
    );
  });

  it("`## H2 のみ` の場合は H1 と認めずファイル名を返す", () => {
    expect(extractMarkdownTitle("## H2\n本文", "20250101120000.md")).toBe(
      "20250101120000",
    );
  });
});

// =============================================================================
// findPreviousPost
// =============================================================================

describe("findPreviousPost: 直近の既存記事を検出", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  it("既存記事が無い場合は null を返す", () => {
    const result = findPreviousPost(tempDir, "20260515091200.md");
    expect(result).toBeNull();
  });

  it("最新の既存記事のタイトルと日付を返す", () => {
    writeFileSync(
      join(tempDir, "20250101120000.md"),
      "# 旧い記事\n本文",
      "utf8",
    );
    writeFileSync(
      join(tempDir, "20260307120000.md"),
      "# 直近の記事\n本文",
      "utf8",
    );
    const result = findPreviousPost(tempDir, "20260515091200.md");
    expect(result).toEqual({
      fileName: "20260307120000.md",
      title: "直近の記事",
      publishedAt: "2026-03-07T12:00:00+09:00",
    });
  });

  it("自分自身より新しいファイルは候補から除外する", () => {
    writeFileSync(
      join(tempDir, "20250101120000.md"),
      "# 旧い\n本文",
      "utf8",
    );
    writeFileSync(
      join(tempDir, "20270101120000.md"),
      "# 未来\n本文",
      "utf8",
    );
    const result = findPreviousPost(tempDir, "20260515091200.md");
    expect(result?.fileName).toBe("20250101120000.md");
  });
});

// =============================================================================
// computeSiteOpeningFallback
// =============================================================================

describe("computeSiteOpeningFallback: milestones.json 不在時のサイト開設フォールバック", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    removeTempDir(tempDir);
  });

  it("既存記事が無いと null を返す", () => {
    const result = computeSiteOpeningFallback(
      tempDir,
      "2026-05-15T09:12:00+09:00",
    );
    expect(result).toBeNull();
  });

  it("最古記事日付からの経過日数を サイト開設 ラベルで返す", () => {
    writeFileSync(
      join(tempDir, "20250101120000.md"),
      "# 最古\n",
      "utf8",
    );
    writeFileSync(
      join(tempDir, "20250110120000.md"),
      "# あと\n",
      "utf8",
    );
    const result = computeSiteOpeningFallback(
      tempDir,
      "2025-01-11T12:00:00+09:00",
    );
    expect(result).toEqual({
      kind: "elapsed",
      label: "サイト開設",
      daysSince: 10,
    });
  });
});

// =============================================================================
// buildPostMarkdown
// =============================================================================

describe("buildPostMarkdown: 完全な .md 出力", () => {
  it("既存の出力項目 (タイトル / 投稿日時 / 筆者名 / 本文) を維持する", () => {
    const result = buildPostMarkdown({
      displayDate: "2025/01/01 12:00",
      authorName: "amkkr",
      ignitionComment: "",
    });
    expect(result).toContain("# 新しい記事のタイトル");
    expect(result).toContain("## 投稿日時");
    expect(result).toContain("- 2025/01/01 12:00");
    expect(result).toContain("## 筆者名");
    expect(result).toContain("- amkkr");
    expect(result).toContain("## 本文");
    expect(result).toContain("記事の内容をここに書きます。");
  });

  it("火種コメントが本文セクション直前に挿入される", () => {
    const ignition = "<!-- ignition -->\n";
    const result = buildPostMarkdown({
      displayDate: "2025/01/01 12:00",
      authorName: "amkkr",
      ignitionComment: ignition,
    });
    const ignitionIndex = result.indexOf("<!-- ignition -->");
    const honbunIndex = result.indexOf("## 本文");
    const authorIndex = result.indexOf("## 筆者名");
    expect(ignitionIndex).toBeGreaterThan(-1);
    expect(ignitionIndex).toBeGreaterThan(authorIndex);
    expect(ignitionIndex).toBeLessThan(honbunIndex);
  });

  it("ignitionComment が空文字列なら火種が挿入されない", () => {
    const result = buildPostMarkdown({
      displayDate: "2025/01/01 12:00",
      authorName: "amkkr",
      ignitionComment: "",
    });
    expect(result).not.toContain("<!--");
  });

  it("火種コメント終端 `-->` と `## 本文` の間に空行 1 つを確保する", () => {
    // buildIgnitionComment が末尾に `-->\n\n` を返す前提と組み合わさり、
    // `-->` の直後に空行が 1 行入った状態で `## 本文` が続くことを担保。
    // Markdown を直接開いたときの視認性と marked のブロック分割を両立する。
    const ignition = buildIgnitionComment({
      coordinates: [{ kind: "coordinate", label: "社会復帰", tone: "neutral", daysSince: 1 }],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-02T12:00:00+09:00",
    });
    const result = buildPostMarkdown({
      displayDate: "2025/01/02 12:00",
      authorName: "amkkr",
      ignitionComment: ignition,
    });
    expect(result).toContain("-->\n\n## 本文");
    expect(result).not.toContain("-->## 本文");
    expect(result).not.toContain("-->\n## 本文");
  });
});

// =============================================================================
// 型レベルテスト: IgnitionInput.coordinates の discriminator 化 (Issue #523)
// =============================================================================
//
// 目的: PR #499 で `Coordinate` / `Elapsed` 自体に `kind` discriminator を導入
// した nominal 化 (Issue #497) と、Issue #523 で `IgnitionInput.coordinates`
// を `readonly Coordinate[]` に統一した変更の両方を、型レベルで回帰固定する。
//
// 背景: Issue #523 以前は `coordinates: { label, tone, daysSince }[]` という
// 構造的リテラル型で受けていたため、(1) `kind` 欠落リテラルが通る、(2)
// `kind: "elapsed"` の Elapsed と取り違えても気付けない、という抜けがあった。
// 本テスト群はこれらの回帰を `@ts-expect-error` で固定する。
//
// 検証手段: `// @ts-expect-error` ディレクティブは型エラーが発生しなければ
// 「Unused @ts-expect-error directive」として `pnpm type-check:test` が失敗
// するため、回帰テストとして機能する (`anchors.test.ts` の Issue #497 型レベル
// テストと同様の方式)。実行時アサーションは行わない。
describe("型レベル: IgnitionInput.coordinates の discriminator 化 (Issue #523)", () => {
  it("kind を持たないリテラル要素を coordinates に渡すとコンパイルエラーになる", () => {
    const input: IgnitionInput = {
      coordinates: [
        // @ts-expect-error - discriminator `kind` が欠落しているため
        // Coordinate として代入できない (Issue #523 で readonly Coordinate[]
        // に統一した回帰防止: 構造的 { label, tone, daysSince }[] に戻ると
        // このディレクティブが unused になり type-check:test が失敗する)
        { label: "x", tone: "neutral", daysSince: 1 },
      ],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-01T12:00:00+09:00",
    };

    void input;
  });

  it("kind: \"elapsed\" の要素を coordinates に渡すとコンパイルエラーになる (Coordinate / Elapsed の取り違え検出)", () => {
    const input: IgnitionInput = {
      coordinates: [
        // @ts-expect-error - kind: "elapsed" は Elapsed であり Coordinate
        // (kind: "coordinate") とは discriminator が一致しないため
        // coordinates 要素には代入できない (Issue #523)
        { kind: "elapsed", label: "x", daysSince: 1 },
      ],
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-01T12:00:00+09:00",
    };

    void input;
  });

  it("構造的 { label, tone, daysSince }[] 配列リテラルを coordinates に代入できない", () => {
    // Issue #523 以前の形 (`readonly { label, tone, daysSince }[]`) に再構築
    // した配列を一旦変数で受け、`IgnitionInput` への代入で弾かれることを確認。
    // これにより「coordinates の型を構造的リテラルへ戻す」リファクタを
    // ピンポイントで検出できる。
    const looseCoordinates: readonly {
      label: string;
      tone: "neutral";
      daysSince: number;
    }[] = [{ label: "x", tone: "neutral", daysSince: 1 }];

    const input: IgnitionInput = {
      // @ts-expect-error - 構造的リテラル型は discriminator `kind` を持たない
      // ため readonly Coordinate[] には代入できない (Issue #523 回帰防止)
      coordinates: looseCoordinates,
      siteOpeningElapsed: null,
      previousPost: null,
      publishedAt: "2025-01-01T12:00:00+09:00",
    };

    void input;
  });
});

// =============================================================================
// 型レベル: Anchor field 構造的縮退の予防ガード (Issue #556)
// =============================================================================
//
// 目的: PR #555 (Issue #523) の DA レビュー F2 で指摘された follow-up を
// 解決する。`IgnitionInput` に「将来 Coordinate / Elapsed を含む新フィールド
// (例: `resurfaceCoordinates: readonly Coordinate[]`) を追加するとき」に、
// `kind` discriminator を欠いた構造的リテラル型で書いてしまうと型エラーに
// なる仕組みを `EnforceAnchorDiscriminatorFields_ForTest` として持っている
// ことを、型レベルで回帰固定する。
//
// 検証手段: Issue #523 と同じ `@ts-expect-error` パターン。ガードロジックの
// Conditional Type が「Anchor 型らしい (label + daysSince) のに kind を
// 欠いている」フィールドを `never` に潰すことで、`IgnitionInput` への代入が
// 不可能になることを利用する。
//
// 本 Issue で導入したヘルパ (`IsAnchorShape_ForTest` 等) はテスト専用 export
// として扱い、本体 `IgnitionInput` の interface 定義はそのまま維持する。
// これにより既存呼び出し側 (scripts/newPost.ts 自身および 12 ヶ所のテスト)
// との完全な後方互換を保つ。
describe("型レベル: Anchor field 構造的縮退の予防ガード (Issue #556)", () => {
  it("正規の Coordinate / Elapsed を含む shape は `EnforceAnchorDiscriminatorFields_ForTest` を通過する (= IgnitionInput と互換)", () => {
    // 現行の `IgnitionInput` 自身が、ガードを通したあとの型と互換である
    // ことを `extends` で確認する。
    // (ガードが壊れて余分なフィールドを `never` に潰すと、この代入が
    //  unused @ts-expect-error 化されて type-check:test が失敗する)
    type GuardedIgnitionInput =
      EnforceAnchorDiscriminatorFields_ForTest<IgnitionInput>;
    const guarded: GuardedIgnitionInput = {
      coordinates: [
        { kind: "coordinate", label: "x", tone: "neutral", daysSince: 1 },
      ],
      siteOpeningElapsed: { kind: "elapsed", label: "y", daysSince: 2 },
      previousPost: null,
      publishedAt: "2025-01-01T12:00:00+09:00",
    };

    // 現行 IgnitionInput をそのまま代入できる ≒ ガードが既存 shape を
    // 何ら壊していないこと。
    const input: IgnitionInput = guarded;
    void input;
  });

  it("Coordinate 単独要素は `kind` discriminator を持つため `IsAnchorShape_ForTest` + `HasAnchorDiscriminator_ForTest` の両方を通過する", () => {
    // 「Anchor 型らしい (label + daysSince)」かつ「discriminator を持つ」=
    // ガード判定上 ESCAPABLE な要素であることを型レベルで固定。
    type IsShape = IsAnchorShape_ForTest<Coordinate>;
    type HasKind = HasAnchorDiscriminator_ForTest<Coordinate>;
    const isShape: IsShape = true;
    const hasKind: HasKind = true;
    void isShape;
    void hasKind;
  });

  it("Elapsed 単独要素も同様に `IsAnchorShape_ForTest` + `HasAnchorDiscriminator_ForTest` の両方を通過する", () => {
    type IsShape = IsAnchorShape_ForTest<Elapsed>;
    type HasKind = HasAnchorDiscriminator_ForTest<Elapsed>;
    const isShape: IsShape = true;
    const hasKind: HasKind = true;
    void isShape;
    void hasKind;
  });

  it("構造的リテラル `{ label, tone, daysSince }` (Anchor 型らしいが kind 欠落) は `HasAnchorDiscriminator_ForTest` で false 判定される", () => {
    type LooseCoord = {
      readonly label: string;
      readonly tone: "neutral";
      readonly daysSince: number;
    };
    type IsShape = IsAnchorShape_ForTest<LooseCoord>;
    type HasKind = HasAnchorDiscriminator_ForTest<LooseCoord>;
    // Anchor 型らしい (label + daysSince を持つ) と判定される
    const isShape: IsShape = true;
    // しかし kind discriminator が無いため false
    const hasKind: HasKind = false;
    void isShape;
    void hasKind;
  });

  it("`kind: string` (wide string) では `HasAnchorDiscriminator_ForTest` が false を返す (string literal narrowing 必須)", () => {
    // `kind: string` を許容してしまうと「kind 必須」のはずが any string で
    // 通ってしまい構造的縮退に逆戻りする。string literal narrowing が
    // 必須であることをガードロジックの仕様として固定する。
    type WideKindCoord = {
      readonly kind: string;
      readonly label: string;
      readonly tone: "neutral";
      readonly daysSince: number;
    };
    type HasKind = HasAnchorDiscriminator_ForTest<WideKindCoord>;
    const hasKind: HasKind = false;
    void hasKind;
  });

  it("Anchor 型と無関係なフィールド型 (`string` / `PreviousPost`) には何も制約を課さない", () => {
    // ガードは「Anchor 型らしい」フィールドにのみ作用する。Anchor 型と
    // 構造が違うフィールド (publishedAt: string / previousPost: object) は
    // そのまま通過する。これにより `IgnitionInput` 拡張時に Anchor 型と
    // 無関係な新フィールド (例: `siteVersion: string`) を追加する自由は
    // 維持される。
    type PassThroughString =
      EnforceAnchorDiscriminatorField_ForTest<string>;
    type PassThroughPreviousPost = EnforceAnchorDiscriminatorField_ForTest<{
      readonly fileName: string;
      readonly title: string;
      readonly publishedAt: string;
    }>;
    const s: PassThroughString = "x";
    const p: PassThroughPreviousPost = {
      fileName: "a.md",
      title: "t",
      publishedAt: "2025-01-01T12:00:00+09:00",
    };
    void s;
    void p;
  });

  it("新フィールド (例: `resurfaceCoordinates`) を `IgnitionInput` 風の interface に追加する想定で、Anchor 型を import すれば通過する", () => {
    // Issue #556 の想定シナリオ:
    //   IgnitionInput に `resurfaceCoordinates: readonly Coordinate[]` を
    //   追加する場合、`Coordinate` 型を import していればガードを通る。
    interface FutureIgnitionInput {
      readonly coordinates: readonly Coordinate[];
      readonly resurfaceCoordinates: readonly Coordinate[];
      readonly siteOpeningElapsed: Elapsed | null;
      readonly publishedAt: string;
    }
    // ガードを通した結果が元と一致する = 構造的に Anchor 型らしいフィールド
    // がすべて kind 必須を満たしている。
    type Guarded = EnforceAnchorDiscriminatorFields_ForTest<FutureIgnitionInput>;
    const ok: Guarded = {
      coordinates: [
        { kind: "coordinate", label: "x", tone: "neutral", daysSince: 1 },
      ],
      resurfaceCoordinates: [
        { kind: "coordinate", label: "y", tone: "light", daysSince: 2 },
      ],
      siteOpeningElapsed: null,
      publishedAt: "2025-01-01T12:00:00+09:00",
    };
    void ok;
  });

  it("新フィールドを `Coordinate` を import せず構造的リテラル `{ label, tone, daysSince }[]` で宣言した場合、ガードはそのフィールド型を `never` に潰す", () => {
    // Issue #556 の中心 AC:
    //   新フィールド追加時に Anchor 型を import せず構造的リテラルで
    //   書いてしまうと、ガードがそのフィールドを `never` に潰す。
    //   never[] への代入は不可能なので、開発者は型エラーで気付ける。
    interface BadFutureIgnitionInput {
      readonly resurfaceCoordinates: readonly {
        label: string;
        tone: "neutral";
        daysSince: number;
      }[];
    }
    type Guarded =
      EnforceAnchorDiscriminatorFields_ForTest<BadFutureIgnitionInput>;
    // ガード適用後 `resurfaceCoordinates` は `readonly never[]` に潰される
    // ため、構造的リテラル値の代入は失敗する。
    const bad: Guarded = {
      // @ts-expect-error - kind 欠落の構造的リテラル型は never[] に
      // 潰されるためここに代入できない (Issue #556 回帰防止: ガードが
      // 弱まり Anchor field が素通しに戻ると unused @ts-expect-error
      // になって type-check:test が失敗する)
      resurfaceCoordinates: [{ label: "x", tone: "neutral", daysSince: 1 }],
    };
    void bad;
  });

  it("新フィールドを `kind: \"elapsed\"` (Elapsed 由来) で宣言した場合は discriminator を持つため通過する (Coordinate / Elapsed 横断対応)", () => {
    // ガードは特定の discriminator 値 (例: `\"coordinate\"`) ではなく
    // 「kind が string literal で存在すること」を判定する。これにより
    // 将来 `Resurface` 等の新しい Anchor 系 layer (`kind: \"resurface\"` 等)
    // が追加されても破綻しない。
    interface ElapsedFieldIgnitionInput {
      readonly secondaryElapsed: Elapsed | null;
    }
    type Guarded =
      EnforceAnchorDiscriminatorFields_ForTest<ElapsedFieldIgnitionInput>;
    const ok: Guarded = {
      secondaryElapsed: { kind: "elapsed", label: "x", daysSince: 1 },
    };
    void ok;
  });
});
