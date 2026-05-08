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
});
