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
  excerpt: "これはテスト記事の内容です。追加のコンテンツ",
  readingTimeMinutes: 1,
  toc: [{ id: "heading-0", text: "見出し", level: 2 }],
};

describe("PostDetailPage", () => {
  it("記事タイトルを表示できる", () => {
    render(
      <MemoryRouter>
        <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "テスト記事タイトル" }),
    ).toBeInTheDocument();
  });

  it("記事のメタ情報を表示できる", () => {
    render(
      <MemoryRouter>
        <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
      </MemoryRouter>,
    );

    expect(screen.getByText("テスト著者")).toBeInTheDocument();
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
  });

  it("記事コンテンツを表示できる", () => {
    render(
      <MemoryRouter>
        <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
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
        <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
      </MemoryRouter>,
    );

    const backLink = screen.getByRole("link", { name: /TOPに戻る/ });
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
        <PostDetailPage
          post={postWithoutTitle}
          olderPost={null}
          newerPost={null}
        />
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
        <PostDetailPage post={postWithHtml} olderPost={null} newerPost={null} />
      </MemoryRouter>,
    );

    expect(screen.getByText("パラグラフ")).toBeInTheDocument();
    expect(screen.getByText("リスト項目1")).toBeInTheDocument();
    expect(screen.getByText("リスト項目2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "リンク" })).toBeInTheDocument();
  });

  // ==========================================================================
  // Editorial Citrus 本文タイポグラフィ (Issue #391) の構造テスト。
  //
  // - Panda CSS が生成する className パターン (`[&_p]:max-w_prose` 等) を
  //   検証することで、prose 制約が想定要素に当たっていることを保証する。
  //   ハードコード値テスト (576px 等) を避け、トークン側の値変更に強くする。
  // - JSDOM 環境では Panda が生成する styles.css が読み込まれないため、
  //   getComputedStyle() ではなく className 文字列の包含で検証する。
  // ==========================================================================
  describe("本文 prose レイアウト", () => {
    /**
     * 本文コンテナ (paragraphs / lists / blockquote の親) を取得する。
     * className に Panda が生成した prose セレクタが付与された要素を選ぶ。
     */
    const getContentContainer = (): HTMLElement => {
      const paragraph = screen.getByText("これはテスト記事の内容です。");
      // 段落の親 = dangerouslySetInnerHTML の出力をラップする div、
      // さらにその親が contentRef の付いた本文コンテナ。
      const innerWrapper = paragraph.parentElement;
      const contentContainer = innerWrapper?.parentElement;
      if (!contentContainer) {
        throw new Error("本文コンテナを特定できませんでした");
      }
      return contentContainer;
    };

    it("本文コンテナの className に段落 max-width prose セレクタが含まれる", () => {
      render(
        <MemoryRouter>
          <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      // Panda は `"& p": { maxWidth: "prose" }` を `[&_p]:max-w_prose` に変換する。
      expect(contentContainer.className).toContain("[&_p]:max-w_prose");
    });

    it("本文コンテナの className に段落 line-height prose セレクタが含まれる", () => {
      render(
        <MemoryRouter>
          <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      expect(contentContainer.className).toContain("[&_p]:lh_prose");
    });

    it("本文コンテナの className に見出し (h1/h2/h3) max-width prose セレクタが含まれる", () => {
      render(
        <MemoryRouter>
          <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      // 見出し左端ずれ解消 (DA 致命 3) の検証。
      expect(contentContainer.className).toContain(
        "[&_h1,_&_h2,_&_h3]:max-w_prose",
      );
    });

    it("本文コンテナの className に table overflow-x auto セレクタが含まれる", () => {
      render(
        <MemoryRouter>
          <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      // GFM table 横スクロール退避 (DA 重大 1) の検証。
      expect(contentContainer.className).toContain("[&_table]:ov-x_auto");
    });

    it("本文コンテナの className に hr / dl / figure max-width prose セレクタが含まれる", () => {
      render(
        <MemoryRouter>
          <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      // GFM 周辺要素のレイアウト統一の検証。
      expect(contentContainer.className).toContain("[&_hr]:max-w_prose");
      expect(contentContainer.className).toContain("[&_dl]:max-w_prose");
      expect(contentContainer.className).toContain("[&_figure]:max-w_prose");
    });

    it("TOC は本文コンテナの外側に配置される", () => {
      render(
        <MemoryRouter>
          <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      const tocButton = screen.getByRole("button", { name: "目次" });
      // contentRef 内の "& ul" セレクタが TOC の <ul> に割り込まないよう、
      // TOC は本文コンテナの外側に物理配置されている (DA 致命 2)。
      expect(contentContainer.contains(tocButton)).toBe(false);
    });
  });

  // ==========================================================================
  // Issue #409: bg.muted / border.subtle 階層 token 新設の Tripwire。
  //
  // R-2b/R-2c で旧 5 段階を 3 段階に圧縮した結果、border に bg.elevated を流用
  // すると外側 bg.canvas と同色化して視覚消失する設計上の問題があった。
  // border.subtle (border 専用色) で 1.4.11 (3:1) を確保している。
  // ==========================================================================
  describe("border.subtle 階層 token 適用", () => {
    it("article の border が border.subtle 専用 token を参照している", () => {
      const { container } = render(
        <MemoryRouter>
          <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
        </MemoryRouter>,
      );

      const article = container.querySelector("article");
      expect(article).toBeInTheDocument();
      // Panda は `borderColor: "border.subtle"` を `bd-c_border.subtle` 等に変換する。
      expect(article?.className).toMatch(/bd-c_border\.subtle/);
    });

    it("ページナビゲーションの borderBottom が border.subtle を参照している", () => {
      const { container } = render(
        <MemoryRouter>
          <PostDetailPage post={mockPost} olderPost={null} newerPost={null} />
        </MemoryRouter>,
      );

      const nav = container.querySelector('nav[aria-label="ページナビゲーション"]');
      expect(nav).toBeInTheDocument();
      expect(nav?.className).toMatch(/bd-c_border\.subtle/);
    });
  });
});
