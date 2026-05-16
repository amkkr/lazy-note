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
  escapeHtmlCommentLabel,
  extractMarkdownTitle,
  findPreviousPost,
  formatMilestonesSummary,
  listPostFileNames,
  loadMilestones,
} from "../newPost.ts";

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
