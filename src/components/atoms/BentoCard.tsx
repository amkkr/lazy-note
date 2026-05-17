import { type CSSProperties, memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
import { buildPostHeroTransitionName } from "../../lib/viewTransition";
import { MetaInfo } from "../common/MetaInfo";
import { Link } from "./Link";

interface BentoCardProps {
  post: PostSummary;
  /**
   * Bento grid 内でのサイズ。"tall" は 2 行分の高さ、"wide" は 2 列分、
   * "default" は 1x1 を占める。grid-row / grid-column の span を切り替える。
   *
   * desktop (>= 1024px) でのみ非対称配置として効く。tablet/mobile では
   * 単一の grid auto-flow に従って通常配置となる。
   */
  size?: "default" | "tall" | "wide";
}

/**
 * Bento グリッドカード (Issue #395 / Editorial Bento ホームレイアウト)。
 *
 * Featured 直下、2-7 番目の記事を 2x2 + asymmetric の 6 セル grid で表示する。
 * セルごとに微妙にサイズが異なる editorial bento を表現するため、size prop で
 * "tall" / "wide" / "default" を切り替える。
 *
 * 設計方針:
 * - bg.surface フラット背景 + hover で subtle elevation (translateY + shadow)
 * - タイトルは fg.primary、メタは variant="bento" で fg.secondary
 * - excerpt は line-clamp 3 行で密度を揃える
 * - hover 時にタイトルが accent.link で下線 (subtle underline)
 * - リンクはタイトル要素のみを包み、stretched link パターン (::after で
 *   article 全体に拡張) でカード全体をクリック可能にする。これにより
 *   accessibility name はタイトルのみに絞れる (a11y best practice)。
 *
 * AA 担保 (calculateContrast.ts による実測値):
 * - bg.surface (light cream-100) × fg.primary: 16.19:1 AAA
 * - bg.surface (dark sumi-700)   × fg.primary (bone-50): 7.93:1 AAA
 * - bg.surface × fg.secondary (light/dark): 本文寄りでも AAA pass
 *
 * border の WCAG 1.4.11 (Non-text Contrast / Issue #445):
 * 旧 token (bg.elevated) は light 環境で外側 bg.canvas との差が 1.06:1 と
 * なり border が視覚消失していた。border 専用 token (border.subtle) に置換
 * して、bg.canvas / bg.surface 上で 1.4.11 の 3:1 を満たす。
 *   - light: cream-300 × bg.surface 3.29:1 / × bg.canvas 3.49:1 PASS
 *   - dark : sumi-450  × bg.surface 3.29:1 / × bg.canvas 6.18:1 PASS
 */

// Bento カード共通スタイル。
// - bg.surface のフラット背景に border.subtle 専用 token の薄い枠線
//   (Issue #445: 旧 bg.elevated は light で 1.06:1 視覚消失していた)。
// - hover で subtle elevation (translateY + shadow) のみ。Calm 思想 (panda.config.ts
//   L441-447) に従い、background / border-color の動的変化は撤廃して静謐感を保つ。
// - 内部タイトル (.bento-title) の text-decoration / color 変化は重要なフィードバック
//   として残す。
// - height: 100% で grid 内のセル高さに合わせて伸縮
// - position: relative にして stretched link (::after) のアンカーにする
const bentoWrapperBaseStyles = css({
  position: "relative",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "bg.surface",
  borderRadius: "lg",
  padding: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "card",
  },
  // hover 時に内側のタイトル要素に下線を伝播
  "&:hover .bento-title": {
    color: "accent.link",
    textDecoration: "underline",
    textDecorationThickness: "1px",
    textUnderlineOffset: "0.15em",
  },
});

// Bento サイズバリアント。
// desktop (>= 1024px) で grid-row / grid-column を伸ばす。
// tablet/mobile では grid 側で 1col/2col に強制レイアウトするため効かない。
const bentoSizeDefaultStyles = css({
  // 通常セル (1x1 相当)
});

const bentoSizeTallStyles = css({
  lg: {
    gridRow: "span 2",
  },
});

const bentoSizeWideStyles = css({
  lg: {
    gridColumn: "span 2",
  },
});

/**
 * size prop ごとに article が伸ばす grid 軸を表す意味属性の値。
 *
 * Issue #480 DA: Tripwire テストは旧来 className 文字列 (`lg:grid-r_span_2`
 * 等) を regex マッチしていたが、Panda の `hash: true` を有効化すると class 名
 * が SHA hash 化されて破綻する。PR #474 で確立した「コンポーネントが意味属性を
 * 吐き、テストは `toHaveAttribute` で検証する」方式 (Option A) に揃えるため、
 * size と grid span 軸の対応を `data-grid-span` 属性として宣言する。
 * - tall   : `grid-row: span 2`    を当てるため "row"
 * - wide   : `grid-column: span 2` を当てるため "column"
 * - default: span を当てないため "none"
 */
const gridSpanAttrs: Record<NonNullable<BentoCardProps["size"]>, string> = {
  default: "none",
  tall: "row",
  wide: "column",
};

// メタ情報行。タイトル前に控えめに配置。
const bentoMetaStyles = css({
  marginBottom: "sm-md",
});

// タイトル。fg.primary、hover 時 accent.link 下線 (親 article の :hover で発火)。
const bentoTitleStyles = css({
  fontSize: "lg",
  fontWeight: "700",
  lineHeight: "snug",
  color: "fg.primary",
  marginBottom: "sm",
  transition: "color 0.2s ease",
  md: {
    fontSize: "xl",
  },
});

// excerpt (オプショナル)。line-clamp 3 行で揃える。
//
// Panda CSS の style prop は `WebkitBoxOrient` を受け付けない (deprecated 扱い)
// ため、line-clamp を実装するには inline style で `display: -webkit-box;
// -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;` を
// 補う必要がある。
// 本コンポーネントでは Panda の `css()` で fontSize / color / overflow
// などを担当させ、webkit 系プロパティのみ inline style で指定することで
// 型安全性を担保する。
const bentoExcerptStyles = css({
  fontSize: "sm",
  lineHeight: "body",
  color: "fg.secondary",
  overflow: "hidden",
  marginTop: "auto",
});

/**
 * line-clamp の inline style 定義。
 *
 * React の CSSProperties 型は WebkitBoxOrient を許容するため、ここでは
 * 直接 inline style として渡す。値は const で固定 (実質的な定数)。
 */
const bentoExcerptInlineStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 3,
};

// stretched link 用ラッパー。タイトルを包む Link の ::after で article 全体を覆う。
// これにより、リンクの accessibility name はタイトルのみとなり、SR フレンドリーで
// ありながら、視覚上はカード全体がクリック可能領域として機能する。
const bentoStretchedLinkStyles = css({
  position: "static",
  textDecoration: "none",
  // ::after で親 article を覆って stretched link 化
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: "lg",
    // クリック領域として透明
    background: "transparent",
  },
  // focus-visible 時はフォーカスリングを article 全体に視覚的に乗せる。
  // panda.config.ts L362-367 の規定に従い、内側 = focus.ring (citrus) で要素背景に対し
  // 13.03:1 AAA、外側 = light: ink-900 / dark: cream-50 で周囲背景に対し AA 以上を確保。
  "&:focus-visible::after": {
    boxShadow: {
      _light:
        "0 0 0 2px var(--colors-focus-ring), 0 0 0 4px var(--colors-ink-900)",
      _dark:
        "0 0 0 2px var(--colors-focus-ring), 0 0 0 4px var(--colors-cream-50)",
    },
  },
});

export const BentoCard = memo(({ post, size = "default" }: BentoCardProps) => {
  // size prop が未指定 (= "default") の場合は span スタイルを当てない。
  // HomePage 側の bentoSizes 配列は 6 要素しか持たないため、idx >= 6 で
  // bentoSizes[idx] が undefined となるが、デフォルト引数 "default" が
  // 適用されて default フォールバックする (1x1 セル)。
  const sizeStyles =
    size === "tall"
      ? bentoSizeTallStyles
      : size === "wide"
        ? bentoSizeWideStyles
        : bentoSizeDefaultStyles;

  // Hero morph (Issue #397): Bento タイトル H3 に
  // `view-transition-name: post-{id}` を付与し、記事詳細 (PostDetailPage) の
  // H1 と morph させる。Featured と Bento は同時に表示されないペアなので
  // 名前衝突は発生しない (HomePage の Featured = posts[0] / Bento = posts[1..6])。
  const heroNameStyle: CSSProperties = {
    viewTransitionName: buildPostHeroTransitionName(String(post.id)),
  };

  return (
    <article
      className={`${bentoWrapperBaseStyles} ${sizeStyles}`}
      data-token-border="border.subtle"
      data-token-bg="bg.surface"
      data-grid-span={gridSpanAttrs[size]}
    >
      <div className={bentoMetaStyles}>
        <MetaInfo
          createdAt={post.createdAt}
          author={post.author}
          readingTimeMinutes={post.readingTimeMinutes}
          variant="bento"
        />
      </div>
      <h3 className={`bento-title ${bentoTitleStyles}`} style={heroNameStyle}>
        <Link
          to={`/posts/${post.id}`}
          variant="card"
          className={bentoStretchedLinkStyles}
          viewTransition
        >
          {post.title || "無題の記事"}
        </Link>
      </h3>
      {post.excerpt && (
        <p className={bentoExcerptStyles} style={bentoExcerptInlineStyle}>
          {post.excerpt}
        </p>
      )}
    </article>
  );
});

BentoCard.displayName = "BentoCard";
