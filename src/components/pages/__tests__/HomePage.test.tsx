import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Post } from "../../../lib/markdown";
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

  // Issue #419: 親 articleStyles の bg.surface 上に置く 1px divider について、
  // 旧 token (bg.elevated) は light 環境で外側との差が 1.06:1 で視覚消失していた。
  // border 専用 token (border.subtle) に置換した後、Tripwire テストで CI 検出する。
  it("articleHeader の borderBottom が border.subtle 専用 token を参照している", () => {
    const { container } = render(
      <MemoryRouter>
        <HomePage
          posts={mockPosts}
          currentPage={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
        />
      </MemoryRouter>,
    );

    // 各 article 要素の最初の子 div (articleHeader) を取得し、
    // Panda が生成する `bd-c_border.subtle` クラスが付与されているか検証。
    const articles = container.querySelectorAll("article");
    expect(articles.length).toBeGreaterThan(0);
    const articleHeader = articles[0]?.firstElementChild;
    expect(articleHeader).toBeInTheDocument();
    expect(articleHeader?.className).toMatch(/bd-c_border\.subtle/);
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
});
