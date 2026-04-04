import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading1, Heading2, Heading3, Paragraph, Text } from "../Typography";

describe("Heading1", () => {
  it("見出しテキストを表示できる", () => {
    render(<Heading1>見出し1</Heading1>);
    expect(
      screen.getByRole("heading", { level: 1, name: "見出し1" }),
    ).toBeInTheDocument();
  });

  it("デフォルトでpageスタイルになる", () => {
    const { container: defaultContainer } = render(
      <Heading1>Page Heading</Heading1>,
    );
    const { container: articleContainer } = render(
      <Heading1 variant="article">Article Heading</Heading1>,
    );
    const defaultClass = defaultContainer.querySelector("h1")?.className;
    const articleClass = articleContainer.querySelector("h1")?.className;
    expect(defaultClass).not.toBe("");
    expect(defaultClass).not.toBe(articleClass);
  });

  it("articleスタイルに変更できる", () => {
    const { container: articleContainer } = render(
      <Heading1 variant="article">Article Heading</Heading1>,
    );
    const { container: defaultContainer } = render(
      <Heading1>Default Heading</Heading1>,
    );
    const articleClass = articleContainer.querySelector("h1")?.className;
    const defaultClass = defaultContainer.querySelector("h1")?.className;
    expect(articleClass).not.toBe("");
    expect(articleClass).not.toBe(defaultClass);
  });

  it("cardスタイルに変更できる", () => {
    const { container: cardContainer } = render(
      <Heading1 variant="card">Card Heading</Heading1>,
    );
    const { container: defaultContainer } = render(
      <Heading1>Default Heading</Heading1>,
    );
    const cardClass = cardContainer.querySelector("h1")?.className;
    const defaultClass = defaultContainer.querySelector("h1")?.className;
    expect(cardClass).not.toBe("");
    expect(cardClass).not.toBe(defaultClass);
  });

  it("カスタムCSSクラスを追加できる", () => {
    render(<Heading1 className="custom-h1">Custom Class</Heading1>);
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Custom Class",
    });
    expect(heading.className).toContain("custom-h1");
  });
});

describe("Heading2", () => {
  it("見出しテキストを表示できる", () => {
    render(<Heading2>見出し2</Heading2>);
    expect(
      screen.getByRole("heading", { level: 2, name: "見出し2" }),
    ).toBeInTheDocument();
  });

  it("デフォルトでarticleスタイルになる", () => {
    const { container: defaultContainer } = render(
      <Heading2>Article Heading</Heading2>,
    );
    const { container: pageContainer } = render(
      <Heading2 variant="page">Page Heading</Heading2>,
    );
    const defaultClass = defaultContainer.querySelector("h2")?.className;
    const pageClass = pageContainer.querySelector("h2")?.className;
    expect(defaultClass).not.toBe("");
    expect(defaultClass).not.toBe(pageClass);
  });

  it("pageスタイルに変更できる", () => {
    const { container: pageContainer } = render(
      <Heading2 variant="page">Page Heading</Heading2>,
    );
    const { container: cardContainer } = render(
      <Heading2 variant="card">Card Heading</Heading2>,
    );
    const pageClass = pageContainer.querySelector("h2")?.className;
    const cardClass = cardContainer.querySelector("h2")?.className;
    expect(pageClass).not.toBe("");
    expect(pageClass).not.toBe(cardClass);
  });

  it("cardスタイルに変更できる", () => {
    const { container: cardContainer } = render(
      <Heading2 variant="card">Card Heading</Heading2>,
    );
    const { container: defaultContainer } = render(
      <Heading2>Default Heading</Heading2>,
    );
    const cardClass = cardContainer.querySelector("h2")?.className;
    const defaultClass = defaultContainer.querySelector("h2")?.className;
    expect(cardClass).not.toBe("");
    expect(cardClass).not.toBe(defaultClass);
  });

  it("カスタムCSSクラスを追加できる", () => {
    render(<Heading2 className="custom-h2">Custom Class</Heading2>);
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Custom Class",
    });
    expect(heading.className).toContain("custom-h2");
  });
});

describe("Heading3", () => {
  it("見出しテキストを表示できる", () => {
    render(<Heading3>見出し3</Heading3>);
    expect(
      screen.getByRole("heading", { level: 3, name: "見出し3" }),
    ).toBeInTheDocument();
  });

  it("デフォルトでarticleスタイルになる", () => {
    const { container: defaultContainer } = render(
      <Heading3>Article Heading</Heading3>,
    );
    const { container: pageContainer } = render(
      <Heading3 variant="page">Page Heading</Heading3>,
    );
    const defaultClass = defaultContainer.querySelector("h3")?.className;
    const pageClass = pageContainer.querySelector("h3")?.className;
    expect(defaultClass).not.toBe("");
    expect(defaultClass).not.toBe(pageClass);
  });

  it("pageスタイルに変更できる", () => {
    const { container: pageContainer } = render(
      <Heading3 variant="page">Page Heading</Heading3>,
    );
    const { container: cardContainer } = render(
      <Heading3 variant="card">Card Heading</Heading3>,
    );
    const pageClass = pageContainer.querySelector("h3")?.className;
    const cardClass = cardContainer.querySelector("h3")?.className;
    expect(pageClass).not.toBe("");
    expect(pageClass).not.toBe(cardClass);
  });

  it("cardスタイルに変更できる", () => {
    const { container: cardContainer } = render(
      <Heading3 variant="card">Card Heading</Heading3>,
    );
    const { container: pageContainer } = render(
      <Heading3 variant="page">Page Heading</Heading3>,
    );
    const cardClass = cardContainer.querySelector("h3")?.className;
    const pageClass = pageContainer.querySelector("h3")?.className;
    expect(cardClass).not.toBe("");
    expect(cardClass).not.toBe(pageClass);
  });

  it("カスタムCSSクラスを追加できる", () => {
    render(<Heading3 className="custom-h3">Custom Class</Heading3>);
    const heading = screen.getByRole("heading", {
      level: 3,
      name: "Custom Class",
    });
    expect(heading.className).toContain("custom-h3");
  });
});

describe("Paragraph", () => {
  it("段落テキストを表示できる", () => {
    render(<Paragraph>段落テキスト</Paragraph>);
    expect(screen.getByText("段落テキスト")).toBeInTheDocument();
  });

  it("pタグが使用される", () => {
    const { container } = render(<Paragraph>段落</Paragraph>);
    const paragraph = container.querySelector("p");
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toHaveTextContent("段落");
  });

  it("デフォルトでbodyスタイルになる", () => {
    const { container: defaultContainer } = render(
      <Paragraph>Body Text</Paragraph>,
    );
    const { container: smallContainer } = render(
      <Paragraph variant="small">Small Text</Paragraph>,
    );
    const defaultClass = defaultContainer.querySelector("p")?.className;
    const smallClass = smallContainer.querySelector("p")?.className;
    expect(defaultClass).not.toBe("");
    expect(defaultClass).not.toBe(smallClass);
  });

  it("smallスタイルに変更できる", () => {
    const { container: smallContainer } = render(
      <Paragraph variant="small">Small Text</Paragraph>,
    );
    const { container: largeContainer } = render(
      <Paragraph variant="large">Large Text</Paragraph>,
    );
    const smallClass = smallContainer.querySelector("p")?.className;
    const largeClass = largeContainer.querySelector("p")?.className;
    expect(smallClass).not.toBe("");
    expect(smallClass).not.toBe(largeClass);
  });

  it("largeスタイルに変更できる", () => {
    const { container: largeContainer } = render(
      <Paragraph variant="large">Large Text</Paragraph>,
    );
    const { container: defaultContainer } = render(
      <Paragraph>Default Text</Paragraph>,
    );
    const largeClass = largeContainer.querySelector("p")?.className;
    const defaultClass = defaultContainer.querySelector("p")?.className;
    expect(largeClass).not.toBe("");
    expect(largeClass).not.toBe(defaultClass);
  });

  it("カスタムCSSクラスを追加できる", () => {
    const { container } = render(
      <Paragraph className="custom-p">Custom Class</Paragraph>,
    );
    const paragraph = container.querySelector("p");
    expect(paragraph?.className).toContain("custom-p");
  });
});

describe("Text", () => {
  it("テキストを表示できる", () => {
    render(<Text>テキストスパン</Text>);
    expect(screen.getByText("テキストスパン")).toBeInTheDocument();
  });

  it("spanタグが使用される", () => {
    const { container } = render(<Text>スパン</Text>);
    const span = container.querySelector("span");
    expect(span).toBeInTheDocument();
    expect(span).toHaveTextContent("スパン");
  });

  it("カスタムCSSクラスを追加できる", () => {
    const { container } = render(
      <Text className="custom-span">Custom Class</Text>,
    );
    const span = container.querySelector("span");
    expect(span?.className).toContain("custom-span");
  });

  it("複数の子要素を含められる", () => {
    render(
      <Text>
        <strong>強調</strong>
        <em>斜体</em>
      </Text>,
    );
    expect(screen.getByText("強調")).toBeInTheDocument();
    expect(screen.getByText("斜体")).toBeInTheDocument();
  });
});
