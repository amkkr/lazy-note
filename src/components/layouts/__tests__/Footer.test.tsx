import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { buildPulseForbiddenVocabRegex } from "../../../test/forbiddenVocab";
import { Footer } from "../Footer";

// BrandNameコンポーネントをモック
vi.mock("../../common/BrandName", () => ({
  BrandName: ({ variant }: { variant: string }) => (
    <div data-testid="brand-name">BrandName ({variant})</div>
  ),
}));

describe("Footer", () => {
  it("BrandNameコンポーネントが表示される", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("brand-name")).toBeInTheDocument();
    expect(screen.getByText("BrandName (footer)")).toBeInTheDocument();
  });

  it("コピーライトテキストが表示される", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("© 2025 Lazy Note. All rights reserved."),
    ).toBeInTheDocument();
  });

  it("footerタグが使用されている", () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    const footerElement = container.querySelector("footer");
    expect(footerElement).toBeInTheDocument();
  });

  describe("/anchor への入口リンク (Issue #839)", () => {
    it("『サイトの読み方』というアクセシブル名の内部リンクとして /anchor へ遷移できる", () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>,
      );

      const link = screen.getByRole("link", { name: "サイトの読み方" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/anchor");
    });

    it("下線なしの navigation variant として描画される", () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>,
      );

      const link = screen.getByRole("link", { name: "サイトの読み方" });
      // Link atom (variant="navigation") は Tripwire 用に data-variant を吐く。
      expect(link).toHaveAttribute("data-variant", "navigation");
      // navigation variant は下線なし (R-5 / Issue #393)。
      expect(link).toHaveAttribute("data-text-decoration", "none");
    });

    it("入口リンクのアクセシブル名が Pulse 禁則語彙に該当しない", () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>,
      );

      // 「サイトの読み方」は投稿頻度・執筆量などの抽象指標語彙ではないため、
      // Pulse 思想の禁則語彙 (src/test/forbiddenVocab.ts) に該当してはならない。
      const link = screen.getByRole("link", { name: "サイトの読み方" });
      const accessibleName = link.textContent ?? "";
      expect(accessibleName).not.toMatch(buildPulseForbiddenVocabRegex());
    });
  });
});
