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
});
