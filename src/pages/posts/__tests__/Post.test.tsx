import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Post as PostType } from "../../../lib/markdown";
import Post from "../Post";

vi.mock("../../../hooks/usePost", () => ({
  usePost: vi.fn(),
}));

vi.mock("../../../hooks/useAdjacentPosts", () => ({
  useAdjacentPosts: vi.fn(() => ({
    olderPost: null,
    newerPost: null,
    loading: false,
  })),
}));

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
  excerpt: "モック記事の内容",
  readingTimeMinutes: 1,
  toc: [],
};

describe("Post", () => {
  it("ローディング中はスケルトンローディングが表示される", () => {
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

    expect(screen.getByLabelText("記事を読み込み中")).toBeInTheDocument();
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

    // Issue #708: 矢印「←」を aria-hidden な装飾 span に分離したため、
    // リンクのアクセシブル名は矢印を含まない「記事一覧に戻る」になる。
    const backLink = screen.getByRole("link", { name: "記事一覧に戻る" });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/");
    // 矢印付きの名前ではアクセシブル名として一致しないことも保証する。
    expect(
      screen.queryByRole("link", { name: "← 記事一覧に戻る" }),
    ).not.toBeInTheDocument();
  });

  it("記事未検出リンクの矢印が aria-hidden の装飾要素になる", () => {
    // Issue #708 / #709 方式 b-1: 装飾矢印は HTML 文字列として保持しつつ
    // aria-hidden で SR から隠す。リンク内にスコープして矢印 span を取得する。
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

    const backLink = screen.getByRole("link", { name: "記事一覧に戻る" });
    const decorativeArrow = backLink.querySelector('[aria-hidden="true"]');
    expect(decorativeArrow?.textContent).toBe("←");
  });

  it("記事が見つからない場合は document.title を未検出フォールバックにできる", () => {
    // React 19 ネイティブ metadata: 未検出 EmptyState 経路でも
    // `記事が見つかりません | Lazy Note` をタブ文言に確定させる。
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

    expect(document.title).toBe("記事が見つかりません | Lazy Note");
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
