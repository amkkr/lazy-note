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

  // ====================================================================
  // Editorial Citrus token Tripwire テスト (R-2b / Issue #389)
  //
  // RFC 02 §"Persimmon の使用範囲" は accent.brand を
  // 「ホーム Featured タイル / CTA ボタン (主要動作 1 個まで) / OG 画像」
  // に限定する。読書進捗バーは CTA ではなく「リンク誘導 / 二次的な視覚要素」
  // として再定義し、accent.link (indigo) を使用する。
  //
  // R-2c で旧 token を削除する際に accent.link 参照が外れたら CI で検出。
  // ====================================================================
  describe("Editorial Citrus token 参照 (Tripwire)", () => {
    it("進捗バー本体が accent.link の background class を持つ (RFC 02 Persimmon 範囲外)", () => {
      vi.mocked(useReadingProgress).mockReturnValue(50);

      render(<ReadingProgressBar />);

      const bar = screen.getByRole("progressbar");
      // ReadingProgressBar は <div role=progressbar><div /></div> 構造。
      // 内側の進捗バーが accent.link を参照しているはず。
      const innerBar = bar.firstElementChild;
      expect(innerBar).not.toBeNull();
      expect(innerBar?.className).toMatch(/bg_accent\.link/);
    });

    it("進捗バー本体が accent.brand を参照していない (RFC 02 違反防止)", () => {
      vi.mocked(useReadingProgress).mockReturnValue(50);

      render(<ReadingProgressBar />);

      const bar = screen.getByRole("progressbar");
      const innerBar = bar.firstElementChild;
      expect(innerBar?.className).not.toMatch(/bg_accent\.brand/);
    });

    it("軌道背景は bg.elevated の background class を持つ", () => {
      vi.mocked(useReadingProgress).mockReturnValue(0);

      render(<ReadingProgressBar />);

      const bar = screen.getByRole("progressbar");
      expect(bar.className).toMatch(/bg_bg\.elevated/);
    });
  });
});
