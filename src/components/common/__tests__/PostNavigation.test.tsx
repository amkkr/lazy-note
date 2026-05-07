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

const createMockPost = (
  id: string,
  title: string,
): PostSummary => ({
  id,
  title,
  createdAt: "2024-01-01 10:00",
  author: "太郎",
  excerpt: "抜粋テキスト",
  readingTimeMinutes: 2,
});

describe("PostNavigation", () => {
  it("前後の記事リンクが表示される", () => {
    const prevPost = createMockPost("20240102100000", "前の記事タイトル");
    const nextPost = createMockPost("20240101100000", "次の記事タイトル");

    render(<PostNavigation prevPost={prevPost} nextPost={nextPost} />);

    expect(screen.getByText("← 前の記事")).toBeInTheDocument();
    expect(screen.getByText("前の記事タイトル")).toBeInTheDocument();
    expect(screen.getByText("次の記事 →")).toBeInTheDocument();
    expect(screen.getByText("次の記事タイトル")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/posts/20240102100000");
    expect(links[1]).toHaveAttribute("href", "/posts/20240101100000");
  });

  it("前の記事のみの場合に次のリンクが非表示になる", () => {
    const prevPost = createMockPost("20240102100000", "前の記事タイトル");

    render(<PostNavigation prevPost={prevPost} nextPost={null} />);

    expect(screen.getByText("← 前の記事")).toBeInTheDocument();
    expect(screen.getByText("前の記事タイトル")).toBeInTheDocument();
    expect(screen.queryByText("次の記事 →")).not.toBeInTheDocument();
  });

  it("次の記事のみの場合に前のリンクが非表示になる", () => {
    const nextPost = createMockPost("20240101100000", "次の記事タイトル");

    render(<PostNavigation prevPost={null} nextPost={nextPost} />);

    expect(screen.queryByText("← 前の記事")).not.toBeInTheDocument();
    expect(screen.getByText("次の記事 →")).toBeInTheDocument();
    expect(screen.getByText("次の記事タイトル")).toBeInTheDocument();
  });

  it("両方nullの場合にコンポーネントが非表示になる", () => {
    const { container } = render(
      <PostNavigation prevPost={null} nextPost={null} />,
    );

    expect(container.innerHTML).toBe("");
  });
});
