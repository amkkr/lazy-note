import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BrandName } from "../BrandName";

describe("BrandName", () => {
  // Issue #422: 旧版は Panda の class 名 (`fs_lg` / `fs_sm`) で variant を判定
  // していたが、`hash: true` 耐性のため `data-variant` 意味属性に切り替えた。
  it("ヘッダースタイルで表示できる", () => {
    render(
      <MemoryRouter>
        <BrandName variant="header" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Lazy Note" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("data-variant", "header");
  });

  it("フッタースタイルで表示できる", () => {
    render(
      <MemoryRouter>
        <BrandName variant="footer" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Lazy Note" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("data-variant", "footer");
  });

  it("デフォルトでヘッダーバリアントが使用される", () => {
    render(
      <MemoryRouter>
        <BrandName />
      </MemoryRouter>,
    );

    const brandName = screen.getByText("Lazy Note");
    expect(brandName).toBeInTheDocument();
  });

  it("ブランド表記に装飾絵文字を含めない", () => {
    // R-4 (Issue #392) の Calm 思想徹底のため、旧 Sparkles 装飾は削除済み。
    render(
      <MemoryRouter>
        <BrandName />
      </MemoryRouter>,
    );

    const brandName = screen.getByText("Lazy Note");
    expect(brandName.textContent).toBe("Lazy Note");
  });

  it("ホームページへのリンクとして機能する", () => {
    render(
      <MemoryRouter>
        <BrandName />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Lazy Note" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("フッターバリアントでもホームページへのリンクとして機能する", () => {
    render(
      <MemoryRouter>
        <BrandName variant="footer" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Lazy Note" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  // ====================================================================
  // R-5 (Issue #393) focus ring Tripwire (Issue #422 で刷新)
  //
  // BrandName は Header/Footer のキーボード操作可能要素として
  // AC i 「全インタラクティブ要素で 2px 以上の visible focus ring」を満たす
  // 必要がある。`focusRingStyles` (二重リング) が確実に適用されているかを
  // `data-focus-ring="default"` 属性で検証する (Panda `hash: true` 耐性、Option A)。
  // ====================================================================
  describe("R-5 focus ring (Issue #393)", () => {
    it("header variant は通常背景向け二重リング (default) を宣言する", () => {
      render(
        <MemoryRouter>
          <BrandName variant="header" />
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Lazy Note" });
      expect(link).toHaveAttribute("data-focus-ring", "default");
    });

    it("footer variant も通常背景向け二重リング (default) を宣言する", () => {
      render(
        <MemoryRouter>
          <BrandName variant="footer" />
        </MemoryRouter>,
      );
      const link = screen.getByRole("link", { name: "Lazy Note" });
      expect(link).toHaveAttribute("data-focus-ring", "default");
    });
  });
});
