import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Post, PostSummary } from "../../../lib/markdown";
import { HomePage } from "../HomePage";

const mockPosts: Post[] = [
  {
    id: "test-post-1",
    title: "テスト記事1",
    content: "テストコンテンツ1",
    author: "著者1",
    createdAt: "2024-01-01",
    rawContent: "# テスト記事1\n\nテストコンテンツ1",
    excerpt: "テストコンテンツ1の抜粋です",
    readingTimeMinutes: 1,
    toc: [],
  },
  {
    id: "test-post-2",
    title: "テスト記事2",
    content: "テストコンテンツ2",
    author: "著者2",
    createdAt: "2024-01-02",
    rawContent: "# テスト記事2\n\nテストコンテンツ2",
    excerpt: "テストコンテンツ2の抜粋です",
    readingTimeMinutes: 3,
    toc: [],
  },
];

/**
 * Editorial Bento レイアウト (Issue #395) の振り分けを検証するため、
 * Featured (1) / Bento (6) / Index (>=8) を埋められるだけのモックを生成する。
 */
const buildMockPosts = (count: number): PostSummary[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `post-${String(i + 1).padStart(3, "0")}`,
    title: `テスト記事${i + 1}`,
    createdAt: `2024-01-${String(i + 1).padStart(2, "0")}`,
    author: `著者${i + 1}`,
    excerpt: `抜粋${i + 1}`,
    readingTimeMinutes: 1,
  }));

const mockOnPageChange = vi.fn();

describe("HomePage", () => {
  it("記事がない場合はEmptyStateが表示される", () => {
    render(
      <MemoryRouter>
        <HomePage
          posts={[]}
          currentPage={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("新しい記事をお楽しみに")).toBeInTheDocument();
    expect(
      screen.getByText(
        "まもなく素晴らしい記事が公開される予定です。創造性に満ちたコンテンツをお届けします。",
      ),
    ).toBeInTheDocument();
  });

  it("記事一覧を表示できる", () => {
    render(
      <MemoryRouter>
        <HomePage
          posts={mockPosts}
          currentPage={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("テスト記事1")).toBeInTheDocument();
    expect(screen.getByText("テスト記事2")).toBeInTheDocument();
  });

  it("各記事の著者名を表示できる", () => {
    render(
      <MemoryRouter>
        <HomePage
          posts={mockPosts}
          currentPage={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("著者1")).toBeInTheDocument();
    expect(screen.getByText("著者2")).toBeInTheDocument();
  });

  it("各記事の投稿日時を表示できる", () => {
    render(
      <MemoryRouter>
        <HomePage
          posts={mockPosts}
          currentPage={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("2024-01-02")).toBeInTheDocument();
  });

  it("記事タイトルをリンクにできる", () => {
    render(
      <MemoryRouter>
        <HomePage
          posts={mockPosts}
          currentPage={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
        />
      </MemoryRouter>,
    );

    const link1 = screen.getByRole("link", { name: "テスト記事1" });
    expect(link1).toHaveAttribute("href", "/posts/test-post-1");

    const link2 = screen.getByRole("link", { name: "テスト記事2" });
    expect(link2).toHaveAttribute("href", "/posts/test-post-2");
  });

  // Issue #419: HomePage (bg.canvas) 上に置かれる Magazine 風 Index の上端
  // 区切り線について、旧 token (bg.elevated) は light 環境で外側 bg.canvas との
  // 差が 1.06:1 で視覚消失していた。Editorial Bento レイアウト (Issue #395) の
  // 導入で旧 articleStyles / articleHeader 構造は削除され、bg.elevated 残存箇所
  // は indexListStyles の borderTop に移った。border 専用 token (border.subtle)
  // に置換した後、Tripwire テストで CI 検出する。
  it("Index リストの borderTop が border.subtle 専用 token を参照している", () => {
    const posts = buildMockPosts(10);
    const { container } = render(
      <MemoryRouter>
        <HomePage
          posts={posts}
          currentPage={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
        />
      </MemoryRouter>,
    );

    // 8 件目以降は Magazine 風 Index (ul) としてレンダリングされる。
    // Panda が生成する `bd-t-c_border.subtle` または `bd-c_border.subtle`
    // クラスが付与されているか検証。
    const indexList = container.querySelector("ul");
    expect(indexList).toBeInTheDocument();
    expect(indexList?.className).toMatch(/bd-t-c_border\.subtle|bd-c_border\.subtle/);
  });

  it("タイトルがない記事は「無題の記事」と表示される", () => {
    const postsWithoutTitle: Post[] = [
      {
        id: "no-title",
        title: "",
        content: "コンテンツ",
        author: "著者",
        createdAt: "2024-01-01",
        rawContent: "コンテンツ",
        excerpt: "",
        readingTimeMinutes: 1,
        toc: [],
      },
    ];

    render(
      <MemoryRouter>
        <HomePage
          posts={postsWithoutTitle}
          currentPage={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("無題の記事")).toBeInTheDocument();
  });

  // ===================================================================
  // Editorial Bento レイアウト (Issue #395) の振り分けテスト
  //
  // 1 件目 = Featured / 2-7 件目 = Bento / 8 件目以降 = Index と分割し、
  // 各ロールが正しく描画されるかを検証する。
  // ===================================================================
  describe("Editorial Bento レイアウト振り分け", () => {
    it("最新 1 件を Featured として大きく表示できる", () => {
      const posts = buildMockPosts(1);
      render(
        <MemoryRouter>
          <HomePage
            posts={posts}
            currentPage={1}
            totalPages={1}
            onPageChange={mockOnPageChange}
          />
        </MemoryRouter>,
      );

      // Featured ラベルが存在
      expect(screen.getByText("Featured")).toBeInTheDocument();
      // 最新記事のタイトルが H2 として表示される (FeaturedCard)
      expect(
        screen.getByRole("heading", { name: "テスト記事1", level: 2 }),
      ).toBeInTheDocument();
    });

    it("2-7 件目を Bento グリッドに表示できる", () => {
      const posts = buildMockPosts(7);
      render(
        <MemoryRouter>
          <HomePage
            posts={posts}
            currentPage={1}
            totalPages={1}
            onPageChange={mockOnPageChange}
          />
        </MemoryRouter>,
      );

      // 2-7 件目は h3 (BentoCard) として表示される
      for (let i = 2; i <= 7; i++) {
        expect(
          screen.getByRole("heading", { name: `テスト記事${i}`, level: 3 }),
        ).toBeInTheDocument();
      }
      // 1 件目は h2 (FeaturedCard) のままで h3 ではない
      expect(
        screen.queryByRole("heading", { name: "テスト記事1", level: 3 }),
      ).not.toBeInTheDocument();
    });

    it("8 件目以降を Magazine 風 Index として表示できる", () => {
      const posts = buildMockPosts(10);
      render(
        <MemoryRouter>
          <HomePage
            posts={posts}
            currentPage={1}
            totalPages={1}
            onPageChange={mockOnPageChange}
          />
        </MemoryRouter>,
      );

      // Index 見出しが表示される
      expect(
        screen.getByRole("heading", { name: "Index" }),
      ).toBeInTheDocument();

      // 8-10 件目は IndexRow として表示される (zero-padded 番号)。
      // 全体連番 (Featured 1 + Bento 6 = 7 件オフセット) なので
      // 8 件目=08, 9 件目=09, 10 件目=10。
      expect(screen.getByText("08")).toBeInTheDocument();
      expect(screen.getByText("09")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();

      // Index リンクが正しい記事 ID を持つ
      const link8 = screen.getByRole("link", { name: "テスト記事8" });
      expect(link8).toHaveAttribute("href", "/posts/post-008");
    });

    it("7 件以下では Index セクションは表示されない", () => {
      const posts = buildMockPosts(7);
      render(
        <MemoryRouter>
          <HomePage
            posts={posts}
            currentPage={1}
            totalPages={1}
            onPageChange={mockOnPageChange}
          />
        </MemoryRouter>,
      );

      expect(
        screen.queryByRole("heading", { name: "Index" }),
      ).not.toBeInTheDocument();
    });

    it("1 件のみの場合 Bento セクションは表示されない", () => {
      const posts = buildMockPosts(1);
      render(
        <MemoryRouter>
          <HomePage
            posts={posts}
            currentPage={1}
            totalPages={1}
            onPageChange={mockOnPageChange}
          />
        </MemoryRouter>,
      );

      // 注目の記事 region は表示されない
      expect(
        screen.queryByRole("region", { name: "注目の記事" }),
      ).not.toBeInTheDocument();
    });
  });
});
