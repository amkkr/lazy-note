import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
  },
  {
    id: "test-post-2",
    title: "テスト記事2",
    content: "テストコンテンツ2",
    author: "著者2",
    createdAt: "2024-01-02",
    rawContent: "# テスト記事2\n\nテストコンテンツ2",
  },
];

describe("HomePage", () => {
  it("記事がない場合はEmptyStateが表示される", () => {
    render(
      <MemoryRouter>
        <HomePage posts={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText("新しい記事をお楽しみに")).toBeInTheDocument();
    expect(
      screen.getByText(
        "まもなく素晴らしい記事が公開される予定です。創造性に満ちたコンテンツをお届けします。"
      )
    ).toBeInTheDocument();
  });

  it("記事一覧を表示できる", () => {
    render(
      <MemoryRouter>
        <HomePage posts={mockPosts} />
      </MemoryRouter>
    );

    expect(screen.getByText("テスト記事1")).toBeInTheDocument();
    expect(screen.getByText("テスト記事2")).toBeInTheDocument();
  });

  it("各記事のメタ情報を表示できる", () => {
    render(
      <MemoryRouter>
        <HomePage posts={mockPosts} />
      </MemoryRouter>
    );

    expect(screen.getByText("著者1")).toBeInTheDocument();
    expect(screen.getByText("著者2")).toBeInTheDocument();
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("2024-01-02")).toBeInTheDocument();
  });

  it("記事タイトルをリンクにできる", () => {
    render(
      <MemoryRouter>
        <HomePage posts={mockPosts} />
      </MemoryRouter>
    );

    const link1 = screen.getByRole("link", { name: "テスト記事1" });
    expect(link1).toHaveAttribute("href", "/posts/test-post-1");

    const link2 = screen.getByRole("link", { name: "テスト記事2" });
    expect(link2).toHaveAttribute("href", "/posts/test-post-2");
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
      },
    ];

    render(
      <MemoryRouter>
        <HomePage posts={postsWithoutTitle} />
      </MemoryRouter>
    );

    expect(screen.getByText("無題の記事")).toBeInTheDocument();
  });
});