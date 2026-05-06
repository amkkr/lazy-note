import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "dark";
  });

  it("スイッチが表示される", () => {
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch", { name: "テーマ切替" });
    expect(toggle).toBeInTheDocument();
  });

  it("クリックでテーマがdarkからlightに切り替わる", () => {
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch", { name: "テーマ切替" });
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("クリック2回でテーマがdarkに戻る", () => {
    render(<ThemeToggle />);

    const toggle = screen.getByRole("switch", { name: "テーマ切替" });
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
