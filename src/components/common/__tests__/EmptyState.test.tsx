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
  // R-5 (Issue #393) focus ring Tripwire
  //
  // EmptyState の CTA Link は accent.brand 背景上のキーボード操作可能要素
  // として AC i 「全インタラクティブ要素で 2px 以上の visible focus ring」を
  // 満たす必要がある。`focusRingOnAccentStyles` (内側 ink-900/cream-50 +
  // 外側 citrus-500) が適用されているかを Panda の生成 class 名で検証する。
  // (Button.test.tsx の R-5 Tripwire と同方針)
  // ====================================================================
  describe("R-5 focus ring (Issue #393)", () => {
    const hasFocusRingClass = (className: string): boolean => {
      return /focusVisible[:\\][^\s]*bx-sh[^\s]*--colors-focus-ring/.test(
        className,
      );
    };

    it("CTA Link は focus.ring を含む focus-visible box-shadow class を持つ", () => {
      const action = {
        label: "記事を作成",
        href: "/posts/new",
      };
      render(<EmptyState {...defaultProps} action={action} />);
      const actionLink = screen.getByRole("link", { name: "記事を作成" });
      expect(hasFocusRingClass(actionLink.className)).toBe(true);
    });

    it("CTA Link は accent 上向け内側リング (ink-900 / cream-50) class を持つ", () => {
      const action = {
        label: "記事を作成",
        href: "/posts/new",
      };
      render(<EmptyState {...defaultProps} action={action} />);
      const actionLink = screen.getByRole("link", { name: "記事を作成" });
      // accent 上では light: 内側 ink-900 / dark: 内側 cream-50。
      expect(actionLink.className).toMatch(
        /focusVisible[:\\][^\s]*(--colors-ink-900|--colors-cream-50)/,
      );
    });
  });

  // ====================================================================
  // Issue #408 fg.onBrand semantic token Tripwire
  //
  // CTA 文字色は primitive 直書きから fg.onBrand semantic token に集約済み。
  // Panda 生成 class 名の `c_fg.onBrand` を Tripwire として固定し、
  // primitive 直書き ({_light: cream.50, _dark: ink.900}) への退行を検出する。
  // ====================================================================
  describe("Issue #408 fg.onBrand 参照 (Tripwire)", () => {
    it("CTA Link は fg.onBrand の color class を持つ", () => {
      const action = {
        label: "記事を作成",
        href: "/posts/new",
      };
      render(<EmptyState {...defaultProps} action={action} />);
      const actionLink = screen.getByRole("link", { name: "記事を作成" });
      expect(actionLink.className).toMatch(/c_fg\.onBrand/);
    });
  });
});
