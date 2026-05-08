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
    const { container: defaultContainer } = render(
      <MemoryRouter>
        <Link to="/home">Home</Link>
      </MemoryRouter>,
    );
    const { container: navContainer } = render(
      <MemoryRouter>
        <Link to="/nav" variant="navigation">
          Navigation Link
        </Link>
      </MemoryRouter>,
    );

    const defaultClass = defaultContainer.querySelector("a")?.className;
    const navClass = navContainer.querySelector("a")?.className;
    expect(defaultClass).not.toBe("");
    expect(defaultClass).not.toBe(navClass);
  });

  it("navigationスタイルに変更できる", () => {
    const { container: navContainer } = render(
      <MemoryRouter>
        <Link to="/nav" variant="navigation">
          Navigation Link
        </Link>
      </MemoryRouter>,
    );
    const { container: buttonContainer } = render(
      <MemoryRouter>
        <Link to="/action" variant="button">
          Button Link
        </Link>
      </MemoryRouter>,
    );

    const navClass = navContainer.querySelector("a")?.className;
    const buttonClass = buttonContainer.querySelector("a")?.className;
    expect(navClass).not.toBe("");
    expect(navClass).not.toBe(buttonClass);
  });

  it("buttonスタイルに変更できる", () => {
    const { container: buttonContainer } = render(
      <MemoryRouter>
        <Link to="/action" variant="button">
          Button Link
        </Link>
      </MemoryRouter>,
    );
    const { container: cardContainer } = render(
      <MemoryRouter>
        <Link to="/card" variant="card">
          Card Link
        </Link>
      </MemoryRouter>,
    );

    const buttonClass = buttonContainer.querySelector("a")?.className;
    const cardClass = cardContainer.querySelector("a")?.className;
    expect(buttonClass).not.toBe("");
    expect(buttonClass).not.toBe(cardClass);
  });

  it("cardスタイルに変更できる", () => {
    const { container: cardContainer } = render(
      <MemoryRouter>
        <Link to="/card" variant="card">
          Card Link
        </Link>
      </MemoryRouter>,
    );
    const { container: defaultContainer } = render(
      <MemoryRouter>
        <Link to="/home">Home</Link>
      </MemoryRouter>,
    );

    const cardClass = cardContainer.querySelector("a")?.className;
    const defaultClass = defaultContainer.querySelector("a")?.className;
    expect(cardClass).not.toBe("");
    expect(cardClass).not.toBe(defaultClass);
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
    const { container: buttonContainer } = render(
      <MemoryRouter>
        <Link to="https://example.com" external variant="button">
          External Button
        </Link>
      </MemoryRouter>,
    );
    const { container: defaultContainer } = render(
      <MemoryRouter>
        <Link to="https://example.com" external>
          External Default
        </Link>
      </MemoryRouter>,
    );

    const buttonClass = buttonContainer.querySelector("a")?.className;
    const defaultClass = defaultContainer.querySelector("a")?.className;
    expect(buttonClass).not.toBe("");
    expect(buttonClass).not.toBe(defaultClass);
    expect(buttonContainer.querySelector("a")).toHaveAttribute(
      "target",
      "_blank",
    );
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
  // Editorial Citrus token Tripwire テスト (R-2b / Issue #389)
  //
  // Panda CSS の生成 class 名 (例: "c_accent.link" / "bg_accent.brand")
  // を検証し、後続 R-2c での誤削除を CI で検出する。
  //
  // class 名は <css-prop-prefix>_<token-path> (literal "." を含む)。
  // 詳細は styled-system/styles.css を参照。
  // ====================================================================
  describe("Editorial Citrus token 参照 (Tripwire)", () => {
    it("default variant は accent.link の color class を持つ", () => {
      render(
        <MemoryRouter>
          <Link to="/home">Home</Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Home" });
      expect(link.className).toMatch(/c_accent\.link/);
    });

    it("navigation variant は accent.link の color class を持つ", () => {
      render(
        <MemoryRouter>
          <Link to="/nav" variant="navigation">
            Nav
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Nav" });
      expect(link.className).toMatch(/c_accent\.link/);
    });

    it("button variant は accent.brand の background class を持つ", () => {
      render(
        <MemoryRouter>
          <Link to="/cta" variant="button">
            CTA
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "CTA" });
      expect(link.className).toMatch(/bg_accent\.brand/);
    });

    it("card variant は hover 時に accent.link の color class が適用される", () => {
      render(
        <MemoryRouter>
          <Link to="/card" variant="card">
            Card
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Card" });
      // hover 時の class 名は &:hover キーで個別生成される。
      // Panda の生成名は [&:hover]:c_accent.link 形式となる。
      expect(link.className).toMatch(/c_accent\.link/);
    });
  });

  // ====================================================================
  // View Transitions (Issue #397)
  //
  // viewTransition prop が true の場合、クリック時に preventDefault され、
  // `document.startViewTransition` (利用可能な場合) でラップされた navigate
  // が実行される。jsdom 既定では VT 未対応のため graceful degrade で navigate
  // が即時実行される。
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
          <Link
            to="/styled"
            style={{ viewTransitionName: "custom-vt-name" }}
          >
            Styled
          </Link>
        </MemoryRouter>,
      );

      const link = screen.getByRole("link", { name: "Styled" });
      expect(link.style.viewTransitionName).toBe("custom-vt-name");
    });
  });

  // ====================================================================
  // R-5 (Issue #393) リンク下線挙動の Tripwire
  //
  // AC (ii): PostDetail 本文内のインラインリンクは underline を維持し、
  // Header / Footer ナビは下線なしで一貫させる。
  //
  // - default variant : 本文インラインリンク → text-decoration: underline
  // - navigation      : Header/Footer ナビ → text-decoration: none
  // - button          : CTA → text-decoration: none
  // - card            : カード → text-decoration: none
  //
  // Panda の class 名は `td_underline` `td_none` 形式で生成される。
  // ====================================================================
  describe("R-5 リンク下線挙動 (Issue #393)", () => {
    it("default variant は textDecoration: underline を持つ", () => {
      render(
        <MemoryRouter>
          <Link to="/article">Inline</Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Inline" });
      expect(link.className).toMatch(/td_underline/);
    });

    it("navigation variant は textDecoration: none を持つ (下線なし)", () => {
      render(
        <MemoryRouter>
          <Link to="/nav" variant="navigation">
            Nav
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Nav" });
      expect(link.className).toMatch(/td_none/);
    });

    it("button variant は textDecoration: none を持つ (下線なし、CTA)", () => {
      render(
        <MemoryRouter>
          <Link to="/cta" variant="button">
            CTA
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "CTA" });
      expect(link.className).toMatch(/td_none/);
    });

    it("card variant は textDecoration: none を持つ (下線なし、カード全体)", () => {
      render(
        <MemoryRouter>
          <Link to="/card" variant="card">
            Card
          </Link>
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Card" });
      expect(link.className).toMatch(/td_none/);
    });
  });
});
