import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackToTop } from "../BackToTop";

vi.mock("../../../hooks/useScrollPosition", () => ({
  useScrollPosition: vi.fn(() => 0),
}));

import { useScrollPosition } from "../../../hooks/useScrollPosition";

// Issue #707: BackToTop.tsx の表示文言を定数化したが、テスト側は先行 PR (PostDetailPage 等) と
// 同様に「ユーザに見える文言」をハードコードで保持し、文言が変わったら CI で検知できる
// snapshot 的役割を維持する (= プロダクション定数の rename だけで通らないことを保証)。
const BACK_TO_TOP_ARIA_LABEL = "ページトップへ戻る" as const;

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
      screen.queryByRole("button", { name: BACK_TO_TOP_ARIA_LABEL }),
    ).not.toBeInTheDocument();
  });

  it("スクロール位置が閾値を超えた時にボタンが表示される", () => {
    vi.mocked(useScrollPosition).mockReturnValue(500);

    render(<BackToTop />);

    expect(
      screen.getByRole("button", { name: BACK_TO_TOP_ARIA_LABEL }),
    ).toBeInTheDocument();
  });

  it("ボタンクリック時にページトップへスクロールする", () => {
    vi.mocked(useScrollPosition).mockReturnValue(500);
    window.scrollTo = vi.fn();

    render(<BackToTop />);

    act(() => {
      screen.getByRole("button", { name: BACK_TO_TOP_ARIA_LABEL }).click();
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

      const button = screen.getByRole("button", { name: BACK_TO_TOP_ARIA_LABEL });
      expect(button).toHaveAttribute("data-token-border", "border.subtle");
    });

    it("hover 時の background token として bg.muted を宣言する", () => {
      vi.mocked(useScrollPosition).mockReturnValue(500);

      render(<BackToTop />);

      const button = screen.getByRole("button", { name: BACK_TO_TOP_ARIA_LABEL });
      expect(button).toHaveAttribute("data-token-hover-bg", "bg.muted");
    });
  });
});
