import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { inferPublishedAt, type Milestone } from "../../../lib/anchors";
import { Coordinate } from "../Coordinate";

/**
 * Issue #491 AC「既存16記事すべてで Coordinate が正しく表示されること、
 * 0件記事で非表示になることをテストで確認」を満たす統合テスト。
 *
 * datasources/*.md の実ファイル名 (post.id) と datasources/milestones.json
 * を入力に、各記事で Coordinate が期待どおり描画 (または非表示) されることを
 * Vitest 上で実機回帰的に確認する。
 *
 * - 「正しく」とは: 過去の節目のみが表示され、tone:heavy が除外され、
 *   publishedAt 当日以降の節目は表示されないこと。
 * - 「0件記事で非表示」とは: milestones が空、もしくは全節目が未来 /
 *   全節目が tone:heavy の場合に Coordinate コンポーネントが何も描画しないこと。
 *
 * 実記事ファイル名は import.meta.glob で動的列挙する。これにより記事を
 * 追加・削除しても再生成不要で常に最新の 16 件 (現在) を検査する。
 *
 * Issue #535: 期待値は computeCoordinates の戻り値を再計算するのではなく、
 *   「実際にこの publishedAt と milestones.json でどう描画されるはずか」を
 *   ハードコードした fixture (CoordinateExpectation[]) と直接比較する。
 *   これにより `computeCoordinates(...).filter((c) => c.tone !== "heavy")`
 *   という実装の写経が無くなり、フィルタ条件 (heavy 除外) や未来除外仕様を
 *   変えると本テストの期待値とずれて失敗するようになる (= 仕様の二重実装解消)。
 */

/**
 * 1 記事ぶんの期待表示。
 *
 * - publishedAt: ファイル名 (post.id) から推定される ISO 8601 文字列
 * - expectedRows: 描画される li の順序どおりに並べた節目テキスト
 *   (heavy 除外・未来除外を反映済み)
 */
interface CoordinateExpectation {
  readonly postId: string;
  readonly publishedAt: string;
  readonly expectedRows: readonly { label: string; daysSince: number }[];
}

/**
 * datasources/milestones.json と各記事の publishedAt を入力にして、
 * Coordinate が「実際にどう描画されるはずか」をハードコードした fixture。
 *
 * - 現行 datasources/milestones.json:
 *   - 2025-08-05 休職開始 (heavy) ← 表示対象から除外
 *   - 2025-08-26 サイト開設 (neutral)
 *   - 2025-09-05 社会復帰 (light)
 * - 各記事の expectedRows は milestones.json の登録順を保ち、heavy を除外し、
 *   publishedAt 当日以降のものを除外した結果である
 *   (anchors.ts の computeCoordinates 仕様 + Coordinate.tsx の heavy 除外仕様)
 *
 * 記事を追加した場合は本 fixture も更新する。記事数と fixture 件数が
 * 一致するかは「fixture の網羅性」テストでアサートする。
 *
 * **fixture 検算スニペット (新規記事追加時)**:
 * 新しい post.id (YYYYMMDDhhmmss 形式) に対する expectedRows を埋めるとき、
 * 手計算ではなく以下を一時ファイル (例: scripts/_calcFixture.ts) として
 * 書いて `node scripts/_calcFixture.ts` で実行し、値を写し取ると安全。
 * Node v22+ はネイティブで `.ts` を実行できる (既存 scripts/ 配下と同方式)。
 * 検算用途のみで本テストの期待値とはしない。
 *
 *   import { computeCoordinates, inferPublishedAt } from "../src/lib/anchors";
 *   import milestones from "../datasources/milestones.json";
 *   const id = "20260307120000"; // 追加した post.id
 *   const publishedAt = inferPublishedAt(id);
 *   const rows = computeCoordinates(publishedAt!, milestones as never, { excludeHeavy: true })
 *     .map((c) => ({ label: c.label, daysSince: c.daysSince }));
 *   console.log(JSON.stringify({ postId: id, publishedAt, expectedRows: rows }, null, 2));
 *
 * 出力された JSON を expectations 配列に追記すれば fixture が更新できる。
 */
const expectations: readonly CoordinateExpectation[] = [
  {
    postId: "20250826031705",
    publishedAt: "2025-08-26T03:17:05+09:00",
    expectedRows: [{ label: "サイト開設", daysSince: 0 }],
  },
  {
    postId: "20250827082145",
    publishedAt: "2025-08-27T08:21:45+09:00",
    expectedRows: [{ label: "サイト開設", daysSince: 1 }],
  },
  {
    postId: "20250829065256",
    publishedAt: "2025-08-29T06:52:56+09:00",
    expectedRows: [{ label: "サイト開設", daysSince: 3 }],
  },
  {
    postId: "20250829094053",
    publishedAt: "2025-08-29T09:40:53+09:00",
    expectedRows: [{ label: "サイト開設", daysSince: 3 }],
  },
  {
    postId: "20250908234321",
    publishedAt: "2025-09-08T23:43:21+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 13 },
      { label: "社会復帰", daysSince: 3 },
    ],
  },
  {
    postId: "20250916111939",
    publishedAt: "2025-09-16T11:19:39+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 21 },
      { label: "社会復帰", daysSince: 11 },
    ],
  },
  {
    postId: "20250923112419",
    publishedAt: "2025-09-23T11:24:19+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 28 },
      { label: "社会復帰", daysSince: 18 },
    ],
  },
  {
    postId: "20250929121839",
    publishedAt: "2025-09-29T12:18:39+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 34 },
      { label: "社会復帰", daysSince: 24 },
    ],
  },
  {
    postId: "20251014141439",
    publishedAt: "2025-10-14T14:14:39+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 49 },
      { label: "社会復帰", daysSince: 39 },
    ],
  },
  {
    postId: "20251105100114",
    publishedAt: "2025-11-05T10:01:14+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 71 },
      { label: "社会復帰", daysSince: 61 },
    ],
  },
  {
    postId: "20251108111702",
    publishedAt: "2025-11-08T11:17:02+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 74 },
      { label: "社会復帰", daysSince: 64 },
    ],
  },
  {
    postId: "20251129142242",
    publishedAt: "2025-11-29T14:22:42+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 95 },
      { label: "社会復帰", daysSince: 85 },
    ],
  },
  {
    postId: "20251220064951",
    publishedAt: "2025-12-20T06:49:51+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 116 },
      { label: "社会復帰", daysSince: 106 },
    ],
  },
  {
    postId: "20260110011222",
    publishedAt: "2026-01-10T01:12:22+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 137 },
      { label: "社会復帰", daysSince: 127 },
    ],
  },
  {
    postId: "20260221104801",
    publishedAt: "2026-02-21T10:48:01+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 179 },
      { label: "社会復帰", daysSince: 169 },
    ],
  },
  {
    postId: "20260307120000",
    publishedAt: "2026-03-07T12:00:00+09:00",
    expectedRows: [
      { label: "サイト開設", daysSince: 193 },
      { label: "社会復帰", daysSince: 183 },
    ],
  },
];

// datasources/*.md のファイル名を動的列挙する。
// import.meta.glob は eager:false 既定で path のみ取得する。
const postFilePaths = Object.keys(import.meta.glob("/datasources/*.md"));

// ファイル名 (timestamp) を抽出。各 path は "/datasources/{timestamp}.md" 形式。
const postIds = postFilePaths
  .map((path) => path.split("/").pop()?.replace(".md", ""))
  .filter((id): id is string => typeof id === "string" && id.length > 0)
  .sort();

/**
 * テスト本体で使う milestones。
 *
 * fixture (expectations) は **現行の datasources/milestones.json** の内容に
 * 基づいてハードコードされている。テスト時に再 import すると、本番 JSON が
 * 更新された瞬間に fixture と乖離して全件失敗する。これを防ぐため、本テスト
 * 専用の不変スナップショットをここで定義する (= fixture と一対の入力データ)。
 *
 * 本番 milestones.json を更新したら、`expectations` と本 `testMilestones` の
 * 両方を同時に書き直すこと (fixture の更新ルール)。
 *
 * **trade-off (両刃の性質)**:
 * 本番 JSON との切り離しにより「本番 JSON 改変でテスト道連れ失敗を防ぐ」
 * メリットがある一方で、「本番 milestone の label rename / tone 変更 /
 * 日付変更などの意味的変更が本テスト上で silent pass する」リスクを孕む。
 * 本番 milestones.json と本テスト fixture のずれは、本番 JSON を直接 import
 * している `anchors.test.ts` および `milestones.semantic.test.ts` (Issue #615
 * で追加した意味的スナップショット: 本番 JSON の date / label / tone 全件を
 * 固定 fixture と toEqual 比較し rename / 日付変更 / tone 変更 / 追加 / 削除 /
 * 並び替えを失敗として検知)、および開発者の意識的な fixture 更新
 * (上述「fixture の更新ルール」) で担保する設計とする。
 * (PR #612 で `AnchorPage.allPosts.test.tsx` も本テストと同様 fixture 化されたため、
 * 本番 JSON 直接 import は `anchors.test.ts` と `milestones.semantic.test.ts` のみとなった)
 */
const testMilestones: readonly Milestone[] = [
  { date: "2025-08-05", label: "休職開始", tone: "heavy" },
  { date: "2025-08-26", label: "サイト開設", tone: "neutral" },
  { date: "2025-09-05", label: "社会復帰", tone: "light" },
];

describe("Coordinate (実16記事での回帰テスト)", () => {
  it("datasources/*.md を全件取得できる (テスト前提の健全性)", () => {
    // 1 件以上存在する前提を担保 (本テストの実機性を保つため)
    expect(postIds.length).toBeGreaterThanOrEqual(1);
  });

  it("fixture (expectations) が datasources/*.md の実ファイル名と完全一致する", () => {
    // 記事を追加・削除したら fixture も同時に更新する義務を仕組みで担保する。
    // 「fixture が古くなって実ファイルとずれている」状態をテストで検知する。
    const fixturePostIds = expectations.map((e) => e.postId).sort();
    expect(fixturePostIds).toEqual(postIds);
  });

  describe.each(expectations)("post.id=$postId", ({
    postId,
    publishedAt,
    expectedRows,
  }) => {
    it("post.id からタイムスタンプを推定でき、fixture の publishedAt と一致する", () => {
      // 既存記事はすべて YYYYMMDDhhmmss 形式で、fixture と整合する
      const inferred = inferPublishedAt(postId);
      expect(inferred).toBe(publishedAt);
    });

    it("fixture の expectedRows どおりの順序・件数・テキストで描画される", () => {
      const { container } = render(
        <Coordinate publishedAt={publishedAt} milestones={testMilestones} />,
      );

      if (expectedRows.length === 0) {
        // 0 件記事 (= 全節目が未来 or 全節目が heavy) は非表示
        expect(container.firstChild).toBeNull();
        return;
      }

      // 1 件以上ある記事は ul (aria-label="個人史座標") が描画される
      const list = screen.getByRole("list", { name: "個人史座標" });
      expect(list).toBeInTheDocument();

      // 期待件数の li が並ぶ
      const items = list.querySelectorAll("li");
      expect(items).toHaveLength(expectedRows.length);

      // 各 li に fixture どおりの label と日数が含まれる
      for (const [index, row] of expectedRows.entries()) {
        const item = items[index];
        expect(item.textContent).toContain(row.label);
        expect(item.textContent).toContain(String(row.daysSince));
      }
    });
  });

  describe("0 件記事の非表示 (フォールバック)", () => {
    it("milestones が空配列なら全 16 記事で非表示になる", () => {
      for (const postId of postIds) {
        const publishedAt = inferPublishedAt(postId);
        if (publishedAt === null) {
          continue;
        }

        const { container, unmount } = render(
          <Coordinate publishedAt={publishedAt} milestones={[]} />,
        );

        expect(container.firstChild).toBeNull();
        unmount();
      }
    });

    it("全節目が tone:heavy だけなら全 16 記事で非表示になる", () => {
      const heavyOnly: readonly Milestone[] = testMilestones.map((m) => ({
        ...m,
        tone: "heavy",
      }));

      for (const postId of postIds) {
        const publishedAt = inferPublishedAt(postId);
        if (publishedAt === null) {
          continue;
        }

        const { container, unmount } = render(
          <Coordinate publishedAt={publishedAt} milestones={heavyOnly} />,
        );

        expect(container.firstChild).toBeNull();
        unmount();
      }
    });

    it("全節目が publishedAt より未来なら全 16 記事で非表示になる", () => {
      // 既存 16 記事のうち最古は 20250826 のため、それより未来の節目を作る
      const futureOnly: readonly Milestone[] = [
        { date: "2099-12-31", label: "未来の節目", tone: "neutral" },
      ];

      for (const postId of postIds) {
        const publishedAt = inferPublishedAt(postId);
        if (publishedAt === null) {
          continue;
        }

        const { container, unmount } = render(
          <Coordinate publishedAt={publishedAt} milestones={futureOnly} />,
        );

        expect(container.firstChild).toBeNull();
        unmount();
      }
    });
  });
});
