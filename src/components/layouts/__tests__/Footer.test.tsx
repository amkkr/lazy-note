import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
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
      </MemoryRouter>
    );

    expect(screen.getByTestId("brand-name")).toBeInTheDocument();
    expect(screen.getByText("BrandName (footer)")).toBeInTheDocument();
  });

  it("コピーライトテキストが表示される", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByText("© 2025 Lazy Note. All rights reserved.")).toBeInTheDocument();
  });

  it("footerタグが使用されている", () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const footerElement = container.querySelector("footer");
    expect(footerElement).toBeInTheDocument();
  });
});