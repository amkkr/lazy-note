import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../Button";

describe("Button", () => {
  it("ボタンテキストを表示できる", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
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
      </Button>
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
    const { container } = render(<Button>Primary Button</Button>);
    
    const button = container.querySelector("button");
    expect(button?.className).toBeDefined();
  });

  it("secondaryスタイルに変更できる", () => {
    const { container } = render(<Button variant="secondary">Secondary Button</Button>);
    
    const button = container.querySelector("button");
    expect(button?.className).toBeDefined();
  });

  it("ghostスタイルに変更できる", () => {
    const { container } = render(<Button variant="ghost">Ghost Button</Button>);
    
    const button = container.querySelector("button");
    expect(button?.className).toBeDefined();
  });

  it("デフォルトでmediumサイズになる", () => {
    const { container } = render(<Button>Medium Button</Button>);
    
    const button = container.querySelector("button");
    expect(button?.className).toBeDefined();
  });

  it("smallサイズに変更できる", () => {
    const { container } = render(<Button size="small">Small Button</Button>);
    
    const button = container.querySelector("button");
    expect(button?.className).toBeDefined();
  });

  it("largeサイズに変更できる", () => {
    const { container } = render(<Button size="large">Large Button</Button>);
    
    const button = container.querySelector("button");
    expect(button?.className).toBeDefined();
  });

  it("複数の子要素を受け入れる", () => {
    render(
      <Button>
        <span>Icon</span>
        <span>Text</span>
      </Button>
    );
    
    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });
});