import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../Button";

describe("Button", () => {
  it("ボタンテキストを表示できる", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: "Click me" }),
    ).toBeInTheDocument();
  });

  it("クリックできる", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("ボタンを非活性にできる", () => {
    render(<Button disabled>Disabled Button</Button>);

    const button = screen.getByRole("button", { name: "Disabled Button" });
    expect(button).toBeDisabled();
  });

  it("disabledの場合、クリックイベントが発火しない", () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Disabled Button
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Disabled Button" });
    fireEvent.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("デフォルトのtype属性はbutton", () => {
    render(<Button>Default Type</Button>);

    const button = screen.getByRole("button", { name: "Default Type" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("type属性をsubmitに設定できる", () => {
    render(<Button type="submit">Submit Button</Button>);

    const button = screen.getByRole("button", { name: "Submit Button" });
    expect(button).toHaveAttribute("type", "submit");
  });

  it("type属性をresetに設定できる", () => {
    render(<Button type="reset">Reset Button</Button>);

    const button = screen.getByRole("button", { name: "Reset Button" });
    expect(button).toHaveAttribute("type", "reset");
  });

  it("カスタムCSSクラスを追加できる", () => {
    render(<Button className="custom-class">Custom Class</Button>);

    const button = screen.getByRole("button", { name: "Custom Class" });
    expect(button.className).toContain("custom-class");
  });

  it("デフォルトでprimaryスタイルになる", () => {
    const { container: primaryContainer } = render(
      <Button>Primary Button</Button>,
    );
    const { container: secondaryContainer } = render(
      <Button variant="secondary">Secondary Button</Button>,
    );

    const primaryClass = primaryContainer.querySelector("button")?.className;
    const secondaryClass =
      secondaryContainer.querySelector("button")?.className;
    expect(primaryClass).not.toBe("");
    expect(primaryClass).not.toBe(secondaryClass);
  });

  it("secondaryスタイルに変更できる", () => {
    const { container: secondaryContainer } = render(
      <Button variant="secondary">Secondary Button</Button>,
    );
    const { container: ghostContainer } = render(
      <Button variant="ghost">Ghost Button</Button>,
    );

    const secondaryClass =
      secondaryContainer.querySelector("button")?.className;
    const ghostClass = ghostContainer.querySelector("button")?.className;
    expect(secondaryClass).not.toBe("");
    expect(secondaryClass).not.toBe(ghostClass);
  });

  it("ghostスタイルに変更できる", () => {
    const { container: ghostContainer } = render(
      <Button variant="ghost">Ghost Button</Button>,
    );
    const { container: primaryContainer } = render(
      <Button>Primary Button</Button>,
    );

    const ghostClass = ghostContainer.querySelector("button")?.className;
    const primaryClass = primaryContainer.querySelector("button")?.className;
    expect(ghostClass).not.toBe("");
    expect(ghostClass).not.toBe(primaryClass);
  });

  it("デフォルトでmediumサイズになる", () => {
    const { container: mediumContainer } = render(
      <Button>Medium Button</Button>,
    );
    const { container: smallContainer } = render(
      <Button size="small">Small Button</Button>,
    );

    const mediumClass = mediumContainer.querySelector("button")?.className;
    const smallClass = smallContainer.querySelector("button")?.className;
    expect(mediumClass).not.toBe("");
    expect(mediumClass).not.toBe(smallClass);
  });

  it("smallサイズに変更できる", () => {
    const { container: smallContainer } = render(
      <Button size="small">Small Button</Button>,
    );
    const { container: largeContainer } = render(
      <Button size="large">Large Button</Button>,
    );

    const smallClass = smallContainer.querySelector("button")?.className;
    const largeClass = largeContainer.querySelector("button")?.className;
    expect(smallClass).not.toBe("");
    expect(smallClass).not.toBe(largeClass);
  });

  it("largeサイズに変更できる", () => {
    const { container: largeContainer } = render(
      <Button size="large">Large Button</Button>,
    );
    const { container: mediumContainer } = render(
      <Button>Medium Button</Button>,
    );

    const largeClass = largeContainer.querySelector("button")?.className;
    const mediumClass = mediumContainer.querySelector("button")?.className;
    expect(largeClass).not.toBe("");
    expect(largeClass).not.toBe(mediumClass);
  });

  it("複数の子要素を受け入れる", () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>,
    );

    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  // ====================================================================
  // Editorial Citrus token Tripwire テスト (R-2b / Issue #389)
  //
  // Panda CSS が生成する class 名 (例: "bg_accent.brand") を検証することで、
  // 後続 R-2c での旧 token 削除や semantic token 切替で誤って色が外れた場合に
  // CI で検出できるようにする。
  //
  // class 名のフォーマット: <css-prop-prefix>_<token-path>
  //   - background → "bg_..." (例: bg_accent.brand)
  //   - color      → "c_..."  (例: c_accent.link)
  // 詳細は styled-system/styles.css を参照。
  // ====================================================================
  describe("Editorial Citrus token 参照 (Tripwire)", () => {
    it("primary variant は accent.brand の background class を持つ", () => {
      render(<Button variant="primary">Primary</Button>);
      const button = screen.getByRole("button", { name: "Primary" });
      expect(button.className).toMatch(/bg_accent\.brand/);
    });

    it("secondary variant は bg.surface の background class を持つ", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button", { name: "Secondary" });
      // R-2b 修正: bg.elevated × border bg.surface の同色問題を回避するため、
      // bg を bg.surface に反転している。
      expect(button.className).toMatch(/bg_bg\.surface/);
    });

    it("secondary variant は bg.elevated の border class を持つ", () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole("button", { name: "Secondary" });
      expect(button.className).toMatch(/bd-c_bg\.elevated|borderColor.*bg\.elevated/);
    });

    it("ghost variant は accent.link の color class を持つ", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button", { name: "Ghost" });
      expect(button.className).toMatch(/c_accent\.link/);
    });
  });
});
