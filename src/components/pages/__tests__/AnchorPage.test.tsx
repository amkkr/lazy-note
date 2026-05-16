import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Milestone } from "../../../lib/anchors";
import type { PostSummary } from "../../../lib/markdown";
import { AnchorPage } from "../AnchorPage";

/**
 * AnchorPage (Issue #493 / Phase 2 of Anchor) のテスト。
 *
 * 「個人史タイムライン」運用ページのため、Coordinate (顔1) と Resurface (顔3) の
 * 思想とは異なる切り口で:
 * - tone:heavy を **含めて** 節目を全件表示する (運用画面の透明性)
 * - 各記事の座標を控えめに一覧表示する (過剰可視化禁止 = グラフ/統計なし)
 * - 空状態は穏やかに表示する (「データなし」のような断定的表現を避ける)
 *
 * テストはコンポーネント単体に props を渡して回帰させる。読み込み (usePosts /
 * JSON import) は親 (`pages/anchor.tsx`) 側の責務として AnchorPage は純粋に
 * レンダリングに専念する設計とする (HomePage / Resurface と同じ責務分離)。
 */

const baseMilestones: readonly Milestone[] = [
  { date: "2025-08-05", label: "休職開始", tone: "heavy" },
  { date: "2025-08-26", label: "サイト開設", tone: "neutral" },
  { date: "2025-09-05", label: "社会復帰", tone: "light" },
];

const basePosts: PostSummary[] = [
  {
    id: "20250826031705",
    title: "最初の記事",
    createdAt: "2025-08-26",
    author: "amkkr",
    excerpt: "本サイト最初の記事",
    readingTimeMinutes: 1,
  },
  {
    id: "20250905120000",
    title: "復帰の記事",
    createdAt: "2025-09-05",
    author: "amkkr",
    excerpt: "社会復帰当日の記事",
    readingTimeMinutes: 1,
  },
];

describe("AnchorPage", () => {
  describe("節目一覧", () => {
    it("登録された全ての節目を一覧表示できる", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // heavy を含む 3 件すべてを描画する (運用画面なので隠さない)
      const milestoneList = screen.getByRole("list", { name: "節目一覧" });
      const items = within(milestoneList).getAllByRole("listitem");
      expect(items).toHaveLength(3);

      expect(within(milestoneList).getByText(/休職開始/)).toBeInTheDocument();
      expect(within(milestoneList).getByText(/サイト開設/)).toBeInTheDocument();
      expect(within(milestoneList).getByText(/社会復帰/)).toBeInTheDocument();
    });

    it("各節目に登録日を併記できる", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const milestoneList = screen.getByRole("list", { name: "節目一覧" });
      expect(within(milestoneList).getByText(/2025-08-05/)).toBeInTheDocument();
      expect(within(milestoneList).getByText(/2025-08-26/)).toBeInTheDocument();
      expect(within(milestoneList).getByText(/2025-09-05/)).toBeInTheDocument();
    });

    it("節目が 0 件のとき穏やかな空状態として表示される", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={[]} />
        </MemoryRouter>,
      );

      // 「データがありません」「エラー」のような断定的文言ではなく、
      // 寄り添う文言として「まだ節目が記録されていません」を表示する
      expect(
        screen.getByText(/まだ節目が記録されていません/),
      ).toBeInTheDocument();
      // 節目リスト自体は描画されない
      expect(
        screen.queryByRole("list", { name: "節目一覧" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("各記事の座標一覧", () => {
    it("各記事のタイトルを表示できる", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      expect(within(postSection).getByText("最初の記事")).toBeInTheDocument();
      expect(within(postSection).getByText("復帰の記事")).toBeInTheDocument();
    });

    it("各記事の座標 (heavy 含む) を一覧表示できる", () => {
      // 復帰の記事 (2025-09-05 公開) は全 3 節目より後 or 同日のため、
      // 「休職開始 から 31 日目」「サイト開設 から 10 日目」「社会復帰 から 0 日目」
      // が描画される。AnchorPage では heavy も隠さない。
      // 最初の記事 (2025-08-26 公開) は「休職開始 から 21 日目」「サイト開設 から 0 日目」
      // (社会復帰は未来のため除外)。
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      // heavy を含む節目ラベルが両記事に現れる (休職開始: 2 記事に登場)
      // - 最初の記事 (2025-08-26 公開): 「休職開始 から 21 日目」
      // - 復帰の記事 (2025-09-05 公開): 「休職開始 から 31 日目」
      const heavyMatches = within(postSection).getAllByText(/休職開始/);
      expect(heavyMatches).toHaveLength(2);
      // 復帰記事のみ 2025-09-05 当日に到達するため、社会復帰は 1 記事に出る
      expect(within(postSection).getByText(/社会復帰/)).toBeInTheDocument();
      // 復帰記事には「31 日目」が出る (休職開始から 31 日)
      expect(within(postSection).getByText(/31 日目/)).toBeInTheDocument();
    });

    it("座標 0 件の記事は穏やかな空状態を表示する", () => {
      // 全節目より前 (2025-08-04 以前) に公開された記事の場合、座標は 0 件になる
      const earlyPost: PostSummary = {
        id: "20250801000000",
        title: "節目より前の記事",
        createdAt: "2025-08-01",
        author: "amkkr",
        excerpt: "節目以前",
        readingTimeMinutes: 1,
      };

      render(
        <MemoryRouter>
          <AnchorPage posts={[earlyPost]} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 「該当する節目はまだありません」のような穏やかな表現を出す
      expect(
        screen.getByText(/まだ通過した節目はありません/),
      ).toBeInTheDocument();
    });

    it("記事が 0 件のとき穏やかな空状態として表示される", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={[]} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 「記事がありません」のような断定ではなく、寄り添う文言にする
      expect(screen.getByText(/まだ記事がありません/)).toBeInTheDocument();
      // 各記事の座標 region 自体は出さない
      expect(
        screen.queryByRole("region", { name: "各記事の座標" }),
      ).not.toBeInTheDocument();
    });

    it("publishedAt 推定不可な id の記事 (テスト用 id 等) はスキップして描画しない", () => {
      // YYYYMMDDhhmmss 形式でない id は inferPublishedAt が null を返すため、
      // 座標を計算できない。AnchorPage はそのような記事を素直にスキップする。
      const invalidPost: PostSummary = {
        id: "test-invalid-id",
        title: "壊れた id の記事",
        createdAt: "2025-09-05",
        author: "amkkr",
        excerpt: "テスト",
        readingTimeMinutes: 1,
      };

      render(
        <MemoryRouter>
          <AnchorPage
            posts={[invalidPost, ...basePosts]}
            milestones={baseMilestones}
          />
        </MemoryRouter>,
      );

      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      // 壊れた id の記事は描画されない
      expect(
        within(postSection).queryByText("壊れた id の記事"),
      ).not.toBeInTheDocument();
      // 正常な記事は描画される
      expect(within(postSection).getByText("最初の記事")).toBeInTheDocument();
    });
  });

  describe("publishedAt 推定不可な記事のスキップ件数注記 (Issue #544)", () => {
    it("スキップ対象が 0 件のとき注記は表示しない", () => {
      // basePosts は 2 件とも YYYYMMDDhhmmss 形式の正常 id なので、
      // スキップは発生しない。このとき注記は描画されない。
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      expect(
        screen.queryByText(/publishedAt 推定不可でスキップした記事/),
      ).not.toBeInTheDocument();
      // role="note" でも検出されないこと (= ノイズ削減の意図)
      expect(screen.queryByRole("note")).not.toBeInTheDocument();
    });

    it("スキップ対象が 1 件のとき件数注記を表示する", () => {
      const invalidPost: PostSummary = {
        id: "test-invalid-id",
        title: "壊れた id の記事",
        createdAt: "2025-09-05",
        author: "amkkr",
        excerpt: "テスト",
        readingTimeMinutes: 1,
      };

      render(
        <MemoryRouter>
          <AnchorPage
            posts={[invalidPost, ...basePosts]}
            milestones={baseMilestones}
          />
        </MemoryRouter>,
      );

      // 注記が role="note" として検出できる
      const note = screen.getByRole("note");
      expect(note).toBeInTheDocument();
      expect(note).toHaveTextContent(
        "publishedAt 推定不可でスキップした記事: 1 件",
      );
    });

    it("スキップ対象が複数件のとき件数を正しく集計して表示する", () => {
      const invalidPosts: PostSummary[] = [
        {
          id: "test-invalid-1",
          title: "壊れた id 1",
          createdAt: "2025-09-05",
          author: "amkkr",
          excerpt: "テスト1",
          readingTimeMinutes: 1,
        },
        {
          id: "broken",
          title: "壊れた id 2",
          createdAt: "2025-09-05",
          author: "amkkr",
          excerpt: "テスト2",
          readingTimeMinutes: 1,
        },
        {
          id: "12345",
          title: "桁数が足りない id",
          createdAt: "2025-09-05",
          author: "amkkr",
          excerpt: "テスト3",
          readingTimeMinutes: 1,
        },
      ];

      render(
        <MemoryRouter>
          <AnchorPage
            posts={[...invalidPosts, ...basePosts]}
            milestones={baseMilestones}
          />
        </MemoryRouter>,
      );

      const note = screen.getByRole("note");
      expect(note).toHaveTextContent(
        "publishedAt 推定不可でスキップした記事: 3 件",
      );
    });

    it("全記事が publishedAt 推定不可のとき空 list を出さず穏やかな空状態テキストにフォールバックする", () => {
      // 全 posts が壊れた id の場合、`postEntries.length === 0` となる。
      // ここで空 `<ul>` を描画すると「各記事の座標」見出し + 空 list + 注記の
      // 不自然な画面になるため、フォールバックとして 1 行の空状態テキスト
      // (= 全件スキップである事実を件数とともに伝える) のみを出す。
      const invalidPosts: PostSummary[] = [
        {
          id: "test-invalid-1",
          title: "壊れた id 1",
          createdAt: "2025-09-05",
          author: "amkkr",
          excerpt: "テスト1",
          readingTimeMinutes: 1,
        },
        {
          id: "test-invalid-2",
          title: "壊れた id 2",
          createdAt: "2025-09-05",
          author: "amkkr",
          excerpt: "テスト2",
          readingTimeMinutes: 1,
        },
      ];

      render(
        <MemoryRouter>
          <AnchorPage posts={invalidPosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 各記事の座標 section 自体は出る (posts.length > 0 なので)
      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      expect(postSection).toBeInTheDocument();
      // フォールバックテキストが描画される
      const note = within(postSection).getByRole("note");
      expect(note).toHaveTextContent(
        "全記事が publishedAt 推定不可のためスキップしました (2 件)",
      );
      // 空 `<ul>` (= 各記事を並べる list) は出さない
      expect(within(postSection).queryByRole("list")).not.toBeInTheDocument();
      // 通常の件数注記 (「publishedAt 推定不可でスキップした記事: N 件」) は出さない
      // (= フォールバックテキストに件数を埋め込んでいるため二重表示を避ける)
      expect(
        within(postSection).queryByText(
          /publishedAt 推定不可でスキップした記事:/,
        ),
      ).not.toBeInTheDocument();
    });

    it("posts が 0 件のとき注記そのものを出さない (各記事の座標 section ごと非表示のため)", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={[]} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 各記事の座標 region 自体が出ないため、注記も同伴して出ない
      expect(screen.queryByRole("note")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/publishedAt 推定不可でスキップした記事/),
      ).not.toBeInTheDocument();
    });
  });

  describe("過剰可視化の禁止", () => {
    it("投稿頻度に関する文言を含まない", () => {
      const { container } = render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 「投稿頻度」「平均間隔」「ペース」など Pulse を切った思想に反する語彙
      // が AnchorPage には現れない
      const text = container.textContent ?? "";
      expect(text).not.toMatch(/投稿頻度|平均間隔|投稿ペース/);
    });

    it("グラフ要素 (canvas) を含まない", () => {
      const { container } = render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 統計グラフのような視覚化を出さないため、canvas は描画しない。
      // svg は将来 Lucide 等の小型アイコン (Calendar, Clock 等) を追加した
      // 際に false positive となるためここでは検査しない (アイコンとしての
      // svg は許容)。Recharts / Chart.js のような可視化ライブラリの混入は
      // 「依存追加禁止」の別ルートで検知する方針。
      expect(container.querySelector("canvas")).toBeNull();
    });
  });

  describe("a11y", () => {
    it("ページの見出し階層を構築できる (h1 が 1 件存在する)", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // ページのトップは h1 ("Anchor") から始まる
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it("axe a11y 違反が 0 件である", async () => {
      const { container } = render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("空状態でも axe a11y 違反が 0 件である", async () => {
      const { container } = render(
        <MemoryRouter>
          <AnchorPage posts={[]} milestones={[]} />
        </MemoryRouter>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("デザイントークン (Tripwire)", () => {
    it("節目一覧の各 li が tone を data-tone 属性として宣言する", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const milestoneList = screen.getByRole("list", { name: "節目一覧" });
      const items = within(milestoneList).getAllByRole("listitem");
      // 入力順 (heavy / neutral / light) と同じ並び
      expect(items[0]).toHaveAttribute("data-tone", "heavy");
      expect(items[1]).toHaveAttribute("data-tone", "neutral");
      expect(items[2]).toHaveAttribute("data-tone", "light");
    });
  });
});
