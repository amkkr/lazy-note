import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../Button";

describe("Button", () => {
  it("ボタンテキストを表示できる", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("クリックできる", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("ボタンを非活性にできる", () => {
    render(<Button disabled>Disabled Button</Button>);

    const button = screen.getByRole("button", { name: "Disabled Button" });
    expect(button).toBeDisabled();
  });

  it("disabledの場合、クリックイベントが発火しない", () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled Button
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Disabled Button" });
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("デフォルトのtype属性はbutton", () => {
    render(<Button>Default Type</Button>);

    const button = screen.getByRole("button", { name: "Default Type" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("type属性をsubmitに設定できる", () => {
    render(<Button type="submit">Submit Button</Button>);

    const button = screen.getByRole("button", { name: "Submit Button" });
    expect(button).toHaveAttribute("type", "submit");
  });

  it("type属性をresetに設定できる", () => {
    render(<Button type="reset">Reset Button</Button>);

    const button = screen.getByRole("button", { name: "Reset Button" });
    expect(button).toHaveAttribute("type", "reset");
  });

  it("カスタムCSSクラスを追加できる", () => {
    render(<Button className="custom-class">Custom Class</Button>);

    const button = screen.getByRole("button", { name: "Custom Class" });
    expect(button.className).toContain("custom-class");
  });

  it("デフォルトでprimaryスタイルになる", () => {
    render(<Button>Primary Button</Button>);
    const button = screen.getByRole("button", { name: "Primary Button" });
    expect(button).toHaveAttribute("data-variant", "primary");
  });

  it("secondaryスタイルに変更できる", () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByRole("button", { name: "Secondary Button" });
    expect(button).toHaveAttribute("data-variant", "secondary");
  });

  it("ghostスタイルに変更できる", () => {
    render(<Button variant="ghost">Ghost Button</Button>);
    const button = screen.getByRole("button", { name: "Ghost Button" });
    expect(button).toHaveAttribute("data-variant", "ghost");
  });

  it("デフォルトでmediumサイズになる", () => {
    render(<Button>Medium Button</Button>);
    const button = screen.getByRole("button", { name: "Medium Button" });
    expect(button).toHaveAttribute("data-size", "medium");
  });

  it("smallサイズに変更できる", () => {
    render(<Button size="small">Small Button</Button>);
    const button = screen.getByRole("button", { name: "Small Button" });
    expect(button).toHaveAttribute("data-size", "small");
  });

  it("largeサイズに変更できる", () => {
    render(<Button size="large">Large Button</Button>);
    const button = screen.getByRole("button", { name: "Large Button" });
    expect(button).toHaveAttribute("data-size", "large");
  });

  it("複数の子要素を受け入れる", () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>,
    );

    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  // ====================================================================
  // Editorial Citrus token Tripwire テスト (R-2b / Issue #389、Issue #422 で刷新)
  //
  // Issue #422 (DA レビュー): jsdom は CSSOM の var() 解決を実装しないため
  // `getComputedStyle` ベースの検証は物理的に動作不能。className 文字列
  // (`/bg_accent\.brand/`) は Panda の `hash: true` オプションを将来有効化
  // した場合に全滅する脆弱性を持つ。
  //
  // 対応: コンポーネント側で `data-token-bg` / `data-token-border` 等の
  // 意味属性を吐き、テストは `toHaveAttribute` で検証する (Option A: Panda
  // recipe + data 属性方式)。hash 化耐性 + 意味性を両立する。
  // ====================================================================
  describe("Editorial Citrus token 参照 (Tripwire)", () => {
    it("primary variant は accent.brand を background token として宣言する", () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole("button", { name: "Primary" });
      expect(button).toHaveAttribute("data-token-bg", "accent.brand");
    });

    it("secondary variant は bg.surface を background token として宣言する", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button", { name: "Secondary" });
      // R-2b 修正: bg.elevated × border bg.surface の同色問題を回避するため、
      // bg を bg.surface に反転している。
      expect(button).toHaveAttribute("data-token-bg", "bg.surface");
    });

    // Issue #421: bg.elevated 反転 border は light で 1.06:1 となり視覚消失
    // していた。border 専用 token (border.subtle) に置換した後、Tripwire
    // テストで CI 検出する。
    it("secondary variant は border.subtle 専用 token を border として宣言する", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button", { name: "Secondary" });
      expect(button).toHaveAttribute("data-token-border", "border.subtle");
    });

    // Issue #421: hover 背景を bg.elevated から bg.muted に変更。
    // dark で bg.elevated × border.subtle = 2.25:1 となり 3:1 未達のため、
    // hover bg を bg.muted (sumi-650) に切り替えて 4.94:1 を確保する。
    it("secondary variant は hover 時の background token として bg.muted を宣言する", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button", { name: "Secondary" });
      expect(button).toHaveAttribute("data-token-hover-bg", "bg.muted");
    });

    it("ghost variant は accent.link を color token として宣言する", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button", { name: "Ghost" });
      expect(button).toHaveAttribute("data-token-color", "accent.link");
    });
  });

  // ====================================================================
  // R-5 (Issue #393) focus ring Tripwire (Issue #422 で刷新)
  //
  // 旧版は className に `var(--colors-focus-ring)` を含む `bx-sh_*` class
  // が付いていることを正規表現で検証していたが、Panda の hash 化で破綻する
  // ため `data-focus-ring` 属性 (default | on-accent) で検証する形に変更。
  //
  // 検証対象:
  // - primary  : `data-focus-ring="on-accent"` (focusRingOnAccentStyles 適用)
  // - secondary: `data-focus-ring="default"` (focusRingStyles 適用)
  // - ghost    : `data-focus-ring="default"`
  // ====================================================================
  describe("R-5 focus ring (Issue #393)", () => {
    it("primary variant は accent 上向け二重リング (on-accent) を宣言する", () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole("button", { name: "Primary" });
      expect(button).toHaveAttribute("data-focus-ring", "on-accent");
    });

    it("secondary variant は通常背景向け二重リング (default) を宣言する", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button", { name: "Secondary" });
      expect(button).toHaveAttribute("data-focus-ring", "default");
    });

    it("ghost variant も通常背景向け二重リング (default) を宣言する", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button", { name: "Ghost" });
      expect(button).toHaveAttribute("data-focus-ring", "default");
    });
  });
});
