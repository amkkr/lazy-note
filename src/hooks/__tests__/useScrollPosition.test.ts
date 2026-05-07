import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollPosition } from "../useScrollPosition";

describe("useScrollPosition", () => {
  beforeEach(() => {
    vi.spyOn(window, "addEventListener");
    vi.spyOn(window, "removeEventListener");
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("デフォルトで0を返す", () => {
    const { result } = renderHook(() => useScrollPosition());

    expect(result.current).toBe(0);
  });

  it("スクロールイベントで値が更新される", () => {
    const { result } = renderHook(() => useScrollPosition());

    act(() => {
      Object.defineProperty(window, "scrollY", {
        value: 500,
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(500);
  });

  it("アンマウント時にイベントリスナーが解除される", () => {
    const { unmount } = renderHook(() => useScrollPosition());

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
  });
});
