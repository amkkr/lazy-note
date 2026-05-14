import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Calendar, FileQuestion, FileText } from "../../atoms/icons";
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
  // R-4 (Issue #392) で icon prop を inline SVG コンポーネント型に変更。
  const defaultProps = {
    icon: FileText,
    title: "まだ記事がありません",
    description: "最初の記事を作成してみましょう",
  };

  it("アイコン、タイトル、説明文が表示できる", () => {
    const { container } = render(<EmptyState {...defaultProps} />);

    // 装飾アイコン (inline SVG) は aria-hidden で SR から隠される。
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
    // inline SVG の Calendar に切り替えても常に 1 つの装飾 svg が描画される。
    const { container } = render(
      <EmptyState {...defaultProps} icon={Calendar} />,
    );

    const decorativeIcons = container.querySelectorAll(
      'svg[aria-hidden="true"]',
    );
    expect(decorativeIcons.length).toBe(1);
  });

  it("長いテキストでもレイアウトできる", () => {
    const longProps = {
      icon: FileQuestion,
      title:
        "これは非常に長いタイトルのテストです。レイアウトが崩れないことを確認します。",
      description:
        "これは非常に長い説明文のテストです。複数行にわたる長い文章でも、適切にレイアウトされることを確認します。テキストが折り返され、読みやすい形で表示されることを検証します。",
    };

    render(<EmptyState {...longProps} />);

    expect(screen.getByText(longProps.title)).toBeInTheDocument();
    expect(screen.getByText(longProps.description)).toBeInTheDocument();
  });

  // ====================================================================
  // R-5 (Issue #393) focus ring Tripwire (Issue #422 で刷新)
  //
  // EmptyState の CTA Link は accent.brand 背景上のキーボード操作可能要素
  // として AC i 「全インタラクティブ要素で 2px 以上の visible focus ring」を
  // 満たす必要がある。`focusRingOnAccentStyles` (内側 ink-900/cream-50 +
  // 外側 citrus-500) が適用されているかを `data-focus-ring="on-accent"` 属性
  // で検証する (Panda `hash: true` 耐性、Option A)。
  // ====================================================================
  describe("R-5 focus ring (Issue #393)", () => {
    it("CTA Link は accent 上向け二重リング (on-accent) を宣言する", () => {
      const action = {
        label: "記事を作成",
        href: "/posts/new",
      };
      render(<EmptyState {...defaultProps} action={action} />);
      const actionLink = screen.getByRole("link", { name: "記事を作成" });
      expect(actionLink).toHaveAttribute("data-focus-ring", "on-accent");
    });

    it("CTA Link は accent.brand を background token として宣言する", () => {
      const action = {
        label: "記事を作成",
        href: "/posts/new",
      };
      render(<EmptyState {...defaultProps} action={action} />);
      const actionLink = screen.getByRole("link", { name: "記事を作成" });
      expect(actionLink).toHaveAttribute("data-token-bg", "accent.brand");
    });

    // Issue #474 DA レビュー: 旧 PR で `data-token-color="fg.onBrand"` を吐いて
    // いたが、実 CSS は primitive (`cream.50` / `ink.900`) 直書きであり
    // 嘘になっていた。修正後は実 CSS と一致する primitive を `data-token-color`
    // に、将来の置換予定先を `data-token-color-todo` に分離する。
    it("CTA Link は実 CSS と一致する primitive (cream.50/ink.900) を color として宣言する", () => {
      const action = {
        label: "記事を作成",
        href: "/posts/new",
      };
      render(<EmptyState {...defaultProps} action={action} />);
      const actionLink = screen.getByRole("link", { name: "記事を作成" });
      expect(actionLink).toHaveAttribute(
        "data-token-color",
        "cream.50/ink.900",
      );
    });

    it("CTA Link は R-2c+ で置換予定の fg.onBrand を TODO として併記する", () => {
      const action = {
        label: "記事を作成",
        href: "/posts/new",
      };
      render(<EmptyState {...defaultProps} action={action} />);
      const actionLink = screen.getByRole("link", { name: "記事を作成" });
      expect(actionLink).toHaveAttribute("data-token-color-todo", "fg.onBrand");
    });
  });
});
