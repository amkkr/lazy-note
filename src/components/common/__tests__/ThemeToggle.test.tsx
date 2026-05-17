import { fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../ThemeToggle";

const setupMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn(() => ({
      matches,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "dark";
    setupMatchMedia(false);
  });

  it("スイッチが表示される", () => {
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toBeInTheDocument();
  });

  it("aria-checkedで現在のテーマ状態を伝える", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("light状態ではaria-checked='true'になる", () => {
    localStorage.setItem("theme", "light");
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("dark時のaria-labelに現在状態と次の操作が含まれる", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute(
      "aria-label",
      "テーマ切替: 現在ダーク。クリックでライトに切り替えます",
    );
  });

  it("light時のaria-labelに現在状態と次の操作が含まれる", () => {
    localStorage.setItem("theme", "light");
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute(
      "aria-label",
      "テーマ切替: 現在ライト。クリックでダークに切り替えます",
    );
  });

  it("クリックでテーマがdarkからlightに切り替わる", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("クリック2回でテーマがdarkに戻る", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("Spaceキーでテーマを切替できる", async () => {
    const user = userEvent.setup();
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch");
    toggle.focus();
    await user.keyboard("[Space]");

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("Tabでフォーカスを当てられる", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.tab();

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveFocus();
  });

  // ====================================================================
  // R-5 (Issue #393) ThemeToggle 視覚改善
  //
  // 拡張 AC (v): thumb に Sun/Moon SVG アイコンが表示される
  // 拡張 AC (vi): focus ring を outline-offset 付き box-shadow で描画する
  // 拡張 AC (viii): タッチターゲット 44x44 を確保する (外枠 56x44 + 内側 track 28)
  // ====================================================================
  describe("R-5 視覚改善 (Issue #393)", () => {
    it("light テーマでは Sun アイコンが表示される", () => {
      localStorage.setItem("theme", "light");
      render(<ThemeToggle />);

      const toggle = screen.getByRole("switch");
      // Sun アイコンは円 + 8 本の光線 path を持つ。
      const circles = toggle.querySelectorAll("circle");
      expect(circles.length).toBeGreaterThanOrEqual(1);
    });

    it("dark テーマでは Moon アイコンが表示される", () => {
      localStorage.setItem("theme", "dark");
      render(<ThemeToggle />);

      const toggle = screen.getByRole("switch");
      // Moon アイコンは三日月 path を持ち、Sun のような circle は持たない。
      const circles = toggle.querySelectorAll("circle");
      expect(circles.length).toBe(0);

      const paths = toggle.querySelectorAll("path");
      expect(paths.length).toBeGreaterThanOrEqual(1);
    });

    it("クリックでアイコンが Sun と Moon の間で切り替わる", () => {
      localStorage.setItem("theme", "dark");
      const { rerender } = render(<ThemeToggle />);

      // 初期 dark: circle なし (Moon)
      const toggle = screen.getByRole("switch");
      expect(toggle.querySelectorAll("circle").length).toBe(0);

      // クリックで light に切替 → Sun の circle が出る
      fireEvent.click(toggle);
      rerender(<ThemeToggle />);
      expect(
        screen.getByRole("switch").querySelectorAll("circle").length,
      ).toBeGreaterThanOrEqual(1);
    });

    it("外枠 Switch のタッチターゲットが 44px 以上になる (WCAG 2.5.5 AAA)", () => {
      // jsdom はレイアウトを計算しないため、style 経由で width/height を確認する
      // ことはできない。Issue #422: 旧版は className `/w_56px/` 等で検証していたが、
      // Panda の `hash: true` 耐性のため `data-touch-target` 意味属性に切替。
      render(<ThemeToggle />);

      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("data-touch-target", "56x44");
    });
  });

  // ====================================================================
  // Editorial Citrus token Tripwire (Issue #421、Issue #422 で刷新)
  //
  // track の bg.elevated 反転 border は light で 1.06:1 となり視覚消失して
  // いた。border 専用 token (border.subtle) を参照していることを
  // `data-token-border` 意味属性で検証する (Panda `hash: true` 耐性、Option A)。
  // ====================================================================
  describe("Editorial Citrus token 参照 (Tripwire) - Issue #421", () => {
    it("track は border.subtle 専用 token を border として宣言する", () => {
      render(<ThemeToggle />);

      const toggle = screen.getByRole("switch");
      const track = toggle.querySelector("span[aria-hidden='true']");
      expect(track).not.toBeNull();
      expect(track).toHaveAttribute("data-token-border", "border.subtle");
    });
  });
});
