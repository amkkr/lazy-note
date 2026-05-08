import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PostSummary } from "../../../lib/markdown";
import { PostNavigation } from "../PostNavigation";

interface MockLinkProps {
  children: React.ReactNode;
  to: string;
  [key: string]: unknown;
}

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    Link: ({ children, to, ...props }: MockLinkProps) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

const createMockPost = (id: string, title: string): PostSummary => ({
  id,
  title,
  createdAt: "2024-01-01 10:00",
  author: "太郎",
  excerpt: "抜粋テキスト",
  readingTimeMinutes: 2,
});

describe("PostNavigation", () => {
  it("前後の記事リンクが表示される", () => {
    const olderPost = createMockPost("20240101100000", "古い記事タイトル");
    const newerPost = createMockPost("20240103100000", "新しい記事タイトル");

    render(<PostNavigation olderPost={olderPost} newerPost={newerPost} />);

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

    render(<PostNavigation olderPost={olderPost} newerPost={null} />);

    expect(screen.getByText("← 前の記事")).toBeInTheDocument();
    expect(screen.getByText("古い記事タイトル")).toBeInTheDocument();
    expect(screen.queryByText("次の記事 →")).not.toBeInTheDocument();
  });

  it("新しい記事のみの場合に古い記事リンクが非表示になる", () => {
    const newerPost = createMockPost("20240103100000", "新しい記事タイトル");

    render(<PostNavigation olderPost={null} newerPost={newerPost} />);

    expect(screen.queryByText("← 前の記事")).not.toBeInTheDocument();
    expect(screen.getByText("次の記事 →")).toBeInTheDocument();
    expect(screen.getByText("新しい記事タイトル")).toBeInTheDocument();
  });

  it("両方nullの場合にコンポーネントが非表示になる", () => {
    const { container } = render(
      <PostNavigation olderPost={null} newerPost={null} />,
    );

    expect(container.innerHTML).toBe("");
  });

  // Issue #419: PostDetailPage の bg.canvas 上に置かれる前後ナビ区切り線について、
  // 旧 token (bg.surface) は light 環境で外側 bg.canvas との差が 1.06:1 で
  // 視覚消失していた。border 専用 token (border.subtle) に置換した後、
  // Tripwire テストで CI 検出する。
  it("nav の borderTop が border.subtle 専用 token を参照している", () => {
    const olderPost = createMockPost("20240101100000", "古い記事タイトル");
    const newerPost = createMockPost("20240103100000", "新しい記事タイトル");

    const { container } = render(
      <PostNavigation olderPost={olderPost} newerPost={newerPost} />,
    );

    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
    // Panda は `borderColor: "border.subtle"` を `bd-c_border.subtle` 等に変換する。
    expect(nav?.className).toMatch(/bd-c_border\.subtle/);
  });
});
