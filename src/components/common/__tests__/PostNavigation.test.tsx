import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { PostSummary } from "../../../lib/markdown";
import { PostNavigation } from "../PostNavigation";

const createMockPost = (id: string, title: string): PostSummary => ({
  id,
  title,
  createdAt: "2024-01-01 10:00",
  author: "太郎",
  excerpt: "抜粋テキスト",
  readingTimeMinutes: 2,
});

/**
 * PostNavigation は内部の Link コンポーネントを `viewTransition=true` で呼び
 * 出すため (Issue #397 / 推奨 6)、`useViewTransitionNavigate` → `useNavigate`
 * 経由で Router context が必要となる。テストでは MemoryRouter で wrap して
 * 実 RouterLink を render し、href 検証を行う。
 *
 * 旧版では `react-router-dom` の `Link` をモックしていたが、viewTransition=true
 * の経路では内部の `useNavigate` が走るため context 必須となり、モック方式は
 * 維持できなくなった。実 Router 下で href が出ることを直接検証する形に変更。
 */
const renderInRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("PostNavigation", () => {
  it("前後の記事リンクが表示される", () => {
    const olderPost = createMockPost("20240101100000", "古い記事タイトル");
    const newerPost = createMockPost("20240103100000", "新しい記事タイトル");

    renderInRouter(
      <PostNavigation olderPost={olderPost} newerPost={newerPost} />,
    );

    expect(screen.getByText("← 前の記事")).toBeInTheDocument();
    expect(screen.getByText("古い記事タイトル")).toBeInTheDocument();
    expect(screen.getByText("次の記事 →")).toBeInTheDocument();
    expect(screen.getByText("新しい記事タイトル")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/posts/20240101100000");
    expect(links[1]).toHaveAttribute("href", "/posts/20240103100000");
  });

  it("古い記事のみの場合に新しい記事リンクが非表示になる", () => {
    const olderPost = createMockPost("20240101100000", "古い記事タイトル");

    renderInRouter(<PostNavigation olderPost={olderPost} newerPost={null} />);

    expect(screen.getByText("← 前の記事")).toBeInTheDocument();
    expect(screen.getByText("古い記事タイトル")).toBeInTheDocument();
    expect(screen.queryByText("次の記事 →")).not.toBeInTheDocument();
  });

  it("新しい記事のみの場合に古い記事リンクが非表示になる", () => {
    const newerPost = createMockPost("20240103100000", "新しい記事タイトル");

    renderInRouter(<PostNavigation olderPost={null} newerPost={newerPost} />);

    expect(screen.queryByText("← 前の記事")).not.toBeInTheDocument();
    expect(screen.getByText("次の記事 →")).toBeInTheDocument();
    expect(screen.getByText("新しい記事タイトル")).toBeInTheDocument();
  });

  it("両方nullの場合にコンポーネントが非表示になる", () => {
    const { container } = renderInRouter(
      <PostNavigation olderPost={null} newerPost={null} />,
    );

    expect(container.innerHTML).toBe("");
  });

  // Issue #419 / Issue #422: PostDetailPage の bg.canvas 上に置かれる前後ナビ
  // 区切り線について、旧 token (bg.surface) は light 環境で外側 bg.canvas との
  // 差が 1.06:1 で視覚消失していた。border 専用 token (border.subtle) を参照
  // していることを `data-token-border` 意味属性で検証する (hash 化耐性)。
  it("nav は border.subtle 専用 token を border として宣言する", () => {
    const olderPost = createMockPost("20240101100000", "古い記事タイトル");
    const newerPost = createMockPost("20240103100000", "新しい記事タイトル");

    // viewTransition=true による useNavigate 利用のため Router context が必要。
    const { container } = renderInRouter(
      <PostNavigation olderPost={olderPost} newerPost={newerPost} />,
    );

    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("data-token-border", "border.subtle");
  });
});
