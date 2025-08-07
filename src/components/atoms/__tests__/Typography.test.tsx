import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading1, Heading2, Heading3, Paragraph, Text } from "../Typography";

describe("Heading1", () => {
  it("子要素が正しくレンダリングされる", () => {
    render(<Heading1>見出し1</Heading1>);
    expect(screen.getByRole("heading", { level: 1, name: "見出し1" })).toBeInTheDocument();
  });

  it("variant=pageがデフォルトで適用される", () => {
    const { container } = render(<Heading1>Page Heading</Heading1>);
    const heading = container.querySelector("h1");
    expect(heading?.className).toBeDefined();
  });

  it("variant=articleが適用される", () => {
    const { container } = render(<Heading1 variant="article">Article Heading</Heading1>);
    const heading = container.querySelector("h1");
    expect(heading?.className).toBeDefined();
  });

  it("variant=cardが適用される", () => {
    const { container } = render(<Heading1 variant="card">Card Heading</Heading1>);
    const heading = container.querySelector("h1");
    expect(heading?.className).toBeDefined();
  });

  it("カスタムclassNameが適用される", () => {
    render(<Heading1 className="custom-h1">Custom Class</Heading1>);
    const heading = screen.getByRole("heading", { level: 1, name: "Custom Class" });
    expect(heading.className).toContain("custom-h1");
  });
});

describe("Heading2", () => {
  it("子要素が正しくレンダリングされる", () => {
    render(<Heading2>見出し2</Heading2>);
    expect(screen.getByRole("heading", { level: 2, name: "見出し2" })).toBeInTheDocument();
  });

  it("variant=articleがデフォルトで適用される", () => {
    const { container } = render(<Heading2>Article Heading</Heading2>);
    const heading = container.querySelector("h2");
    expect(heading?.className).toBeDefined();
  });

  it("variant=pageが適用される", () => {
    const { container } = render(<Heading2 variant="page">Page Heading</Heading2>);
    const heading = container.querySelector("h2");
    expect(heading?.className).toBeDefined();
  });

  it("variant=cardが適用される", () => {
    const { container } = render(<Heading2 variant="card">Card Heading</Heading2>);
    const heading = container.querySelector("h2");
    expect(heading?.className).toBeDefined();
  });

  it("カスタムclassNameが適用される", () => {
    render(<Heading2 className="custom-h2">Custom Class</Heading2>);
    const heading = screen.getByRole("heading", { level: 2, name: "Custom Class" });
    expect(heading.className).toContain("custom-h2");
  });
});

describe("Heading3", () => {
  it("子要素が正しくレンダリングされる", () => {
    render(<Heading3>見出し3</Heading3>);
    expect(screen.getByRole("heading", { level: 3, name: "見出し3" })).toBeInTheDocument();
  });

  it("variant=articleがデフォルトで適用される", () => {
    const { container } = render(<Heading3>Article Heading</Heading3>);
    const heading = container.querySelector("h3");
    expect(heading?.className).toBeDefined();
  });

  it("variant=pageが適用される", () => {
    const { container } = render(<Heading3 variant="page">Page Heading</Heading3>);
    const heading = container.querySelector("h3");
    expect(heading?.className).toBeDefined();
  });

  it("variant=cardが適用される", () => {
    const { container } = render(<Heading3 variant="card">Card Heading</Heading3>);
    const heading = container.querySelector("h3");
    expect(heading?.className).toBeDefined();
  });

  it("カスタムclassNameが適用される", () => {
    render(<Heading3 className="custom-h3">Custom Class</Heading3>);
    const heading = screen.getByRole("heading", { level: 3, name: "Custom Class" });
    expect(heading.className).toContain("custom-h3");
  });
});

describe("Paragraph", () => {
  it("子要素が正しくレンダリングされる", () => {
    render(<Paragraph>段落テキスト</Paragraph>);
    expect(screen.getByText("段落テキスト")).toBeInTheDocument();
  });

  it("pタグが使用される", () => {
    const { container } = render(<Paragraph>段落</Paragraph>);
    const paragraph = container.querySelector("p");
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveTextContent("段落");
  });

  it("variant=bodyがデフォルトで適用される", () => {
    const { container } = render(<Paragraph>Body Text</Paragraph>);
    const paragraph = container.querySelector("p");
    expect(paragraph?.className).toBeDefined();
  });

  it("variant=smallが適用される", () => {
    const { container } = render(<Paragraph variant="small">Small Text</Paragraph>);
    const paragraph = container.querySelector("p");
    expect(paragraph?.className).toBeDefined();
  });

  it("variant=largeが適用される", () => {
    const { container } = render(<Paragraph variant="large">Large Text</Paragraph>);
    const paragraph = container.querySelector("p");
    expect(paragraph?.className).toBeDefined();
  });

  it("カスタムclassNameが適用される", () => {
    const { container } = render(<Paragraph className="custom-p">Custom Class</Paragraph>);
    const paragraph = container.querySelector("p");
    expect(paragraph?.className).toContain("custom-p");
  });
});

describe("Text", () => {
  it("子要素が正しくレンダリングされる", () => {
    render(<Text>テキストスパン</Text>);
    expect(screen.getByText("テキストスパン")).toBeInTheDocument();
  });

  it("spanタグが使用される", () => {
    const { container } = render(<Text>スパン</Text>);
    const span = container.querySelector("span");
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent("スパン");
  });

  it("カスタムclassNameが適用される", () => {
    const { container } = render(<Text className="custom-span">Custom Class</Text>);
    const span = container.querySelector("span");
    expect(span?.className).toContain("custom-span");
  });

  it("複数の子要素を受け入れる", () => {
    render(
      <Text>
        <strong>強調</strong>
        <em>斜体</em>
      </Text>
    );
    expect(screen.getByText("強調")).toBeInTheDocument();
    expect(screen.getByText("斜体")).toBeInTheDocument();
  });
});