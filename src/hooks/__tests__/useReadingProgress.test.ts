import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReadingProgress } from "../useReadingProgress";

describe("useReadingProgress", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 2000,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 1000,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("デフォルトで0を返す", () => {
    const { result } = renderHook(() => useReadingProgress());

    expect(result.current).toBe(0);
  });

  it("スクロール位置に応じた進捗率を返す", () => {
    const { result } = renderHook(() => useReadingProgress());

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 500,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(50);
  });

  it("ページ末尾で100を返す", () => {
    const { result } = renderHook(() => useReadingProgress());

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 1000,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(100);
  });

  it("スクロール可能領域を超えても100を超えない", () => {
    const { result } = renderHook(() => useReadingProgress());

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 1500,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(100);
  });

  // ====================================================================
  // Issue #454: Safari overscroll で window.scrollY が負値になるケース
  //
  // Safari の elastic scroll (overscroll bounce) では window.scrollY が
  // 一時的に負値になる。下限クランプが無いと aria-valuenow が負値となり、
  // axe-core の aria-valid-attr-value (aria-valuemin=0) に違反する。
  // useReadingProgress 側で scrollY を Math.max(0, ...) でクランプし、
  // progress 値ドメインを 0..100 に正規化する。
  // ====================================================================
  describe("scrollY 下限クランプ (Issue #454)", () => {
    it("scrollY が大きく負値の場合は 0 を返す", () => {
      const { result } = renderHook(() => useReadingProgress());

      act(() => {
        Object.defineProperty(window, "scrollY", {
          value: -50,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event("scroll"));
      });

      expect(result.current).toBe(0);
    });

    it("scrollY が -1 でも 0 を返す (-0 にならない)", () => {
      const { result } = renderHook(() => useReadingProgress());

      act(() => {
        Object.defineProperty(window, "scrollY", {
          value: -1,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event("scroll"));
      });

      // Object.is で -0 / +0 を区別。+0 (=0) であることを確認。
      expect(Object.is(result.current, 0)).toBe(true);
      expect(Object.is(result.current, -0)).toBe(false);
    });

    it("scrollY が 0 の場合は 0 を返す", () => {
      const { result } = renderHook(() => useReadingProgress());

      act(() => {
        Object.defineProperty(window, "scrollY", {
          value: 0,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event("scroll"));
      });

      expect(result.current).toBe(0);
    });

    it("scrollY が 5 / docHeight 1000 の場合は四捨五入で 1 を返す", () => {
      const { result } = renderHook(() => useReadingProgress());

      // scrollHeight=2000, innerHeight=1000 → docHeight=1000
      act(() => {
        Object.defineProperty(window, "scrollY", {
          value: 5,
          writable: true,
          configurable: true,
        });
        window.dispatchEvent(new Event("scroll"));
      });

      // 5 / 1000 * 100 = 0.5 → Math.round で 1
      expect(result.current).toBe(1);
    });
  });
});
