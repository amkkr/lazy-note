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

  // ===================================================================
  // Issue #395 (Editorial Bento) で追加した variant のテスト
  // ===================================================================
  it("featuredバリアントが適用できる", () => {
    const { container } = render(
      <MetaInfo
        createdAt="2024-01-01"
        author="山田太郎"
        readingTimeMinutes={5}
        variant="featured"
      />,
    );

    // Issue #424: 当初 (Issue #395) は featured バリアントを uppercase + tracking
    // のオーバーラインとして実装していたが、英字主体の著者名 (例: `amkkr`) が
    // データ表記のまま意図せず大文字化される不具合が顕在化したため、
    // `textTransform: uppercase` と `letterSpacing: 0.08em` を撤去した。
    // ここでは regression 防止として uppercase クラスが付与されないことを検証する。
    //
    // 注意: この `not.toMatch` は #422 (Tripwire CSS 変数解決ベース刷新) 完了
    // までの暫定実装。Panda の className 命名規則 (textTransform_uppercase /
    // tt_uppercase) が変更されると false positive で誤検知不能になる。
    const metaInfo = container.firstChild as HTMLElement;
    expect(metaInfo.className).not.toMatch(
      /textTransform_uppercase|tt_uppercase/,
    );
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("5分で読了")).toBeInTheDocument();
  });

  it("bentoバリアントが適用できる", () => {
    const { container } = render(
      <MetaInfo
        createdAt="2024-01-01"
        author="山田太郎"
        readingTimeMinutes={3}
        variant="bento"
      />,
    );

    // bento バリアントは小フォント (xs) で fg.secondary
    const metaInfo = container.firstChild as HTMLElement;
    expect(metaInfo).toBeInTheDocument();
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("3分で読了")).toBeInTheDocument();
  });

  it("featured / bento variant でアイコンサイズが 12px に縮小される", () => {
    const { container: featuredContainer } = render(
      <MetaInfo createdAt="2024-01-01" author="山田太郎" variant="featured" />,
    );
    const { container: bentoContainer } = render(
      <MetaInfo createdAt="2024-01-01" author="山田太郎" variant="bento" />,
    );

    // 装飾アイコン (svg) が width="12" を持つ
    const featuredSvgs =
      featuredContainer.querySelectorAll('svg[width="12"]');
    expect(featuredSvgs.length).toBeGreaterThanOrEqual(2);
    const bentoSvgs = bentoContainer.querySelectorAll('svg[width="12"]');
    expect(bentoSvgs.length).toBeGreaterThanOrEqual(2);
  });
});
