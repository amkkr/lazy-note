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
});
