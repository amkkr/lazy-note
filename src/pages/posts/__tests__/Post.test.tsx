import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Post as PostType } from "../../../lib/markdown";
import Post from "../Post";

// usePostフックをモック
vi.mock("../../../hooks/usePost", () => ({
  usePost: vi.fn(),
}));

// Layoutコンポーネントをモック
vi.mock("../../../components/layouts/Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { usePost } from "../../../hooks/usePost";

const mockPost: PostType = {
  id: "test-post-123",
  title: "モックテスト記事",
  content: "<p>モック記事の内容</p>",
  author: "モック著者",
  createdAt: "2024-01-20",
  rawContent: "# モックテスト記事\n\nモック記事の内容",
};

describe("Post", () => {
  it("ローディング中はスピナーが表示される", () => {
    vi.mocked(usePost).mockReturnValue({
      post: null,
      loading: true,
      notFound: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/posts/123"]}>
        <Routes>
          <Route path="/posts/:timestamp" element={<Post />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("記事を読み込み中...")).toBeInTheDocument();
  });

  it("記事が見つからない場合はEmptyStateが表示される", () => {
    vi.mocked(usePost).mockReturnValue({
      post: null,
      loading: false,
      notFound: true,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/posts/123"]}>
        <Routes>
          <Route path="/posts/:timestamp" element={<Post />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("記事が見つかりません")).toBeInTheDocument();
    expect(
      screen.getByText(
        "お探しの記事は削除されたか、URLが間違っている可能性があります。",
      ),
    ).toBeInTheDocument();

    const backLink = screen.getByRole("link", { name: "← 記事一覧に戻る" });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("記事が存在する場合はPostDetailPageが表示される", () => {
    vi.mocked(usePost).mockReturnValue({
      post: mockPost,
      loading: false,
      notFound: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/posts/123"]}>
        <Routes>
          <Route path="/posts/:timestamp" element={<Post />} />
        </Routes>
      </MemoryRouter>,
    );

    // PostDetailPageコンポーネントがレンダリングされることを確認
    expect(
      screen.getByRole("heading", { name: "モックテスト記事" }),
    ).toBeInTheDocument();
    expect(screen.getByText("モック著者")).toBeInTheDocument();
    expect(screen.getByText("2024-01-20")).toBeInTheDocument();
  });

  it("postがnullでnotFoundがfalseの場合もEmptyStateが表示される", () => {
    vi.mocked(usePost).mockReturnValue({
      post: null,
      loading: false,
      notFound: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={["/posts/123"]}>
        <Routes>
          <Route path="/posts/:timestamp" element={<Post />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("記事が見つかりません")).toBeInTheDocument();
  });
});
