import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingSpinner } from "../LoadingSpinner";

describe("LoadingSpinner", () => {
  it("デフォルトのメッセージが表示される", () => {
    render(<LoadingSpinner />);

    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("カスタムメッセージが表示される", () => {
    render(<LoadingSpinner message="データを取得しています" />);

    expect(screen.getByText("データを取得しています")).toBeInTheDocument();
    expect(screen.queryByText("読み込み中...")).not.toBeInTheDocument();
  });

  it("スピナー要素が存在する", () => {
    const { container } = render(<LoadingSpinner />);

    // LoadingSpinnerコンポーネントがレンダリングされていることを確認
    expect(container.firstChild).toBeInTheDocument();
    // メッセージと一緒にスピナーも描画される
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("空のメッセージを渡してもレンダリングされる", () => {
    render(<LoadingSpinner message="" />);

    // 空のメッセージの場合、p要素は存在するが中身は空
    const messageElement = screen.getByText((content, element) => {
      return element?.tagName === "P" && content === "";
    });
    expect(messageElement).toBeInTheDocument();
  });

  it("長いメッセージでも正しく表示される", () => {
    const longMessage =
      "これは非常に長いローディングメッセージです。複数行にわたる可能性があります。";
    render(<LoadingSpinner message={longMessage} />);

    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it("複数のLoadingSpinnerを同時にレンダリングできる", () => {
    render(
      <>
        <LoadingSpinner message="ローディング1" />
        <LoadingSpinner message="ローディング2" />
      </>,
    );

    expect(screen.getByText("ローディング1")).toBeInTheDocument();
    expect(screen.getByText("ローディング2")).toBeInTheDocument();
  });
});
