import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Link } from "../Link";

describe("Link", () => {
  it("リンクテキストを表示できる", () => {
    render(
      <MemoryRouter>
        <Link to="/about">About Page</Link>
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: "About Page" })).toBeInTheDocument();
  });

  it("内部リンクとして機能する", () => {
    render(
      <MemoryRouter>
        <Link to="/contact">Contact</Link>
      </MemoryRouter>
    );
    
    const link = screen.getByRole("link", { name: "Contact" });
    expect(link).toHaveAttribute("href", "/contact");
  });

  it("external=trueの場合、外部リンクとしてレンダリングされる", () => {
    render(
      <MemoryRouter>
        <Link to="https://example.com" external>
          External Site
        </Link>
      </MemoryRouter>
    );
    
    const link = screen.getByRole("link", { name: "External Site" });
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("デフォルトでdefaultスタイルになる", () => {
    const { container } = render(
      <MemoryRouter>
        <Link to="/home">Home</Link>
      </MemoryRouter>
    );
    
    const link = container.querySelector("a");
    expect(link?.className).toBeDefined();
  });

  it("navigationスタイルに変更できる", () => {
    const { container } = render(
      <MemoryRouter>
        <Link to="/nav" variant="navigation">
          Navigation Link
        </Link>
      </MemoryRouter>
    );
    
    const link = container.querySelector("a");
    expect(link?.className).toBeDefined();
  });

  it("buttonスタイルに変更できる", () => {
    const { container } = render(
      <MemoryRouter>
        <Link to="/action" variant="button">
          Button Link
        </Link>
      </MemoryRouter>
    );
    
    const link = container.querySelector("a");
    expect(link?.className).toBeDefined();
  });

  it("cardスタイルに変更できる", () => {
    const { container } = render(
      <MemoryRouter>
        <Link to="/card" variant="card">
          Card Link
        </Link>
      </MemoryRouter>
    );
    
    const link = container.querySelector("a");
    expect(link?.className).toBeDefined();
  });

  it("カスタムCSSクラスを追加できる", () => {
    render(
      <MemoryRouter>
        <Link to="/custom" className="custom-link-class">
          Custom Class Link
        </Link>
      </MemoryRouter>
    );
    
    const link = screen.getByRole("link", { name: "Custom Class Link" });
    expect(link.className).toContain("custom-link-class");
  });

  it("複数の子要素を受け入れる", () => {
    render(
      <MemoryRouter>
        <Link to="/multi">
          <span>Icon</span>
          <span>Text</span>
        </Link>
      </MemoryRouter>
    );
    
    expect(screen.getByText("Icon")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("外部リンクにvariantを設定できる", () => {
    const { container } = render(
      <MemoryRouter>
        <Link to="https://example.com" external variant="button">
          External Button
        </Link>
      </MemoryRouter>
    );
    
    const link = container.querySelector("a");
    expect(link?.className).toBeDefined();
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("ルート相対パスでリンクできる", () => {
    render(
      <MemoryRouter>
        <Link to="/">Home</Link>
      </MemoryRouter>
    );
    
    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("ページ内アンカーリンクとして機能する", () => {
    render(
      <MemoryRouter>
        <Link to="#section">Section</Link>
      </MemoryRouter>
    );
    
    const link = screen.getByRole("link", { name: "Section" });
    expect(link).toHaveAttribute("href", "/#section");
  });
});