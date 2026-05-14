import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleSkeleton } from "../ArticleSkeleton";

describe("ArticleSkeleton", () => {
  it("記事スケルトンがレンダリングされる", () => {
    const { container } = render(<ArticleSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
  });

  it("aria-busy属性がtrueに設定されている", () => {
    render(<ArticleSkeleton />);

    const skeleton = screen.getByLabelText("記事を読み込み中");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
  });

  it("aria-label属性が設定されている", () => {
    render(<ArticleSkeleton />);

    const skeleton = screen.getByLabelText("記事を読み込み中");
    expect(skeleton).toBeInTheDocument();
  });

  it("ヘッダーセクションを含んでいる", () => {
    const { container } = render(<ArticleSkeleton />);

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
  });

  it("記事セクションを含んでいる", () => {
    const { container } = render(<ArticleSkeleton />);

    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
  });

  it("ナビゲーションセクションを含んでいる", () => {
    const { container } = render(<ArticleSkeleton />);

    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
  });

  // Issue #409 / Issue #422: 旧 token への回帰を CI で検出するための Tripwire。
  // 旧版は className `/bd-c_border\.subtle/` を検証していたが、Panda `hash: true`
  // 対応のため `data-token-border` 意味属性に切り替えた (Option A)。
  it("article は border.subtle 専用 token を border として宣言する", () => {
    const { container } = render(<ArticleSkeleton />);

    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
    expect(article).toHaveAttribute("data-token-border", "border.subtle");
  });

  it("nav は border.subtle 専用 token を border として宣言する", () => {
    const { container } = render(<ArticleSkeleton />);

    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute("data-token-border", "border.subtle");
  });

  // Issue #458: header と本文の間の 1px divider は、旧実装で bg.elevated を
  // background に流用しており light テーマでは bg.surface との差が 1.06:1 と薄く
  // 視覚消失していた。borderTop + border.subtle に変更したことを保証する Tripwire。
  // Issue #422: divider のトークン参照を意味属性で宣言する。
  // Issue #477: divider も border token を参照するだけのため、`data-divider` から
  // 他の border 参照と同じ `data-token-border` 命名に統一した。
  it("header と本文の間の divider が borderTop + border.subtle を宣言する", () => {
    const { container } = render(<ArticleSkeleton />);

    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
    const header = article?.querySelector("header");
    const divider = header?.nextElementSibling as HTMLElement | null;
    expect(divider).not.toBeNull();
    expect(divider).toHaveAttribute("data-token-border", "border.subtle");
  });
});
