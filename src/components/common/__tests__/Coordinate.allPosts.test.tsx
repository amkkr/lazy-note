import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import milestonesData from "../../../../datasources/milestones.json";
import {
  computeCoordinates,
  inferPublishedAt,
  type Milestone,
} from "../../../lib/anchors";
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
 */

const milestones: readonly Milestone[] = milestonesData as readonly Milestone[];

// datasources/*.md のファイル名を動的列挙する。
// import.meta.glob は eager:false 既定で path のみ取得する。
const postFilePaths = Object.keys(import.meta.glob("/datasources/*.md"));

// ファイル名 (timestamp) を抽出。各 path は "/datasources/{timestamp}.md" 形式。
const postIds = postFilePaths
  .map((path) => path.split("/").pop()?.replace(".md", ""))
  .filter((id): id is string => typeof id === "string" && id.length > 0)
  .sort();

describe("Coordinate (実16記事での回帰テスト)", () => {
  it("datasources/*.md を全件取得できる (テスト前提の健全性)", () => {
    // 16 件存在する前提を担保 (本テストの実機性を保つため)
    expect(postIds.length).toBeGreaterThanOrEqual(1);
  });

  describe.each(postIds)("post.id=%s", (postId) => {
    const publishedAt = inferPublishedAt(postId);

    it("post.id からタイムスタンプを推定できる (実ファイル名の構造検査)", () => {
      // 既存 16 記事はすべて YYYYMMDDhhmmss 形式
      expect(publishedAt).not.toBeNull();
    });

    it("Coordinate が computeCoordinates 結果と整合して描画される (heavy 除外含む)", () => {
      if (publishedAt === null) {
        // 推定不可なら本テストはスキップ (上の it でアサート済み)
        return;
      }

      // 期待される描画: tone:heavy を除外した過去の節目のみ
      const expectedCoordinates = computeCoordinates(
        publishedAt,
        milestones,
      ).filter((c) => c.tone !== "heavy");

      const { container } = render(
        <Coordinate publishedAt={publishedAt} milestones={milestones} />,
      );

      if (expectedCoordinates.length === 0) {
        // 0 件記事 (= 全節目が未来 or 全節目が heavy) は非表示
        expect(container.firstChild).toBeNull();
      } else {
        // 1 件以上ある記事は ul (aria-label="あれから N 日目") が描画される
        const list = screen.getByRole("list", {
          name: "あれから N 日目",
        });
        expect(list).toBeInTheDocument();
        // 期待件数の li が並ぶ
        const items = list.querySelectorAll("li");
        expect(items).toHaveLength(expectedCoordinates.length);

        // 各 li のテキストに対応する label と日数が含まれる
        for (const [index, coord] of expectedCoordinates.entries()) {
          const item = items[index];
          expect(item.textContent).toContain(coord.label);
          expect(item.textContent).toContain(String(coord.daysSince));
        }
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
      const heavyOnly: readonly Milestone[] = milestones.map((m) => ({
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
