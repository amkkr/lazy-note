import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useViewTransitionNavigate } from "../useViewTransitionNavigate";

/**
 * `useViewTransitionNavigate` の振る舞いテスト (Issue #397)。
 *
 * useNavigate を直接モックするとフック実装の詳細に依存しすぎるため、
 * 実際の MemoryRouter 内で navigate を実行し、Route で表示するパスが切り替わる
 * ことを検証する。VT API は jsdom で未対応なので、graceful degrade で navigate
 * が即時実行されることを確認すれば AC iv / v を担保できる。
 */

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={["/"]}>
    <Routes>
      <Route
        path="/"
        element={
          <>
            <LocationProbe />
            {children}
          </>
        }
      />
      <Route path="/posts/:id" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>
);

describe("useViewTransitionNavigate", () => {
  // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
  let originalStartVT: any;

  beforeEach(() => {
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    originalStartVT = (document as any).startViewTransition;
  });

  afterEach(() => {
    if (originalStartVT === undefined) {
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      delete (document as any).startViewTransition;
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      (document as any).startViewTransition = originalStartVT;
    }
  });

  it("View Transitions API 未対応環境で呼ぶと即時 navigate される (graceful degrade)", () => {
    // jsdom 既定で未対応 (削除しても安全)
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    delete (document as any).startViewTransition;

    const { result } = renderHook(() => useViewTransitionNavigate(), {
      wrapper,
    });

    act(() => {
      result.current("/posts/abc");
    });

    // 即時 navigate されているはず
    expect(document.body.textContent).toContain("/posts/abc");
  });

  it("View Transitions API 対応環境では startViewTransition 経由で navigate する", () => {
    // 対応環境シミュレート: startViewTransition は callback を即座に呼ぶ実装にする。
    const startVTSpy = vi.fn((callback: () => void) => {
      callback();
    });
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    (document as any).startViewTransition = startVTSpy;

    const { result } = renderHook(() => useViewTransitionNavigate(), {
      wrapper,
    });

    act(() => {
      result.current("/posts/xyz");
    });

    expect(startVTSpy).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("/posts/xyz");
  });
});
