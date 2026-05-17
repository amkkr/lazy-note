import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Link } from "../Link";

describe("Link", () => {
  it("リンクテキストを表示できる", () => {
    render(
      <MemoryRouter>
        <Link to="/about">About Page</Link>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "About Page" }),
    ).toBeInTheDocument();
  });

  it("内部リンクとして機能する", () => {
    render(
      <MemoryRouter>
        <Link to="/contact">Contact</Link>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Contact" });
    expect(link).toHaveAttribute("href", "/contact");
  });

  it("external=trueの場合、外部リンクとしてレンダリングされる", () => {
    render(
      <MemoryRouter>
        <Link to="https://example.com" external>
          External Site
        </Link>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "External Site" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("デフォルトでdefaultスタイルになる", () => {
    render(
      <MemoryRouter>
        <Link to="/home">Home</Link>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("data-variant", "default");
  });

  it("navigationスタイルに変更できる", () => {
    render(
      <MemoryRouter>
        <Link to="/nav" variant="navigation">
          Navigation Link
        </Link>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Navigation Link" });
    expect(link).toHaveAttribute("data-variant", "navigation");
  });

  it("buttonスタイルに変更できる", () => {
    render(
      <MemoryRouter>
        <Link to="/action" variant="button">
          Button Link
        </Link>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Button Link" });
    expect(link).toHaveAttribute("data-variant", "button");
  });

  it("cardスタイルに変更できる", () => {
    render(
      <MemoryRouter>
        <Link to="/card" variant="card">
          Card Link
        </Link>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Card Link" });
    expect(link).toHaveAttribute("data-variant", "card");
  });

  it("カスタムCSSクラスを追加できる", () => {
    render(
      <MemoryRouter>
        <Link to="/custom" className="custom-link-class">
          Custom Class Link
        </Link>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Custom Class Link" });
    expect(link.className).toContain("custom-link-class");
  });

  it("複数の子要素を受け入れる", () => {
    render(
      <MemoryRouter>
        <Link to="/multi">
          <span>Icon</span>
          <span>Text</span>
        </Link>
      </MemoryRouter>,
    );

    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("外部リンクにvariantを設定できる", () => {
    render(
      <MemoryRouter>
        <Link to="https://example.com" external variant="button">
          External Button
        </Link>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "External Button" });
    expect(link).toHaveAttribute("data-variant", "button");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("ルート相対パスでリンクできる", () => {
    render(
      <MemoryRouter>
        <Link to="/">Home</Link>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("ページ内アンカーリンクとして機能する", () => {
    render(
      <MemoryRouter>
        <Link to="#section">Section</Link>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Section" });
    expect(link).toHaveAttribute("href", "/#section");
  });

  // ====================================================================
  // Editorial Citrus token Tripwire テスト (R-2b / Issue #389、Issue #422 で刷新)
  //
  // Issue #422 (DA レビュー): className 文字列マッチは Panda の `hash: true`
  // で破綻するため、Component 側が吐く `data-token-*` 属性で検証する形に
  // 変更。hash 化耐性 + 意味性を両立する。
  // ====================================================================
  describe("Editorial Citrus token 参照 (Tripwire)", () => {
    it("default variant は accent.link を color token として宣言する", () => {
      render(
        <MemoryRouter>
          <Link to="/home">Home</Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Home" });
      expect(link).toHaveAttribute("data-token-color", "accent.link");
    });

    it("navigation variant は accent.link を color token として宣言する", () => {
      render(
        <MemoryRouter>
          <Link to="/nav" variant="navigation">
            Nav
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Nav" });
      expect(link).toHaveAttribute("data-token-color", "accent.link");
    });

    it("button variant は accent.brand を background token として宣言する", () => {
      render(
        <MemoryRouter>
          <Link to="/cta" variant="button">
            CTA
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "CTA" });
      expect(link).toHaveAttribute("data-token-bg", "accent.brand");
    });

    // Issue #474 DA レビュー: 旧 PR で `data-token-color="fg.onBrand"` を吐いて
    // いたが、実 CSS は primitive (`cream.50` / `ink.900`) 直書きであり
    // 嘘になっていた。修正後は実 CSS と一致する primitive を `data-token-color`
    // に、将来の置換予定先を `data-token-color-todo` に分離する。
    it("button variant は実 CSS と一致する primitive (cream.50/ink.900) を color として宣言する", () => {
      render(
        <MemoryRouter>
          <Link to="/cta" variant="button">
            CTA
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "CTA" });
      expect(link).toHaveAttribute("data-token-color", "cream.50/ink.900");
    });

    it("button variant は R-2c+ で置換予定の fg.onBrand を TODO として併記する", () => {
      render(
        <MemoryRouter>
          <Link to="/cta" variant="button">
            CTA
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "CTA" });
      expect(link).toHaveAttribute("data-token-color-todo", "fg.onBrand");
    });

    it("card variant は hover 時に accent.link を color token として宣言する", () => {
      render(
        <MemoryRouter>
          <Link to="/card" variant="card">
            Card
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Card" });
      expect(link).toHaveAttribute("data-token-hover-color", "accent.link");
    });

    // Issue #477: card variant の `color: inherit` は Panda token ではなく
    // CSS キーワード (カスケード継承)。PR #474 (Issue #422) ではこれを
    // `data-token-color="inherit"` で吐いていたが (この属性は master には存在せず
    // PR #474 で導入)、`data-token-color` は token 名のみを吐く属性スキーマのため、
    // card variant では `data-token-color` を吐かず、継承を
    // `data-color-inherit="true"` で別属性として宣言するように修正する。
    it("card variant は color のカスケード継承を data-color-inherit で宣言する", () => {
      render(
        <MemoryRouter>
          <Link to="/card" variant="card">
            Card
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Card" });
      expect(link).toHaveAttribute("data-color-inherit", "true");
    });

    it("card variant は token 名でない inherit を data-token-color に吐かない", () => {
      render(
        <MemoryRouter>
          <Link to="/card" variant="card">
            Card
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Card" });
      expect(link).not.toHaveAttribute("data-token-color");
    });
  });

  // ====================================================================
  // View Transitions (Issue #397)
  // ====================================================================
  describe("View Transitions", () => {
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    let originalStartVT: any;

    beforeEach(() => {
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      originalStartVT = (document as any).startViewTransition;
    });

    afterEach(() => {
      if (originalStartVT === undefined) {
        // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
        delete (document as any).startViewTransition;
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
        (document as any).startViewTransition = originalStartVT;
      }
    });

    it("viewTransition=true でクリックすると startViewTransition 経由で navigate される", () => {
      const startVTSpy = vi.fn((cb: () => void) => {
        cb();
      });
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      (document as any).startViewTransition = startVTSpy;

      render(
        <MemoryRouter>
          <Link to="/posts/foo" viewTransition>
            VT Link
          </Link>
        </MemoryRouter>,
      );

      const link = screen.getByRole("link", { name: "VT Link" });
      fireEvent.click(link);

      // startViewTransition が呼ばれていれば、preventDefault → vtNavigate のパスが
      // 機能している証拠となる。
      expect(startVTSpy).toHaveBeenCalledTimes(1);
    });

    it("viewTransition=false ではクリック時に startViewTransition を呼ばない", () => {
      const startVTSpy = vi.fn();
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      (document as any).startViewTransition = startVTSpy;

      render(
        <MemoryRouter>
          <Link to="/posts/bar">No VT Link</Link>
        </MemoryRouter>,
      );

      const link = screen.getByRole("link", { name: "No VT Link" });
      fireEvent.click(link);

      expect(startVTSpy).not.toHaveBeenCalled();
    });

    it("修飾キー併用クリック (Cmd) では preventDefault せずブラウザ既定挙動に委ねる", () => {
      const startVTSpy = vi.fn();
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      (document as any).startViewTransition = startVTSpy;

      render(
        <MemoryRouter>
          <Link to="/posts/baz" viewTransition>
            Cmd Click
          </Link>
        </MemoryRouter>,
      );

      const link = screen.getByRole("link", { name: "Cmd Click" });
      fireEvent.click(link, { metaKey: true });

      // 新規タブを開く意図なので VT は発火させない
      expect(startVTSpy).not.toHaveBeenCalled();
    });

    it("style prop を inline style として伝播する", () => {
      render(
        <MemoryRouter>
          <Link to="/styled" style={{ viewTransitionName: "custom-vt-name" }}>
            Styled
          </Link>
        </MemoryRouter>,
      );

      const link = screen.getByRole("link", { name: "Styled" });
      expect(link.style.viewTransitionName).toBe("custom-vt-name");
    });
  });

  // ====================================================================
  // R-5 (Issue #393) リンク下線挙動の Tripwire (Issue #422 で刷新)
  //
  // AC (ii): PostDetail 本文内のインラインリンクは underline を維持し、
  // Header / Footer ナビは下線なしで一貫させる。
  //
  // - default variant : 本文インラインリンク → text-decoration: underline
  // - navigation      : Header/Footer ナビ → text-decoration: none
  // - button          : CTA → text-decoration: none
  // - card            : カード → text-decoration: none
  //
  // 旧版は className `/td_underline/` / `/td_none/` で検証していたが、
  // hash 化耐性のため `data-text-decoration` 属性に集約。
  // ====================================================================
  describe("R-5 リンク下線挙動 (Issue #393)", () => {
    it("default variant は underline を text-decoration として宣言する", () => {
      render(
        <MemoryRouter>
          <Link to="/article">Inline</Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Inline" });
      expect(link).toHaveAttribute("data-text-decoration", "underline");
    });

    it("navigation variant は none を text-decoration として宣言する (下線なし)", () => {
      render(
        <MemoryRouter>
          <Link to="/nav" variant="navigation">
            Nav
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Nav" });
      expect(link).toHaveAttribute("data-text-decoration", "none");
    });

    it("button variant は none を text-decoration として宣言する (下線なし、CTA)", () => {
      render(
        <MemoryRouter>
          <Link to="/cta" variant="button">
            CTA
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "CTA" });
      expect(link).toHaveAttribute("data-text-decoration", "none");
    });

    it("card variant は none を text-decoration として宣言する (下線なし、カード全体)", () => {
      render(
        <MemoryRouter>
          <Link to="/card" variant="card">
            Card
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Card" });
      expect(link).toHaveAttribute("data-text-decoration", "none");
    });
  });
});
