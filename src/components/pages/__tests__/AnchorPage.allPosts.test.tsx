import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { inferPublishedAt, type Milestone } from "../../../lib/anchors";
import type { PostSummary } from "../../../lib/markdown";
import { buildPulseForbiddenVocabRegex } from "../../../test/forbiddenVocab";
import { AnchorPage } from "../AnchorPage";

/**
 * Issue #493 AC「既存16記事で破綻なく描画されることをテストで確認」を満たす
 * 統合テスト。
 *
 * datasources/*.md の実ファイル名 (post.id) と AnchorPage が想定する
 * milestones (heavy 含む全 3 件) を入力に、AnchorPage が:
 * - 全記事を一覧の中で描画する (publishedAt 推定可能なもののみ)
 * - 各記事について computeCoordinates 結果と整合した座標を描画する
 *   (AnchorPage は heavy も含めて全件表示する)
 * - heavy 含む 3 件の節目すべてを節目一覧に表示する (= 隠さない)
 * - axe a11y 違反が 0 件である
 *
 * Coordinate.allPosts.test.tsx と同様、import.meta.glob でファイル名を動的列挙
 * することで記事の追加・削除に追従できるテストにする。
 *
 * Issue #573 (#535 follow-up): 期待値は computeCoordinates の戻り値を再計算する
 *   のではなく、「実際にこの publishedAt と milestones (テスト固定) でどう描画
 *   されるはずか」をハードコードした fixture (PostCoordinatesExpectation[]) と
 *   直接比較する。これにより `computeCoordinates(publishedAt, milestones)` を
 *   テストで再実行して結果を期待値として使う「実装の写経」が無くなり、
 *   future 除外 / 入力順保持 / heavy 含む全件返却といった spec を変えると本テスト
 *   の期待値とずれて失敗するようになる (= 仕様の二重実装解消)。
 *
 *   AnchorPage は Coordinate と異なり tone:heavy を **含めて** 全件描画するため、
 *   各記事の expectedRows には heavy 行も含む点が Coordinate.allPosts.test.tsx
 *   との差異 (詳細は AnchorPage.tsx の JSDoc / Issue #493 参照)。
 */

/**
 * 1 記事ぶんの期待表示。
 *
 * - publishedAt: ファイル名 (post.id) から推定される ISO 8601 文字列
 * - expectedRows: 描画される座標 span の順序どおりに並べた節目テキスト
 *   (heavy も含む。未来除外は反映済み)
 */
interface PostCoordinatesExpectation {
  readonly postId: string;
  readonly publishedAt: string;
  readonly expectedRows: readonly {
    label: string;
    tone: Milestone["tone"];
    daysSince: number;
  }[];
}

/**
 * 本テスト専用の milestones (testMilestones) と各記事の publishedAt を入力にして、
 * AnchorPage の「各記事の座標」セクションが「実際にどう描画されるはずか」を
 * ハードコードした fixture。
 *
 * - 本テスト固定の milestones (testMilestones; 後述):
 *   - 2025-08-05 休職開始 (heavy) ← AnchorPage では **含めて** 表示する
 *   - 2025-08-26 サイト開設 (neutral)
 *   - 2025-09-05 社会復帰 (light)
 * - 各記事の expectedRows は milestones の登録順を保ち、publishedAt 当日以降の
 *   ものを除外した結果である (anchors.ts の computeCoordinates 仕様 +
 *   AnchorPage.tsx は heavy 除外をしないという仕様の合成)
 *
 * 記事を追加した場合は本 fixture も更新する。記事数と fixture 件数が
 * 一致するかは「fixture の網羅性」テストでアサートする。
 *
 * **fixture 検算スニペット (新規記事追加時)**:
 * 新しい post.id (YYYYMMDDhhmmss 形式) に対する expectedRows を埋めるとき、
 * 手計算ではなく以下を一時ファイル (例: scripts/_calcAnchorFixture.ts) として
 * 書いて `node scripts/_calcAnchorFixture.ts` で実行し、値を写し取ると安全。
 * Node v22+ はネイティブで `.ts` を実行できる (既存 scripts/ 配下と同方式)。
 * 検算用途のみで本テストの期待値とはしない。
 *
 *   import { computeCoordinates, inferPublishedAt } from "../src/lib/anchors";
 *   import milestones from "../datasources/milestones.json" with { type: "json" };
 *   const id = "20260307120000"; // 追加した post.id
 *   const publishedAt = inferPublishedAt(id);
 *   const rows = computeCoordinates(publishedAt!, milestones as never)
 *     .map((c) => ({ label: c.label, tone: c.tone, daysSince: c.daysSince }));
 *   console.log(JSON.stringify({ postId: id, publishedAt, expectedRows: rows }, null, 2));
 *
 * 出力された JSON を expectations 配列に追記すれば fixture が更新できる。
 * Coordinate.allPosts.test.tsx の検算スニペットと違い、`.filter((c) => c.tone !== "heavy")`
 * は **行わない** (AnchorPage は heavy も表示するため)。
 */
const expectations: readonly PostCoordinatesExpectation[] = [
  {
    postId: "20250826031705",
    publishedAt: "2025-08-26T03:17:05+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 21 },
      { label: "サイト開設", tone: "neutral", daysSince: 0 },
    ],
  },
  {
    postId: "20250827082145",
    publishedAt: "2025-08-27T08:21:45+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 22 },
      { label: "サイト開設", tone: "neutral", daysSince: 1 },
    ],
  },
  {
    postId: "20250829065256",
    publishedAt: "2025-08-29T06:52:56+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 24 },
      { label: "サイト開設", tone: "neutral", daysSince: 3 },
    ],
  },
  {
    postId: "20250829094053",
    publishedAt: "2025-08-29T09:40:53+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 24 },
      { label: "サイト開設", tone: "neutral", daysSince: 3 },
    ],
  },
  {
    postId: "20250908234321",
    publishedAt: "2025-09-08T23:43:21+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 34 },
      { label: "サイト開設", tone: "neutral", daysSince: 13 },
      { label: "社会復帰", tone: "light", daysSince: 3 },
    ],
  },
  {
    postId: "20250916111939",
    publishedAt: "2025-09-16T11:19:39+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 42 },
      { label: "サイト開設", tone: "neutral", daysSince: 21 },
      { label: "社会復帰", tone: "light", daysSince: 11 },
    ],
  },
  {
    postId: "20250923112419",
    publishedAt: "2025-09-23T11:24:19+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 49 },
      { label: "サイト開設", tone: "neutral", daysSince: 28 },
      { label: "社会復帰", tone: "light", daysSince: 18 },
    ],
  },
  {
    postId: "20250929121839",
    publishedAt: "2025-09-29T12:18:39+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 55 },
      { label: "サイト開設", tone: "neutral", daysSince: 34 },
      { label: "社会復帰", tone: "light", daysSince: 24 },
    ],
  },
  {
    postId: "20251014141439",
    publishedAt: "2025-10-14T14:14:39+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 70 },
      { label: "サイト開設", tone: "neutral", daysSince: 49 },
      { label: "社会復帰", tone: "light", daysSince: 39 },
    ],
  },
  {
    postId: "20251105100114",
    publishedAt: "2025-11-05T10:01:14+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 92 },
      { label: "サイト開設", tone: "neutral", daysSince: 71 },
      { label: "社会復帰", tone: "light", daysSince: 61 },
    ],
  },
  {
    postId: "20251108111702",
    publishedAt: "2025-11-08T11:17:02+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 95 },
      { label: "サイト開設", tone: "neutral", daysSince: 74 },
      { label: "社会復帰", tone: "light", daysSince: 64 },
    ],
  },
  {
    postId: "20251129142242",
    publishedAt: "2025-11-29T14:22:42+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 116 },
      { label: "サイト開設", tone: "neutral", daysSince: 95 },
      { label: "社会復帰", tone: "light", daysSince: 85 },
    ],
  },
  {
    postId: "20251220064951",
    publishedAt: "2025-12-20T06:49:51+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 137 },
      { label: "サイト開設", tone: "neutral", daysSince: 116 },
      { label: "社会復帰", tone: "light", daysSince: 106 },
    ],
  },
  {
    postId: "20260110011222",
    publishedAt: "2026-01-10T01:12:22+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 158 },
      { label: "サイト開設", tone: "neutral", daysSince: 137 },
      { label: "社会復帰", tone: "light", daysSince: 127 },
    ],
  },
  {
    postId: "20260221104801",
    publishedAt: "2026-02-21T10:48:01+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 200 },
      { label: "サイト開設", tone: "neutral", daysSince: 179 },
      { label: "社会復帰", tone: "light", daysSince: 169 },
    ],
  },
  {
    postId: "20260307120000",
    publishedAt: "2026-03-07T12:00:00+09:00",
    expectedRows: [
      { label: "休職開始", tone: "heavy", daysSince: 214 },
      { label: "サイト開設", tone: "neutral", daysSince: 193 },
      { label: "社会復帰", tone: "light", daysSince: 183 },
    ],
  },
];

/**
 * テスト本体で使う milestones。
 *
 * fixture (expectations) は **このテスト専用の固定 milestones** に基づいて
 * ハードコードされている。テスト時に本番 `datasources/milestones.json` を再 import
 * すると、本番 JSON が更新された瞬間に fixture と乖離して全件失敗する。これを防ぐ
 * ため、本テスト専用の不変スナップショットをここで定義する (= fixture と一対の
 * 入力データ)。Coordinate.allPosts.test.tsx の testMilestones と同じ方針。
 *
 * 本番 milestones.json を更新したら、`expectations` と本 `testMilestones` の
 * 両方を同時に書き直すこと (fixture の更新ルール)。
 *
 * **trade-off (両刃の性質)**:
 * 本番 JSON との切り離しにより「本番 JSON 改変でテスト道連れ失敗を防ぐ」
 * メリットがある一方で、「本番 milestone の label rename / tone 変更 /
 * 日付変更などの意味的変更が本テスト上で silent pass する」リスクを孕む。
 * 本番 milestones.json と本テスト fixture のずれは、本番 JSON を直接 import
 * している `anchors.test.ts` および開発者の意識的な fixture 更新 (上述「fixture
 * の更新ルール」) で担保する設計とする。
 */
const testMilestones: readonly Milestone[] = [
  { date: "2025-08-05", label: "休職開始", tone: "heavy" },
  { date: "2025-08-26", label: "サイト開設", tone: "neutral" },
  { date: "2025-09-05", label: "社会復帰", tone: "light" },
];

const postFilePaths = Object.keys(import.meta.glob("/datasources/*.md"));

const postIds = postFilePaths
  .map((path) => path.split("/").pop()?.replace(".md", ""))
  .filter((id): id is string => typeof id === "string" && id.length > 0)
  .sort();

/**
 * 実ファイル名 (post.id) からテスト用 PostSummary を生成する。
 *
 * AnchorPage はタイトル / id / publishedAt 推定可否に依存するため、それ以外の
 * フィールドはダミーで埋めて回帰の入力にする。
 */
const buildPostSummaries = (ids: readonly string[]): PostSummary[] =>
  ids.map((id) => ({
    id,
    title: `記事 ${id}`,
    createdAt: "",
    author: "amkkr",
    excerpt: "",
    readingTimeMinutes: 1,
  }));

describe("AnchorPage (実16記事での回帰テスト)", () => {
  it("datasources/*.md を全件取得できる (テスト前提の健全性)", () => {
    expect(postIds.length).toBeGreaterThanOrEqual(1);
  });

  it("fixture (expectations) が datasources/*.md の実ファイル名と完全一致する", () => {
    // 記事を追加・削除したら fixture も同時に更新する義務を仕組みで担保する。
    // 「fixture が古くなって実ファイルとずれている」状態をテストで検知する。
    const fixturePostIds = expectations.map((e) => e.postId).sort();
    expect(fixturePostIds).toEqual(postIds);
  });

  it("16 記事 + testMilestones で AnchorPage が破綻なく描画される", () => {
    const posts = buildPostSummaries(postIds);

    render(
      <MemoryRouter>
        <AnchorPage posts={posts} milestones={testMilestones} />
      </MemoryRouter>,
    );

    // 節目一覧は testMilestones の件数と一致する (heavy 含む全件)
    const milestoneList = screen.getByRole("list", { name: "節目一覧" });
    const milestoneItems = within(milestoneList).getAllByRole("listitem");
    expect(milestoneItems).toHaveLength(testMilestones.length);

    // 各記事の section は描画され、全記事のタイトルが現れる
    // (publishedAt 推定可能な記事のみ。既存 16 記事はすべて YYYYMMDDhhmmss 形式)
    const postSection = screen.getByRole("region", { name: "各記事の座標" });
    for (const id of postIds) {
      expect(within(postSection).getByText(`記事 ${id}`)).toBeInTheDocument();
    }
  });

  /**
   * 指定 postId の li 要素を取得する補助関数。
   *
   * 「各記事の座標」section 内のタイトルから親 li を辿ることで、テスト本体の
   * 複雑度 (Biome complexity ルール) を下げるために切り出した。
   */
  const getPostItem = (postId: string): HTMLLIElement => {
    const postSection = screen.getByRole("region", { name: "各記事の座標" });
    const titleEl = within(postSection).getByText(`記事 ${postId}`);
    const postItem = titleEl.closest("li");
    expect(postItem).not.toBeNull();
    if (postItem === null) {
      throw new Error(`postItem for ${postId} not found`);
    }
    return postItem as HTMLLIElement;
  };

  /**
   * 1 記事分の座標表示を fixture (expectedRows) と比較する補助関数。
   *
   * 期待行が 0 件のときはフォールバック文言を検証し、それ以外は各座標 span の
   * テキスト・件数・順序・tone を完全一致で検証する。
   */
  const verifyPostCoordinates = (
    postItem: HTMLLIElement,
    expectedRows: PostCoordinatesExpectation["expectedRows"],
  ): void => {
    if (expectedRows.length === 0) {
      expect(postItem.textContent).toContain("まだ通過した節目はありません");
      return;
    }

    // 「{label} から ${daysSince} 日目」形式の span は、各記事 li 内の
    // `[data-tone]` 属性付き span として描画されるためそれをカウントする。
    const coordinateSpans = postItem.querySelectorAll("[data-tone]");
    expect(coordinateSpans).toHaveLength(expectedRows.length);

    // 各 span が fixture の tone / テキストと一致する (= 描画順も含めた完全一致)
    for (const [index, row] of expectedRows.entries()) {
      const span = coordinateSpans[index];
      expect(span.getAttribute("data-tone")).toBe(row.tone);
      expect(span.textContent).toBe(
        `${row.label} から ${row.daysSince} 日目`,
      );
    }
  };

  describe("各記事の座標表示が fixture (expectations) と完全一致する (heavy 含む)", () => {
    describe.each(expectations)(
      "post.id=$postId",
      ({ postId, publishedAt, expectedRows }) => {
        it("post.id からタイムスタンプを推定でき、fixture の publishedAt と一致する", () => {
          // 既存記事はすべて YYYYMMDDhhmmss 形式で、fixture と整合する
          const inferred = inferPublishedAt(postId);
          expect(inferred).toBe(publishedAt);
        });

        it("fixture の expectedRows どおりの順序・件数・テキストで描画される", () => {
          const posts = buildPostSummaries(postIds);
          render(
            <MemoryRouter>
              <AnchorPage posts={posts} milestones={testMilestones} />
            </MemoryRouter>,
          );

          const postItem = getPostItem(postId);
          verifyPostCoordinates(postItem, expectedRows);
        });
      },
    );
  });

  it("16 記事 + testMilestones で axe a11y 違反が 0 件である", async () => {
    const posts = buildPostSummaries(postIds);

    const { container } = render(
      <MemoryRouter>
        <AnchorPage posts={posts} milestones={testMilestones} />
      </MemoryRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("16 記事 + 実 milestones の描画結果に Pulse 思想禁則語彙が現れない", () => {
    // 語彙の網羅は src/test/forbiddenVocab.ts に集約してあり、
    // Coordinate / Resurface / HomePage と共通の禁則語彙集を参照する
    // (Issue #540)。AnchorPage.test.tsx は固定 fixture でガードしているのに
    // 対し、本テストは実 datasources/milestones.json + 全 16 記事の組合せでも
    // 抽象指標語彙が漏れていないことを Tripwire で防御する。
    const posts = buildPostSummaries(postIds);
    const { container } = render(
      <MemoryRouter>
        <AnchorPage posts={posts} milestones={milestones} />
      </MemoryRouter>,
    );

    const text = container.textContent ?? "";
    expect(text).not.toMatch(buildPulseForbiddenVocabRegex());
  });
});
