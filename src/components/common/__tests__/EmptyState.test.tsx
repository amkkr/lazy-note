import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../EmptyState";

interface MockLinkProps {
  children: React.ReactNode;
  to: string;
  [key: string]: unknown;
}

// React Routerのモック
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Link: ({ children, to, ...props }: MockLinkProps) => (
      <a href={to} {...props}>{children}</a>
    ),
  };
});

describe("EmptyState", () => {
  const defaultProps = {
    icon: "📝",
    title: "まだ記事がありません",
    description: "最初の記事を作成してみましょう",
  };

  it("アイコン、タイトル、説明文が正しく表示される", () => {
    render(<EmptyState {...defaultProps} />);
    
    expect(screen.getByText("📝")).toBeInTheDocument();
    expect(screen.getByText("まだ記事がありません")).toBeInTheDocument();
    expect(screen.getByText("最初の記事を作成してみましょう")).toBeInTheDocument();
  });

  it("アクションボタンが設定されている場合、正しく表示される", () => {
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

  it("異なるアイコンが正しく表示される", () => {
    render(<EmptyState {...defaultProps} icon="🔍" />);
    
    expect(screen.getByText("🔍")).toBeInTheDocument();
    expect(screen.queryByText("📝")).not.toBeInTheDocument();
  });

  it("長いテキストでも正しくレイアウトされる", () => {
    const longProps = {
      icon: "📚",
      title: "これは非常に長いタイトルのテストです。レイアウトが崩れないことを確認します。",
      description: "これは非常に長い説明文のテストです。複数行にわたる長い文章でも、適切にレイアウトされることを確認します。テキストが折り返され、読みやすい形で表示されることを検証します。",
    };
    
    render(<EmptyState {...longProps} />);
    
    expect(screen.getByText(longProps.title)).toBeInTheDocument();
    expect(screen.getByText(longProps.description)).toBeInTheDocument();
  });
});