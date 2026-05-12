import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingProgressBar } from "../ReadingProgressBar";

vi.mock("../../../hooks/useReadingProgress", () => ({
  useReadingProgress: vi.fn(() => 0),
}));

import { useReadingProgress } from "../../../hooks/useReadingProgress";

describe("ReadingProgressBar", () => {
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

  it("progressbar role を持つ要素として描画される", () => {
    vi.mocked(useReadingProgress).mockReturnValue(0);

    render(<ReadingProgressBar />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("aria-valuenow に進捗値が反映される", () => {
    vi.mocked(useReadingProgress).mockReturnValue(42);

    render(<ReadingProgressBar />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "42");
  });

  it("aria-valuemin / aria-valuemax は 0 / 100 になる", () => {
    vi.mocked(useReadingProgress).mockReturnValue(50);

    render(<ReadingProgressBar />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("aria-label として「読書進捗」を持つ", () => {
    vi.mocked(useReadingProgress).mockReturnValue(0);

    render(<ReadingProgressBar />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-label", "読書進捗");
  });

  it("aria-valuetext として進捗をパーセント表記で持つ", () => {
    vi.mocked(useReadingProgress).mockReturnValue(42);

    render(<ReadingProgressBar />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuetext", "42%");
  });

  // ====================================================================
  // Issue #454: useReadingProgress 側で scrollY を下限クランプするため、
  // ReadingProgressBar には 0..100 の値のみが渡る前提。
  // Safari overscroll で scrollY が負値になった場合でも、useReadingProgress
  // が 0 を返すため aria-valuetext は "0%" となり、aria-valid-attr-value
  // (aria-valuemin=0 に対する範囲外) 違反は発生しない。
  // ====================================================================
  it("useReadingProgress が 0 を返すと aria-valuetext は '0%' になる", () => {
    vi.mocked(useReadingProgress).mockReturnValue(0);

    render(<ReadingProgressBar />);

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(bar).toHaveAttribute("aria-valuetext", "0%");
  });

  // ====================================================================
  // Editorial Citrus token Tripwire テスト (R-2b / Issue #389、Issue #422 で刷新)
  //
  // RFC 02 §"Persimmon の使用範囲" は accent.brand を
  // 「ホーム Featured タイル / CTA ボタン (主要動作 1 個まで) / OG 画像」
  // に限定する。読書進捗バーは CTA ではなく「リンク誘導 / 二次的な視覚要素」
  // として再定義し、accent.link (indigo) を使用する。
  //
  // Issue #422: className 文字列マッチを `data-token-bg` 意味属性に置換
  // (Panda `hash: true` 耐性、Option A)。
  // ====================================================================
  describe("Editorial Citrus token 参照 (Tripwire)", () => {
    it("進捗バー本体は accent.link を background token として宣言する (RFC 02 Persimmon 範囲外)", () => {
      vi.mocked(useReadingProgress).mockReturnValue(50);

      render(<ReadingProgressBar />);

      const bar = screen.getByRole("progressbar");
      const innerBar = bar.firstElementChild;
      expect(innerBar).not.toBeNull();
      expect(innerBar).toHaveAttribute("data-token-bg", "accent.link");
    });

    it("進捗バー本体は accent.brand を参照していない (RFC 02 違反防止)", () => {
      vi.mocked(useReadingProgress).mockReturnValue(50);

      render(<ReadingProgressBar />);

      const bar = screen.getByRole("progressbar");
      const innerBar = bar.firstElementChild;
      // data-token-bg が accent.brand 以外であることを確認
      expect(innerBar).not.toHaveAttribute("data-token-bg", "accent.brand");
    });

    it("軌道背景は bg.elevated を background token として宣言する", () => {
      vi.mocked(useReadingProgress).mockReturnValue(0);

      render(<ReadingProgressBar />);

      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("data-token-bg", "bg.elevated");
    });
  });
});
