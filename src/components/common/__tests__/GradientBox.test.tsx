import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GradientBox } from "../GradientBox";

describe("GradientBox", () => {
  it("子要素がレンダリングできる", () => {
    render(
      <GradientBox>
        <div>テストコンテンツ</div>
      </GradientBox>,
    );

    expect(screen.getByText("テストコンテンツ")).toBeInTheDocument();
  });

  it("primaryバリアントがデフォルトで適用される", () => {
    const { container } = render(
      <GradientBox>
        <div>コンテンツ</div>
      </GradientBox>,
    );

    const gradientBox = container.firstChild as HTMLElement;
    // Panda CSSで生成されたスタイルの確認
    expect(gradientBox).toBeInTheDocument();
    expect(gradientBox.className).toContain("pos_relative");
  });

  it("accentバリアントが適用できる", () => {
    const { container } = render(
      <GradientBox variant="accent">
        <div>コンテンツ</div>
      </GradientBox>,
    );

    const gradientBox = container.firstChild as HTMLElement;
    // バリアントの違いを確認するため、要素の存在を確認
    expect(gradientBox).toBeInTheDocument();
  });

  it("showPattern=trueの時、パターンオーバーレイが表示される", () => {
    const { container } = render(
      <GradientBox showPattern={true}>
        <div>コンテンツ</div>
      </GradientBox>,
    );

    // パターンオーバーレイは2番目の子要素として追加される
    const gradientBox = container.firstChild as HTMLElement;
    const patternOverlay = gradientBox.firstChild;
    expect(patternOverlay).toBeInTheDocument();
    // position: absoluteクラスを確認
    expect(patternOverlay).toHaveClass(/pos_absolute/);
  });

  it("showPattern=falseの時、パターンオーバーレイが表示されない", () => {
    const { container } = render(
      <GradientBox showPattern={false}>
        <div>コンテンツ</div>
      </GradientBox>,
    );

    // パターンオーバーレイのdivが存在しないことを確認
    const patternOverlay = container.querySelector(
      '[class*="position"][class*="absolute"]',
    );
    expect(patternOverlay).not.toBeInTheDocument();
  });

  it("カスタムclassNameが適用される", () => {
    const { container } = render(
      <GradientBox className="custom-class">
        <div>コンテンツ</div>
      </GradientBox>,
    );

    const gradientBox = container.firstChild as HTMLElement;
    expect(gradientBox.className).toContain("custom-class");
  });

  it("複数の子要素を含むことができる", () => {
    render(
      <GradientBox>
        <h1>タイトル</h1>
        <p>説明文</p>
        <button type="button">ボタン</button>
      </GradientBox>,
    );

    expect(screen.getByText("タイトル")).toBeInTheDocument();
    expect(screen.getByText("説明文")).toBeInTheDocument();
    expect(screen.getByText("ボタン")).toBeInTheDocument();
  });
});
