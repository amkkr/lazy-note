import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as usePostsHook from "../../hooks/usePosts";
import Index from "../index";

// usePostsカスタムフックをモック
vi.mock("../../hooks/usePosts");

const mockUsePosts = vi.mocked(usePostsHook.usePosts);

// テスト用のモックデータ
const mockPosts = [
  {
    id: "20240102120000",
    title: "2つ目の記事",
    createdAt: "2024-01-02 12:00",
    content: "<p>2つ目の記事の内容です。</p>",
    author: "花子",
    rawContent:
      "# 2つ目の記事\n\n## 投稿日時\n- 2024-01-02 12:00\n\n## 筆者名\n- 花子\n\n## 本文\n2つ目の記事の内容です。",
    excerpt: "2つ目の記事の内容です。",
    readingTimeMinutes: 1,
  },
  {
    id: "20240101100000",
    title: "最初の記事",
    createdAt: "2024-01-01 10:00",
    content: "<p>最初の記事の内容です。</p>",
    author: "太郎",
    rawContent:
      "# 最初の記事\n\n## 投稿日時\n- 2024-01-01 10:00\n\n## 筆者名\n- 太郎\n\n## 本文\n最初の記事の内容です。",
    excerpt: "最初の記事の内容です。",
    readingTimeMinutes: 1,
  },
];

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe("Indexコンポーネント", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("読み込み中にスケルトンローディングを表示する", async () => {
    // usePostsでローディング状態をモック
    mockUsePosts.mockReturnValue({
      posts: [],
      allPosts: [],
      loading: true,
      error: null,
      currentPage: 1,
      totalPages: 1,
      totalPosts: 0,
      setCurrentPage: vi.fn(),
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>,
    );

    expect(screen.getByLabelText("記事を読み込み中")).toBeInTheDocument();
  });

  describe("記事が存在する場合の表示", () => {
    beforeEach(() => {
      // Resurface (Issue #492) は usePosts.allPosts を入力に取るため、本テストでは
      // allPosts を空にして Resurface を非発火 (null) にして Featured/Bento/Index
      // 単独の振る舞いを検証する。Resurface 自体の振る舞いは
      // src/components/common/__tests__/Resurface.test.tsx と
      // src/lib/__tests__/resurface.test.ts で個別に検証済み。
      mockUsePosts.mockReturnValue({
        posts: mockPosts,
        allPosts: [],
        loading: false,
        error: null,
        currentPage: 1,
        totalPages: 1,
        totalPosts: 2,
        setCurrentPage: vi.fn(),
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>,
      );
    });

    it("ヘッダーとフッターにブランド名を表示できる", async () => {
      // R-4 (Issue #392) で Sparkles 装飾は削除済み。
      expect(screen.getAllByText("Lazy Note")).toHaveLength(2);
    });

    it("記事タイトルを見出しとして表示できる", async () => {
      expect(
        screen.getByRole("heading", { name: "2つ目の記事" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "最初の記事" }),
      ).toBeInTheDocument();
    });

    it("記事の投稿日時を表示できる", async () => {
      expect(screen.getByText("2024-01-02 12:00")).toBeInTheDocument();
      expect(screen.getByText("2024-01-01 10:00")).toBeInTheDocument();
    });

    it("記事の筆者名を表示できる", async () => {
      expect(screen.getByText("花子")).toBeInTheDocument();
      expect(screen.getByText("太郎")).toBeInTheDocument();
    });
  });

  it("記事がない場合に案内メッセージを表示する", async () => {
    mockUsePosts.mockReturnValue({
      posts: [],
      allPosts: [],
      loading: false,
      error: null,
      currentPage: 1,
      totalPages: 1,
      totalPosts: 0,
      setCurrentPage: vi.fn(),
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>,
    );

    expect(screen.getByText("新しい記事をお楽しみに")).toBeInTheDocument();
  });

  it("記事の読み込みでエラーが発生した場合に記事なしメッセージを表示する", async () => {
    mockUsePosts.mockReturnValue({
      posts: [],
      allPosts: [],
      loading: false,
      error: "ネットワークエラー",
      currentPage: 1,
      totalPages: 1,
      totalPosts: 0,
      setCurrentPage: vi.fn(),
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>,
    );

    expect(screen.getByText("新しい記事をお楽しみに")).toBeInTheDocument();
  });

  it("記事リンクを設定できる", async () => {
    // Resurface 非発火条件 (allPosts: []) で既存リンク振る舞いを検証する。
    mockUsePosts.mockReturnValue({
      posts: mockPosts,
      allPosts: [],
      loading: false,
      error: null,
      currentPage: 1,
      totalPages: 1,
      totalPosts: 2,
      setCurrentPage: vi.fn(),
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>,
    );

    const firstPostLink = screen.getByRole("link", { name: "2つ目の記事" });
    const secondPostLink = screen.getByRole("link", { name: "最初の記事" });

    expect(firstPostLink).toHaveAttribute("href", "/posts/20240102120000");
    expect(secondPostLink).toHaveAttribute("href", "/posts/20240101100000");
  });

  it("記事が投稿日時の新しい順でソートされている", async () => {
    // Resurface 非発火条件 (allPosts: []) で Featured/Bento の並びだけを検証する。
    mockUsePosts.mockReturnValue({
      posts: mockPosts,
      allPosts: [],
      loading: false,
      error: null,
      currentPage: 1,
      totalPages: 1,
      totalPosts: 2,
      setCurrentPage: vi.fn(),
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>,
    );

    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(2);

    // 最初の記事（新しい方）が上に表示されていることを確認
    const firstArticle = articles[0];
    const secondArticle = articles[1];

    expect(firstArticle).toHaveTextContent("2つ目の記事");
    expect(firstArticle).toHaveTextContent("2024-01-02 12:00");
    expect(secondArticle).toHaveTextContent("最初の記事");
    expect(secondArticle).toHaveTextContent("2024-01-01 10:00");
  });

  describe("Resurface 連携 (Issue #492 / N-5)", () => {
    /**
     * Resurface は usePosts.allPosts を入力に取り、selectResurfaced で
     * 浮上対象を選定する。HomePage に entry が伝播して描画されることを確認する。
     *
     * モック記事の id (例: 20240102120000) は inferPublishedAt で解決可能なため、
     * today (現実時計) との差分で沈黙トリガーが発火する想定 (2026 年時点では
     * 2024-01-02 から 30 日以上経過 → 沈黙トリガー)。
     */
    it("allPosts に沈黙トリガー条件を満たす記事があると、Resurface セクションが描画される", () => {
      mockUsePosts.mockReturnValue({
        posts: mockPosts,
        allPosts: mockPosts,
        loading: false,
        error: null,
        currentPage: 1,
        totalPages: 1,
        totalPosts: 2,
        setCurrentPage: vi.fn(),
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>,
      );

      // 「過去の記事」セクションが描画される
      expect(
        screen.getByRole("region", { name: "過去の記事" }),
      ).toBeInTheDocument();
    });

    it("allPosts が空の場合、Resurface セクションは描画されない", () => {
      mockUsePosts.mockReturnValue({
        posts: mockPosts,
        allPosts: [],
        loading: false,
        error: null,
        currentPage: 1,
        totalPages: 1,
        totalPosts: 2,
        setCurrentPage: vi.fn(),
      });

      render(
        <TestWrapper>
          <Index />
        </TestWrapper>,
      );

      expect(
        screen.queryByRole("region", { name: "過去の記事" }),
      ).not.toBeInTheDocument();
    });
  });
});
