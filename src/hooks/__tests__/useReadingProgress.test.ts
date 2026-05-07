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
});
