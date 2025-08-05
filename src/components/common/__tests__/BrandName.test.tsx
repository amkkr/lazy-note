import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandName } from "../BrandName";

describe("BrandName", () => {
  it("ヘッダーバリアントで正しく表示される", () => {
    render(<BrandName variant="header" />);

    const brandName = screen.getByText("✨ Lazy Note");
    expect(brandName).toBeInTheDocument();
    // Panda CSSはfs_lgのようなクラス名を生成する
    expect(brandName.className).toContain("fs_lg");
  });

  it("フッターバリアントで正しく表示される", () => {
    render(<BrandName variant="footer" />);

    const brandName = screen.getByText("✨ Lazy Note");
    expect(brandName).toBeInTheDocument();
    // Panda CSSはfs_smのようなクラス名を生成する
    expect(brandName.className).toContain("fs_sm");
  });

  it("デフォルトでヘッダーバリアントが使用される", () => {
    render(<BrandName />);

    const brandName = screen.getByText("✨ Lazy Note");
    expect(brandName).toBeInTheDocument();
  });

  it("showIcon=falseの時、アイコンが表示されない", () => {
    render(<BrandName showIcon={false} />);

    const brandName = screen.getByText("Lazy Note");
    expect(brandName).toBeInTheDocument();
    expect(brandName.textContent).not.toContain("✨");
  });

  it("showIcon=trueの時、アイコンが表示される", () => {
    render(<BrandName showIcon={true} />);

    const brandName = screen.getByText("✨ Lazy Note");
    expect(brandName).toBeInTheDocument();
    expect(brandName.textContent).toContain("✨");
  });
});
