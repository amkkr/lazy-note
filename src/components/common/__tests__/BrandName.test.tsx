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

    const brandName = screen.getByText("✨ Lazy Note");
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

    const brandName = screen.getByText("✨ Lazy Note");
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

    const brandName = screen.getByText("✨ Lazy Note");
    expect(brandName).toBeInTheDocument();
  });

  it("showIcon=falseの時、アイコンが表示されない", () => {
    render(
      <MemoryRouter>
        <BrandName showIcon={false} />
      </MemoryRouter>,
    );

    const brandName = screen.getByText("Lazy Note");
    expect(brandName).toBeInTheDocument();
    expect(brandName.textContent).not.toContain("✨");
  });

  it("showIcon=trueの時、アイコンが表示される", () => {
    render(
      <MemoryRouter>
        <BrandName showIcon={true} />
      </MemoryRouter>,
    );

    const brandName = screen.getByText("✨ Lazy Note");
    expect(brandName).toBeInTheDocument();
    expect(brandName.textContent).toContain("✨");
  });

  it("ホームページへのリンクとして機能する", () => {
    render(
      <MemoryRouter>
        <BrandName />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "✨ Lazy Note" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });

  it("フッターバリアントでもホームページへのリンクとして機能する", () => {
    render(
      <MemoryRouter>
        <BrandName variant="footer" />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "✨ Lazy Note" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});
