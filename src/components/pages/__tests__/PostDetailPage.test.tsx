import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Post } from "../../../lib/markdown";
import { PostDetailPage } from "../PostDetailPage";

const mockPost: Post = {
  id: "test-post",
  title: "テスト記事タイトル",
  content:
    "<p>これはテスト記事の内容です。</p><h2>見出し</h2><p>追加のコンテンツ</p>",
  author: "テスト著者",
  createdAt: "2024-01-15",
  rawContent:
    "# テスト記事タイトル\n\nこれはテスト記事の内容です。\n\n## 見出し\n\n追加のコンテンツ",
};

describe("PostDetailPage", () => {
  it("記事タイトルを表示できる", () => {
    render(
      <MemoryRouter>
        <PostDetailPage post={mockPost} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "テスト記事タイトル" }),
    ).toBeInTheDocument();
  });

  it("記事のメタ情報を表示できる", () => {
    render(
      <MemoryRouter>
        <PostDetailPage post={mockPost} />
      </MemoryRouter>,
    );

    expect(screen.getByText("テスト著者")).toBeInTheDocument();
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
  });

  it("記事コンテンツを表示できる", () => {
    render(
      <MemoryRouter>
        <PostDetailPage post={mockPost} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("これはテスト記事の内容です。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "見出し" })).toBeInTheDocument();
    expect(screen.getByText("追加のコンテンツ")).toBeInTheDocument();
  });

  it("トップページへのリンクを表示できる", () => {
    render(
      <MemoryRouter>
        <PostDetailPage post={mockPost} />
      </MemoryRouter>,
    );

    const backLink = screen.getByRole("link", { name: /Lazy Note に戻る/ });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("タイトルがない記事は「無題の記事」と表示される", () => {
    const postWithoutTitle: Post = {
      ...mockPost,
      title: "",
    };

    render(
      <MemoryRouter>
        <PostDetailPage post={postWithoutTitle} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "無題の記事" }),
    ).toBeInTheDocument();
  });

  it("HTMLコンテンツを表示できる", () => {
    const postWithHtml: Post = {
      ...mockPost,
      content:
        '<p>パラグラフ</p><ul><li>リスト項目1</li><li>リスト項目2</li></ul><a href="#">リンク</a>',
    };

    render(
      <MemoryRouter>
        <PostDetailPage post={postWithHtml} />
      </MemoryRouter>,
    );

    expect(screen.getByText("パラグラフ")).toBeInTheDocument();
    expect(screen.getByText("リスト項目1")).toBeInTheDocument();
    expect(screen.getByText("リスト項目2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "リンク" })).toBeInTheDocument();
  });
});
