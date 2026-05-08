import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetaInfo } from "../MetaInfo";

describe("MetaInfo", () => {
  it("作成日と著者が表示できる", () => {
    // R-4 (Issue #392) で日付/著者の絵文字 (Calendar / PenLine) を
    // inline SVG icon (装飾扱い) に置換。SR からは aria-hidden で隠れ、
    // 隣接テキストで意味が伝わる。
    const { container } = render(
      <MetaInfo createdAt="2024-01-01" author="山田太郎" />,
    );

    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    // 装飾アイコン (svg) が 2 個 (Calendar / PenLine) 並ぶことを確認。
    const decorativeIcons = container.querySelectorAll(
      'svg[aria-hidden="true"]',
    );
    expect(decorativeIcons.length).toBe(2);
  });

  it("作成日が未設定の場合、デフォルトテキストが表示される", () => {
    render(<MetaInfo author="山田太郎" />);

    expect(screen.getByText("日付未設定")).toBeInTheDocument();
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
  });

  it("著者が未設定の場合、デフォルトテキストが表示される", () => {
    render(<MetaInfo createdAt="2024-01-01" />);

    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("匿名")).toBeInTheDocument();
  });

  it("両方未設定の場合、両方のデフォルトテキストが表示される", () => {
    render(<MetaInfo />);

    expect(screen.getByText("日付未設定")).toBeInTheDocument();
    expect(screen.getByText("匿名")).toBeInTheDocument();
  });

  it("cardバリアントがデフォルトで適用される", () => {
    const { container } = render(
      <MetaInfo createdAt="2024-01-01" author="山田太郎" />,
    );

    // cardバリアントの場合、コンテナが存在し子要素にグレーの色が適用される
    const metaInfo = container.firstChild as HTMLElement;
    expect(metaInfo).toBeInTheDocument();
    // cardバリアントではヘッダーと異なり背景が適用されない
    const dateElement = metaInfo.querySelector('[class*="bg_"]');
    expect(dateElement).not.toBeInTheDocument();
  });

  it("headerバリアントが適用できる", () => {
    const { container } = render(
      <MetaInfo createdAt="2024-01-01" author="山田太郎" variant="header" />,
    );

    // headerバリアントの場合、子要素に背景が適用される
    const metaInfo = container.firstChild as HTMLElement;
    const dateElement = metaInfo.querySelector('[class*="bg_"]');
    expect(dateElement).toBeInTheDocument();
  });

  it("空文字列を渡した場合、デフォルトテキストが表示される", () => {
    render(<MetaInfo createdAt="" author="" />);

    expect(screen.getByText("日付未設定")).toBeInTheDocument();
    expect(screen.getByText("匿名")).toBeInTheDocument();
  });

  it("長いテキストでもレイアウトできる", () => {
    render(
      <MetaInfo
        createdAt="2024年12月31日 23時59分59秒"
        author="非常に長い名前を持つ著者の名前です"
      />,
    );

    expect(screen.getByText("2024年12月31日 23時59分59秒")).toBeInTheDocument();
    expect(
      screen.getByText("非常に長い名前を持つ著者の名前です"),
    ).toBeInTheDocument();
  });
});
