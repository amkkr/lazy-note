import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Milestone } from "../../../lib/anchors";
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
        <PostDetailPage
          post={mockPost}
          olderPost={null}
          newerPost={null}
          milestones={[]}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "テスト記事タイトル" }),
    ).toBeInTheDocument();
  });

  it("記事のメタ情報を表示できる", () => {
    render(
      <MemoryRouter>
        <PostDetailPage
          post={mockPost}
          olderPost={null}
          newerPost={null}
          milestones={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("テスト著者")).toBeInTheDocument();
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
  });

  it("記事コンテンツを表示できる", () => {
    render(
      <MemoryRouter>
        <PostDetailPage
          post={mockPost}
          olderPost={null}
          newerPost={null}
          milestones={[]}
        />
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
        <PostDetailPage
          post={mockPost}
          olderPost={null}
          newerPost={null}
          milestones={[]}
        />
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
          milestones={[]}
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
        <PostDetailPage
          post={postWithHtml}
          olderPost={null}
          newerPost={null}
          milestones={[]}
        />
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
  // Issue #480: 旧実装は Panda が生成する arbitrary selector の className
  // (`[&_p]:max-w_prose` 等) を `toContain` で検証していたが、`hash: true` で
  // class 名が hash 化されると破綻する。PR #474 の Option A に倣い、本文
  // コンテナ (p / h1-h3 / ul / ol / blockquote / dl / figure / table / hr に
  // prose 制約を適用する div) であることを `data-prose-scope` 意味属性で
  // 宣言し、テストは `toHaveAttribute` で検証する。prose の値そのもの
  // (max-width 576px 等) は Panda token 定義側のテスト責務とし、ここでは
  // 「本文コンテナが prose scope として宣言されている」構造と、prose 制約の
  // 対象要素 (段落 / 見出し / table 等) がその scope の内側に物理配置されて
  // いる構造を保証する。
  // ==========================================================================
  describe("本文 prose レイアウト", () => {
    /**
     * 本文コンテナ (paragraphs / lists / blockquote の親) を取得する。
     * prose 制約を適用する本文コンテナは `data-prose-scope="article-content"`
     * 意味属性を持つ。
     */
    const getContentContainer = (): HTMLElement => {
      const contentContainer = document.querySelector<HTMLElement>(
        '[data-prose-scope="article-content"]',
      );
      if (!contentContainer) {
        throw new Error("本文コンテナを特定できませんでした");
      }
      return contentContainer;
    };

    it("本文コンテナが prose scope として宣言される", () => {
      render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPost}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      // 本文要素 (p / h1-h3 / ul / ol / blockquote / dl / figure / table / hr)
      // に prose レイアウト制約 (max-width prose + margin auto + line-height
      // prose) を適用するコンテナであることを宣言する属性。
      expect(contentContainer).toHaveAttribute(
        "data-prose-scope",
        "article-content",
      );
    });

    it("段落が prose scope コンテナの内側に配置される", () => {
      render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPost}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      const paragraph = screen.getByText("これはテスト記事の内容です。");
      // `& p` セレクタの max-width prose / line-height prose を受けるよう、
      // 段落が prose scope の内側に物理配置されていることを保証する。
      expect(contentContainer.contains(paragraph)).toBe(true);
    });

    it("見出し (h2) が prose scope コンテナの内側に配置される", () => {
      render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPost}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      const heading = screen.getByRole("heading", { name: "見出し" });
      // 見出し左端ずれ解消 (DA 致命 3): 見出しも prose scope の内側にあり
      // `& h1, & h2, & h3` セレクタの max-width prose を受ける。
      expect(contentContainer.contains(heading)).toBe(true);
    });

    it("table が prose scope コンテナの内側に配置される", () => {
      const postWithTable: Post = {
        ...mockPost,
        content:
          "<table><thead><tr><th>列見出し</th></tr></thead><tbody><tr><td>セル値</td></tr></tbody></table>",
      };

      render(
        <MemoryRouter>
          <PostDetailPage
            post={postWithTable}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      const table = screen.getByRole("table");
      // GFM table 横スクロール退避 (DA 重大 1): table も prose scope の
      // 内側にあり `& table` セレクタの overflow-x auto / max-width prose を受ける。
      expect(contentContainer.contains(table)).toBe(true);
    });

    it("リストが prose scope コンテナの内側に配置される", () => {
      const postWithList: Post = {
        ...mockPost,
        content: "<ul><li>箇条書き項目</li></ul>",
      };

      render(
        <MemoryRouter>
          <PostDetailPage
            post={postWithList}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
        </MemoryRouter>,
      );

      const contentContainer = getContentContainer();
      // GFM 周辺要素のレイアウト統一: リストも prose scope の内側にあり
      // `& ul, & ol` セレクタの max-width prose / line-height prose を受ける。
      // TOC も <ul> を描画するため、prose scope の内側に限定して取得する。
      const list = within(contentContainer).getByRole("list");
      expect(contentContainer.contains(list)).toBe(true);
    });

    it("TOC は本文コンテナの外側に配置される", () => {
      render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPost}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
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
  // Issue #409 / Issue #422: bg.muted / border.subtle 階層 token 新設の Tripwire。
  //
  // R-2b/R-2c で旧 5 段階を 3 段階に圧縮した結果、border に bg.elevated を流用
  // すると外側 bg.canvas と同色化して視覚消失する設計上の問題があった。
  // border.subtle (border 専用色) で 1.4.11 (3:1) を確保している。
  //
  // Issue #422 (PR #474): className 文字列マッチを `data-token-border` /
  // `data-divider` 意味属性に置換 (Panda `hash: true` 耐性、Option A)。
  // これらの data 属性は master には存在せず PR #474 で導入された。
  // Issue #477: divider も border token を参照するだけのため、PR #474 で導入した
  // `data-divider` を他の border 参照と同じ `data-token-border` 命名に統一した。
  // ==========================================================================
  describe("border.subtle 階層 token 適用", () => {
    it("article は border.subtle 専用 token を border として宣言する", () => {
      const { container } = render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPost}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
        </MemoryRouter>,
      );

      const article = container.querySelector("article");
      expect(article).toBeInTheDocument();
      expect(article).toHaveAttribute("data-token-border", "border.subtle");
    });

    it("ページナビゲーションは border.subtle を border として宣言する", () => {
      const { container } = render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPost}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
        </MemoryRouter>,
      );

      const nav = container.querySelector(
        'nav[aria-label="ページナビゲーション"]',
      );
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute("data-token-border", "border.subtle");
    });

    // Issue #458: header と本文の間の 1px divider は、旧実装で bg.elevated を
    // background に流用しており light テーマでは bg.surface との差が 1.06:1 と
    // 薄く視覚消失していた。borderTop + border.subtle に変更したことを
    // `data-token-border` 意味属性で保証する (PR #474 で導入された `data-divider`
    // を Issue #477 で他の border 参照と同じ命名に統一)。
    it("header と本文の間の divider が borderTop + border.subtle を宣言する", () => {
      const { container } = render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPost}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
        </MemoryRouter>,
      );

      const article = container.querySelector("article");
      const header = article?.querySelector("header");
      const divider = header?.nextElementSibling as HTMLElement | null;
      expect(divider).not.toBeNull();
      expect(divider).toHaveAttribute("data-token-border", "border.subtle");
    });
  });

  // ==========================================================================
  // View Transitions Hero morph (Issue #397)
  //
  // 記事詳細の H1 に `view-transition-name: post-{id}` のインラインスタイルが
  // 付与され、HomePage 側 (FeaturedCard / BentoCard / IndexRow) のタイトルと
  // 同じ name で morph が成立することを検証する。
  // ==========================================================================
  describe("View Transitions Hero morph", () => {
    it("H1 に view-transition-name: post-{id} を付与する", () => {
      render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPost}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
        </MemoryRouter>,
      );

      const heading = screen.getByRole("heading", {
        name: "テスト記事タイトル",
        level: 1,
      });
      expect(heading.style.viewTransitionName).toBe("post-test-post");
    });
  });

  // ==========================================================================
  // Coordinate 表示 (Issue #491 / Anchor の3つの顔のひとつ「座標」)
  //
  // 記事詳細の MetaInfo 近傍に「{label} から N 日目」を静かに一行で並べる。
  // - post.id (YYYYMMDDhhmmss) から publishedAt を逆算する
  // - milestones prop は required (Issue #533)、showCoordinate prop は
  //   optional で既定 true (撤退時の OFF フラグ専用)
  // - 空配列 / showCoordinate=false / publishedAt 推定不可 のいずれかで非表示
  // ==========================================================================
  describe("Coordinate 表示", () => {
    /**
     * publishedAt 推定可能なタイムスタンプ形式の id を持つ Post fixture。
     *
     * 2026-03-07 12:00:00 JST 公開を想定し、節目 (2025-01-01 サイト開設) との
     * 差分を Coordinate が「サイト開設 から N 日目」として描画することを検証する。
     */
    const mockPostWithTimestamp: Post = {
      ...mockPost,
      id: "20260307120000",
    };

    const baseMilestones: readonly Milestone[] = [
      { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
    ];

    it("milestones を渡すと過去の節目の Coordinate を描画する", () => {
      render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPostWithTimestamp}
            olderPost={null}
            newerPost={null}
            milestones={baseMilestones}
          />
        </MemoryRouter>,
      );

      expect(
        screen.getByRole("list", { name: "個人史座標" }),
      ).toBeInTheDocument();
      expect(screen.getByText(/サイト開設/)).toBeInTheDocument();
    });

    it("milestones が空配列のとき Coordinate を描画しない", () => {
      render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPostWithTimestamp}
            olderPost={null}
            newerPost={null}
            milestones={[]}
          />
        </MemoryRouter>,
      );

      // Issue #533: milestones を required 化したため「未指定」のケースは型的に
      // 成立しない。撤退時の挙動 (空配列で Coordinate を描画しない) を担保する。
      expect(
        screen.queryByRole("list", { name: "個人史座標" }),
      ).not.toBeInTheDocument();
    });

    it("showCoordinate=false で milestones が渡っていても非表示にできる", () => {
      render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPostWithTimestamp}
            olderPost={null}
            newerPost={null}
            milestones={baseMilestones}
            showCoordinate={false}
          />
        </MemoryRouter>,
      );

      expect(
        screen.queryByRole("list", { name: "個人史座標" }),
      ).not.toBeInTheDocument();
    });

    it("post.id がタイムスタンプ形式でない (publishedAt 推定不可) ときは Coordinate を描画しない", () => {
      // mockPost.id="test-post" は YYYYMMDDhhmmss にマッチしないため
      // inferPublishedAt が null を返し、Coordinate は描画されない
      render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPost}
            olderPost={null}
            newerPost={null}
            milestones={baseMilestones}
          />
        </MemoryRouter>,
      );

      expect(
        screen.queryByRole("list", { name: "個人史座標" }),
      ).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // axe a11y 違反検証 (Issue #491 AC: 「axe で PostDetailPage に新規違反が
  // 出ないこと」)
  //
  // Coordinate を組み込んだ PostDetailPage の描画結果に axe-core の検出する
  // a11y 違反が含まれないことを保証する。Coordinate 単体のテストと別に
  // PostDetailPage 全体での違反 0 件を確認することで、ページ統合時の
  // ARIA 構造 (heading 階層 / landmark / list 等) 整合性を検証する。
  // ==========================================================================
  describe("axe a11y 違反検証", () => {
    const baseMilestones: readonly Milestone[] = [
      { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
    ];
    const mockPostWithTimestamp: Post = {
      ...mockPost,
      id: "20260307120000",
    };

    it("Coordinate を含む PostDetailPage 全体で axe a11y 違反が 0 件である", async () => {
      const { container } = render(
        <MemoryRouter>
          <PostDetailPage
            post={mockPostWithTimestamp}
            olderPost={null}
            newerPost={null}
            milestones={baseMilestones}
          />
        </MemoryRouter>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
