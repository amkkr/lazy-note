import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackToTop } from "../BackToTop";

vi.mock("../../../hooks/useScrollPosition", () => ({
  useScrollPosition: vi.fn(() => 0),
}));

import { useScrollPosition } from "../../../hooks/useScrollPosition";

describe("BackToTop", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("スクロール位置が閾値以下の時にボタンが非表示", () => {
    vi.mocked(useScrollPosition).mockReturnValue(0);

    render(<BackToTop />);

    expect(
      screen.queryByRole("button", { name: "ページトップへ戻る" }),
    ).not.toBeInTheDocument();
  });

  it("スクロール位置が閾値を超えた時にボタンが表示される", () => {
    vi.mocked(useScrollPosition).mockReturnValue(500);

    render(<BackToTop />);

    expect(
      screen.getByRole("button", { name: "ページトップへ戻る" }),
    ).toBeInTheDocument();
  });

  it("ボタンクリック時にページトップへスクロールする", () => {
    vi.mocked(useScrollPosition).mockReturnValue(500);
    window.scrollTo = vi.fn();

    render(<BackToTop />);

    act(() => {
      screen.getByRole("button", { name: "ページトップへ戻る" }).click();
    });

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  // ====================================================================
  // Editorial Citrus token Tripwire (Issue #421、Issue #422 で刷新)
  //
  // bg.elevated 反転 border は light で 1.06:1 となり視覚消失していた。
  // border 専用 token (border.subtle) を、hover 背景に bg.muted を参照
  // していることを `data-token-*` 意味属性で検証する (hash 化耐性)。
  // ====================================================================
  describe("Editorial Citrus token 参照 (Tripwire)", () => {
    it("border.subtle 専用 token を border として宣言する", () => {
      vi.mocked(useScrollPosition).mockReturnValue(500);

      render(<BackToTop />);

      const button = screen.getByRole("button", { name: "ページトップへ戻る" });
      expect(button).toHaveAttribute("data-token-border", "border.subtle");
    });

    it("hover 時の background token として bg.muted を宣言する", () => {
      vi.mocked(useScrollPosition).mockReturnValue(500);

      render(<BackToTop />);

      const button = screen.getByRole("button", { name: "ページトップへ戻る" });
      expect(button).toHaveAttribute("data-token-hover-bg", "bg.muted");
    });
  });
});
