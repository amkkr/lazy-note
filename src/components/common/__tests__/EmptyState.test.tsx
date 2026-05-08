import { render, screen } from "@testing-library/react";
import { BookOpen, FileText, Search } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "../EmptyState";

interface MockLinkProps {
  children: React.ReactNode;
  to: string;
  [key: string]: unknown;
}

// React Routerのモック
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

describe("EmptyState", () => {
  // R-4 (Issue #392) で icon prop を Lucide コンポーネント型に変更。
  const defaultProps = {
    icon: FileText,
    title: "まだ記事がありません",
    description: "最初の記事を作成してみましょう",
  };

  it("アイコン、タイトル、説明文が表示できる", () => {
    const { container } = render(<EmptyState {...defaultProps} />);

    // 装飾アイコン (Lucide svg) は aria-hidden で SR から隠される。
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText("まだ記事がありません")).toBeInTheDocument();
    expect(
      screen.getByText("最初の記事を作成してみましょう"),
    ).toBeInTheDocument();
  });

  it("アクションボタンが設定されている場合、表示できる", () => {
    const action = {
      label: "記事を作成",
      href: "/posts/new",
    };

    render(<EmptyState {...defaultProps} action={action} />);

    const actionLink = screen.getByText("記事を作成");
    expect(actionLink).toBeInTheDocument();
    expect(actionLink).toHaveAttribute("href", "/posts/new");
  });

  it("アクションボタンが設定されていない場合、表示されない", () => {
    render(<EmptyState {...defaultProps} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("異なるアイコンが表示できる", () => {
    // Lucide Search icon に切り替えても常に 1 つの装飾 svg が描画される。
    const { container } = render(
      <EmptyState {...defaultProps} icon={Search} />,
    );

    const decorativeIcons = container.querySelectorAll(
      'svg[aria-hidden="true"]',
    );
    expect(decorativeIcons.length).toBe(1);
  });

  it("長いテキストでもレイアウトできる", () => {
    const longProps = {
      icon: BookOpen,
      title:
        "これは非常に長いタイトルのテストです。レイアウトが崩れないことを確認します。",
      description:
        "これは非常に長い説明文のテストです。複数行にわたる長い文章でも、適切にレイアウトされることを確認します。テキストが折り返され、読みやすい形で表示されることを検証します。",
    };

    render(<EmptyState {...longProps} />);

    expect(screen.getByText(longProps.title)).toBeInTheDocument();
    expect(screen.getByText(longProps.description)).toBeInTheDocument();
  });
});
