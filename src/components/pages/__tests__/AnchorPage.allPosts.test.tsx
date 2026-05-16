import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import milestonesData from "../../../../datasources/milestones.json";
import {
  computeCoordinates,
  inferPublishedAt,
  type Milestone,
} from "../../../lib/anchors";
import type { PostSummary } from "../../../lib/markdown";
import { AnchorPage } from "../AnchorPage";

/**
 * Issue #493 AC「既存16記事で破綻なく描画されることをテストで確認」を満たす
 * 統合テスト。
 *
 * datasources/*.md の実ファイル名 (post.id) と datasources/milestones.json
 * を入力に、AnchorPage が:
 * - 全記事を一覧の中で描画する (publishedAt 推定可能なもののみ)
 * - 各記事について computeCoordinates 結果と整合した座標を描画する
 * - heavy 含む 3 件の節目すべてを節目一覧に表示する (= 隠さない)
 * - axe a11y 違反が 0 件である
 *
 * Coordinate.allPosts.test.tsx と同様、import.meta.glob でファイル名を動的列挙
 * することで記事の追加・削除に追従できるテストにする。
 */

const milestones: readonly Milestone[] = milestonesData as readonly Milestone[];

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

  it("16 記事 + milestones.json で AnchorPage が破綻なく描画される", () => {
    const posts = buildPostSummaries(postIds);

    render(
      <MemoryRouter>
        <AnchorPage posts={posts} milestones={milestones} />
      </MemoryRouter>,
    );

    // 節目一覧は milestones.json の件数と一致する (heavy 含む全件)
    const milestoneList = screen.getByRole("list", { name: "節目一覧" });
    const milestoneItems = within(milestoneList).getAllByRole("listitem");
    expect(milestoneItems).toHaveLength(milestones.length);

    // 各記事の section は描画され、全記事のタイトルが現れる
    // (publishedAt 推定可能な記事のみ。既存 16 記事はすべて YYYYMMDDhhmmss 形式)
    const postSection = screen.getByRole("region", { name: "各記事の座標" });
    for (const id of postIds) {
      expect(within(postSection).getByText(`記事 ${id}`)).toBeInTheDocument();
    }
  });

  describe("各記事の座標表示が computeCoordinates 結果と整合する (heavy 含む)", () => {
    /**
     * 1 記事分の検証。複雑度を下げるためテスト本体から切り出した補助関数。
     *
     * publishedAt 推定不可な id (テストの前提を満たさない id) は呼び出し側で
     * フィルタしてから渡す前提。
     */
    const verifyPostCoordinates = (id: string) => {
      const publishedAt = inferPublishedAt(id);
      // 上位 describe.each でも publishedAt 推定可能なものに絞っている前提だが
      // 念のためアサートしてテストの前提を明示する
      expect(publishedAt).not.toBeNull();
      if (publishedAt === null) {
        return;
      }

      const expectedCoordinates = computeCoordinates(publishedAt, milestones);
      const postSection = screen.getByRole("region", { name: "各記事の座標" });
      const titleEl = within(postSection).getByText(`記事 ${id}`);
      const postItem = titleEl.closest("li");
      expect(postItem).not.toBeNull();
      if (postItem === null) {
        return;
      }

      if (expectedCoordinates.length === 0) {
        expect(postItem.textContent).toContain("まだ通過した節目はありません");
        return;
      }

      for (const coord of expectedCoordinates) {
        expect(postItem.textContent).toContain(coord.label);
        expect(postItem.textContent).toContain(String(coord.daysSince));
      }
    };

    describe.each(postIds)("post.id=%s", (id) => {
      it("computeCoordinates 結果と座標表示が一致する", () => {
        const posts = buildPostSummaries(postIds);
        render(
          <MemoryRouter>
            <AnchorPage posts={posts} milestones={milestones} />
          </MemoryRouter>,
        );
        verifyPostCoordinates(id);
      });
    });
  });

  it("16 記事 + 実 milestones で axe a11y 違反が 0 件である", async () => {
    const posts = buildPostSummaries(postIds);

    const { container } = render(
      <MemoryRouter>
        <AnchorPage posts={posts} milestones={milestones} />
      </MemoryRouter>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
