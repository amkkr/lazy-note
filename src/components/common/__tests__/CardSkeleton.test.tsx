import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardSkeleton } from "../CardSkeleton";

describe("CardSkeleton", () => {
  it("デフォルトで4枚のスケルトンカードがレンダリングされる", () => {
    render(<CardSkeleton />);

    // 各カードにはヘッダーとコンテンツの2つの子divがある構造
    // aria-label付きコンテナ内の直接のカード数を確認
    const skeletonContainer = screen.getByLabelText("記事を読み込み中");
    const listContainer = skeletonContainer.firstElementChild;
    expect(listContainer?.children).toHaveLength(4);
  });

  it("count propで指定した数のスケルトンカードがレンダリングされる", () => {
    render(<CardSkeleton count={3} />);

    const skeletonContainer = screen.getByLabelText("記事を読み込み中");
    const listContainer = skeletonContainer.firstElementChild;
    expect(listContainer?.children).toHaveLength(3);
  });

  it("count=5で5枚のスケルトンカードがレンダリングされる", () => {
    render(<CardSkeleton count={5} />);

    const skeletonContainer = screen.getByLabelText("記事を読み込み中");
    const listContainer = skeletonContainer.firstElementChild;
    expect(listContainer?.children).toHaveLength(5);
  });

  it("aria-busy属性がtrueに設定されている", () => {
    render(<CardSkeleton />);

    const container = screen.getByLabelText("記事を読み込み中");
    expect(container).toHaveAttribute("aria-busy", "true");
  });

  it("aria-label属性が設定されている", () => {
    render(<CardSkeleton />);

    const container = screen.getByLabelText("記事を読み込み中");
    expect(container).toBeInTheDocument();
  });
});
