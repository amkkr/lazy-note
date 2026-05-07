import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { TocItem } from "../../../lib/markdown";
import { TableOfContents } from "../TableOfContents";

const mockToc: TocItem[] = [
  { id: "heading-0", text: "はじめに", level: 2 },
  { id: "heading-1", text: "詳細な説明", level: 3 },
  { id: "heading-2", text: "まとめ", level: 2 },
];

describe("TableOfContents", () => {
  it("TOC項目がすべて表示される", () => {
    render(<TableOfContents toc={mockToc} />);

    expect(screen.getByText("はじめに")).toBeInTheDocument();
    expect(screen.getByText("詳細な説明")).toBeInTheDocument();
    expect(screen.getByText("まとめ")).toBeInTheDocument();
  });

  it("目次ボタンが表示される", () => {
    render(<TableOfContents toc={mockToc} />);

    expect(screen.getByText("目次")).toBeInTheDocument();
  });

  it("デフォルトで開いた状態になる", () => {
    render(<TableOfContents toc={mockToc} />);

    // デフォルトで開いているので項目が見える
    expect(screen.getByText("はじめに")).toBeVisible();
  });

  it("目次ボタンクリックでパネルを閉じることができる", async () => {
    const user = userEvent.setup();
    render(<TableOfContents toc={mockToc} />);

    const button = screen.getByText("目次");
    await user.click(button);

    // Disclosure閉じた後、項目が非表示になる
    expect(screen.queryByText("はじめに")).not.toBeInTheDocument();
  });

  it("各TOCリンクに正しいhref属性が設定される", () => {
    render(<TableOfContents toc={mockToc} />);

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "#heading-0");
    expect(links[1]).toHaveAttribute("href", "#heading-1");
    expect(links[2]).toHaveAttribute("href", "#heading-2");
  });

  it("h3項目にインデント用のクラスが付与される", () => {
    render(<TableOfContents toc={mockToc} />);

    const h2Link = screen.getByText("はじめに");
    const h3Link = screen.getByText("詳細な説明");

    // h3のリンクはh2と異なるクラスを持つ（インデント）
    expect(h3Link.className).not.toBe(h2Link.className);
  });

  it("TOCが空の場合は何も表示しない", () => {
    const { container } = render(<TableOfContents toc={[]} />);

    expect(container.innerHTML).toBe("");
  });
});
