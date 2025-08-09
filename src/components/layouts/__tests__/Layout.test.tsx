import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Layout } from "../Layout";

// HeaderとFooterコンポーネントをモック
vi.mock("../Header", () => ({
  Header: ({ postCount }: { postCount: number }) => (
    <header data-testid="header">Header with {postCount} posts</header>
  ),
}));

vi.mock("../Footer", () => ({
  Footer: () => <footer data-testid="footer">Footer</footer>,
}));

describe("Layout", () => {
  it("子要素を表示できる", () => {
    render(
      <MemoryRouter>
        <Layout>
          <div data-testid="child">テストコンテンツ</div>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("テストコンテンツ")).toBeInTheDocument();
  });

  it("デフォルトでHeaderが表示される", () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>コンテンツ</div>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("header")).toBeInTheDocument();
  });

  it("showHeader=falseの場合、Headerが表示されない", () => {
    render(
      <MemoryRouter>
        <Layout showHeader={false}>
          <div>コンテンツ</div>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.queryByTestId("header")).not.toBeInTheDocument();
  });

  it("Footerが常に表示される", () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>コンテンツ</div>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("postCountがHeaderに渡される", () => {
    render(
      <MemoryRouter>
        <Layout postCount={5}>
          <div>コンテンツ</div>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.getByText("Header with 5 posts")).toBeInTheDocument();
  });

  it("postCountのデフォルト値は0", () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>コンテンツ</div>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.getByText("Header with 0 posts")).toBeInTheDocument();
  });

  it("複数の子要素を含められる", () => {
    render(
      <MemoryRouter>
        <Layout>
          <div data-testid="child1">子要素1</div>
          <div data-testid="child2">子要素2</div>
          <div data-testid="child3">子要素3</div>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("child1")).toBeInTheDocument();
    expect(screen.getByTestId("child2")).toBeInTheDocument();
    expect(screen.getByTestId("child3")).toBeInTheDocument();
  });
});
