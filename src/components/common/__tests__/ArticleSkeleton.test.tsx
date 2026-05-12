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

  // Issue #409: R-2b で導入した bg.elevated 反転は light で外側 bg.canvas と
  // 同色化する制約があったため、border 専用 token (border.subtle) に置換した。
  // 旧 token への回帰を CI で検出するための Tripwire テスト。
  it("article の border が border.subtle 専用 token を参照している", () => {
    const { container } = render(<ArticleSkeleton />);

    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
    // Panda は `borderColor: "border.subtle"` を `bd-c_border.subtle` 等に変換する。
    expect(article?.className).toMatch(/bd-c_border\.subtle/);
  });

  it("nav の borderBottom が border.subtle 専用 token を参照している", () => {
    const { container } = render(<ArticleSkeleton />);

    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
    expect(nav?.className).toMatch(/bd-c_border\.subtle/);
  });

  // Issue #458: header と本文の間の 1px divider は、旧実装で bg.elevated を
  // background に流用しており light テーマでは bg.surface との差が 1.06:1 と薄く
  // 視覚消失していた。borderTop + border.subtle に変更したことを保証する Tripwire。
  it("header と本文の間の divider が borderTop + border.subtle を参照している", () => {
    const { container } = render(<ArticleSkeleton />);

    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
    // article の直下、header の次の sibling が divider。
    const header = article?.querySelector("header");
    const divider = header?.nextElementSibling as HTMLElement | null;
    expect(divider).not.toBeNull();
    // Panda は `borderTop: "1px solid"` を `bd-t_1px_solid` に変換する。
    expect(divider?.className).toMatch(/bd-t_1px_solid/);
    expect(divider?.className).toMatch(/bd-c_border\.subtle/);
    // 旧実装の background: bg.elevated が残っていないことを確認する。
    expect(divider?.className).not.toMatch(/bg_bg\.elevated/);
  });
});
