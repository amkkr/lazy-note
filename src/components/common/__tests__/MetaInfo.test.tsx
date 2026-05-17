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

  // Issue #480: 旧実装は item の className に "bg_" が含まれるかを
  // `querySelector('[class*="bg_"]')` で検証していたが、Panda の `hash: true`
  // で class 名が hash 化されると card variant 側の `not.toBeInTheDocument()`
  // が常に成立して regression を検知できない (false negative)。PR #474 の
  // Option A に倣い、item が参照する背景 token を `data-token-bg` 意味属性で
  // 宣言し、`toHaveAttribute` / `not.toHaveAttribute` で検証する。
  it("cardバリアントがデフォルトで適用され item に背景 token を持たない", () => {
    const { container } = render(
      <MetaInfo createdAt="2024-01-01" author="山田太郎" />,
    );

    const metaInfo = container.firstChild as HTMLElement;
    expect(metaInfo).toBeInTheDocument();
    expect(metaInfo).toHaveAttribute("data-variant", "card");
    // false negative 修正: card variant の item は背景塗りを持たないため
    // `data-token-bg` 属性自体が出力されないことを明示的に正検証する。
    const dateElement = metaInfo.querySelector("div");
    expect(dateElement).not.toHaveAttribute("data-token-bg");
  });

  it("headerバリアントが適用でき item に bg.muted token を持つ", () => {
    const { container } = render(
      <MetaInfo createdAt="2024-01-01" author="山田太郎" variant="header" />,
    );

    const metaInfo = container.firstChild as HTMLElement;
    expect(metaInfo).toHaveAttribute("data-variant", "header");
    // header variant の item は bg.muted の pill 背景を持つ。
    const dateElement = metaInfo.querySelector("div");
    expect(dateElement).toHaveAttribute("data-token-bg", "bg.muted");
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
  it("featuredバリアントが適用でき著者名を大文字化しない", () => {
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
    // ここでは regression 防止として大文字化されないことを検証する。
    //
    // Issue #480: 旧実装は `not.toMatch(/tt_uppercase/)` で className 文字列を
    // 検証していたが、Panda の `hash: true` で class 名が hash 化されると常に
    // true となり regression を検知できなくなる (false negative)。PR #474 の
    // Option A に倣い、container が出力する `data-text-transform` 意味属性で
    // 「uppercase ではない (none である)」ことを明示的に正検証する。
    const metaInfo = container.firstChild as HTMLElement;
    expect(metaInfo).toHaveAttribute("data-variant", "featured");
    expect(metaInfo).toHaveAttribute("data-text-transform", "none");
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
    const featuredSvgs = featuredContainer.querySelectorAll('svg[width="12"]');
    expect(featuredSvgs.length).toBeGreaterThanOrEqual(2);
    const bentoSvgs = bentoContainer.querySelectorAll('svg[width="12"]');
    expect(bentoSvgs.length).toBeGreaterThanOrEqual(2);
  });
});
