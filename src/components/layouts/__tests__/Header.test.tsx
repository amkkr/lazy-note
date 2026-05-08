import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Header } from "../Header";

// BrandNameコンポーネントをモック
vi.mock("../../common/BrandName", () => ({
  BrandName: ({ variant }: { variant: string }) => (
    <div data-testid="brand-name">BrandName ({variant})</div>
  ),
}));

describe("Header", () => {
  it("BrandNameコンポーネントが表示される", () => {
    render(
      <MemoryRouter>
        <Header postCount={0} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("brand-name")).toBeInTheDocument();
    expect(screen.getByText("BrandName (header)")).toBeInTheDocument();
  });

  it("記事数を表示できる", () => {
    // R-4 (Issue #392) で BookOpen 装飾は削除し、表記を「全 N 件」に統一。
    // 視覚と SR の両方で同じ意味が伝わるようにする。
    render(
      <MemoryRouter>
        <Header postCount={5} />
      </MemoryRouter>,
    );

    expect(screen.getByText("全 5 件")).toBeInTheDocument();
  });

  it("記事数バッジに SR 補完用の aria-label が付与される", () => {
    // R-4 (Issue #392) で「全 N 件」表記に aria-label="記事 N 件" を補う。
    // 視覚は短縮表記、SR は意味明確の両立を CI で固定する。
    render(
      <MemoryRouter>
        <Header postCount={5} />
      </MemoryRouter>,
    );

    expect(
      screen.getByLabelText("記事 5 件"),
    ).toBeInTheDocument();
  });

  it("記事数が0でも表示できる", () => {
    render(
      <MemoryRouter>
        <Header postCount={0} />
      </MemoryRouter>,
    );

    expect(screen.getByText("全 0 件")).toBeInTheDocument();
    expect(screen.getByLabelText("記事 0 件")).toBeInTheDocument();
  });

  it("postCountがundefinedの場合は件数表示が非表示になる", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/件/)).not.toBeInTheDocument();
  });

  it("大きな記事数でも表示できる", () => {
    render(
      <MemoryRouter>
        <Header postCount={999} />
      </MemoryRouter>,
    );

    expect(screen.getByText("全 999 件")).toBeInTheDocument();
  });

  it("headerタグが使用されている", () => {
    const { container } = render(
      <MemoryRouter>
        <Header postCount={3} />
      </MemoryRouter>,
    );

    const headerElement = container.querySelector("header");
    expect(headerElement).toBeInTheDocument();
  });
});
