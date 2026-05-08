import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BrandName } from "../BrandName";

describe("BrandName", () => {
  it("ヘッダースタイルで表示できる", () => {
    render(
      <MemoryRouter>
        <BrandName variant="header" />
      </MemoryRouter>,
    );

    const brandName = screen.getByText("Lazy Note");
    expect(brandName).toBeInTheDocument();
    // Panda CSSはfs_lgのようなクラス名を生成する
    expect(brandName.className).toContain("fs_lg");
  });

  it("フッタースタイルで表示できる", () => {
    render(
      <MemoryRouter>
        <BrandName variant="footer" />
      </MemoryRouter>,
    );

    const brandName = screen.getByText("Lazy Note");
    expect(brandName).toBeInTheDocument();
    // Panda CSSはfs_smのようなクラス名を生成する
    expect(brandName.className).toContain("fs_sm");
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
});
