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
    render(
      <MemoryRouter>
        <Header postCount={5} />
      </MemoryRouter>,
    );

    expect(screen.getByText("📚 5記事")).toBeInTheDocument();
  });

  it("記事数が0でも表示できる", () => {
    render(
      <MemoryRouter>
        <Header postCount={0} />
      </MemoryRouter>,
    );

    expect(screen.getByText("📚 0記事")).toBeInTheDocument();
  });

  it("postCountがundefinedの場合は件数表示が非表示になる", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/記事/)).not.toBeInTheDocument();
  });

  it("大きな記事数でも表示できる", () => {
    render(
      <MemoryRouter>
        <Header postCount={999} />
      </MemoryRouter>,
    );

    expect(screen.getByText("📚 999記事")).toBeInTheDocument();
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
