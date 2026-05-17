import { type CSSProperties, memo } from "react";
import { css } from "../../../styled-system/css";
import { UNTITLED_POST } from "../../lib/i18nLiterals";
import type { PostSummary } from "../../lib/markdown";
import { buildPostHeroTransitionName } from "../../lib/viewTransition";
import { MetaInfo } from "../common/MetaInfo";
import { Link } from "./Link";

interface FeaturedCardProps {
  post: PostSummary;
}

/**
 * Featured 大記事カード (Issue #395 / Editorial Bento ホームレイアウト)。
 *
 * Editorial 雑誌風の Featured エリアとして、最新 1 記事を巨大な見出しと
 * 控えめなオーバーライン形式のメタ情報で表示する。
 *
 * 設計方針:
 * - bg.surface (light: cream-100, dark: sumi-700) のフラット背景に乗せる
 * - 上部に accent.featured (persimmon) の細い罫線で「Featured」を視覚的に位置付け
 * - タイトルは clamp(3rem, 5vw, 5rem) で広い視差。1rem = 10px のため 30px-50px
 * - サブヘッド (excerpt) は 1.25rem〜1.5rem、line-height loose
 * - メタ情報は variant="featured" の小さめ補助行 (case 変形なし / Issue #424)
 * - hover で subtle elevation + accent underline (タイトルに下線)
 *
 * AA 担保 (calculateContrast.ts による実測値):
 * - bg.surface (light cream-100) × fg.primary: 16.19:1 AAA (Featured ラベル / タイトル)
 * - bg.surface (dark sumi-700)   × fg.primary (bone-50): 7.93:1 AAA (Featured ラベル / タイトル)
 * - bg.surface × fg.secondary: 14.84:1 (dark) / 9.59:1 (light) AAA (excerpt)
 * - 上罫線の accent.featured は装飾扱い (WCAG 1.4.11 で 3:1)。light cream-100 上で
 *   5.74:1、dark sumi-700 上は 2.76:1 だが、border は文字情報を含まない装飾なので
 *   非テキスト最低基準 3:1 すら適用外で、視認可能な範囲で問題なし。
 */

// Featured カード全体ラッパー。bg.surface のフラット背景。
// 上部 accent.featured の罫線で Editorial 雑誌の「特集」感を演出。
const featuredWrapperStyles = css({
  position: "relative",
  background: "bg.surface",
  borderRadius: "lg",
  padding: "lg",
  paddingTop: "xl",
  marginBottom: "xl",
  // 上部 accent.featured の罫線 (1px) で「特集」を示すマーク
  borderTop: "2px solid",
  borderTopColor: "accent.featured",
  transition:
    "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
  "&:hover": {
    background: "bg.elevated",
    boxShadow: "card-hover",
  },
  md: {
    padding: "2xl",
    paddingTop: "2xl",
  },
});

// "FEATURED" ラベル (uppercase tracking) で雑誌の特集タグ感を出す。
//
// 配色設計 (DA 致命 2 への対応):
// dark テーマで bg.surface (sumi-700) × accent.featured (persimmon-500) は 2.76:1 で
// AA (small text 4.5:1) 不足。bold 12px は WCAG Large Text 18.5px 未満で Large Text
// 緩和 3:1 の対象外。そのためラベル文字色は fg.primary (light 16.19:1 / dark 7.93:1
// AAA) に揃え、「Featured」の意味付けは wrapper 側の border-top: accent.featured
// (装飾扱いで 3:1 OK) で表現する。これによりラベル単体でも AAA を確保できる。
const featuredLabelStyles = css({
  display: "inline-block",
  fontSize: "xs",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: "fg.primary",
  marginBottom: "sm-md",
});

// 巨大タイトル。clamp(3rem, 5vw, 5rem) は 1rem = 10px の本プロジェクトでは
// 30px〜50px 相当。Newsreader serif (index.css の :root font-family) が継承される。
// hover 時に accent.link 系下線で「読みたくなる」フィードバック。
const featuredTitleStyles = css({
  fontSize: "clamp(3rem, 5vw, 5rem)",
  fontWeight: "800",
  lineHeight: "tight",
  letterSpacing: "-0.02em",
  color: "fg.primary",
  marginBottom: "md",
  transition: "color 0.2s ease",
  // hover 時にタイトル下に accent.link 下線 (text-decoration: underline)。
  // accent.link (indigo) は light 7.82:1 / dark 8.79:1 AAA でリンク向けに最適。
  "&:hover": {
    color: "accent.link",
    textDecoration: "underline",
    textDecorationThickness: "2px",
    textUnderlineOffset: "0.1em",
  },
});

// サブヘッド (excerpt)。1.25rem〜1.5rem、line-height loose で読みやすく。
// fg.secondary は light 9.59:1 / dark 14.84:1 AAA で本文寄りでも安全。
const featuredExcerptStyles = css({
  fontSize: "clamp(1.25rem, 2vw, 1.5rem)",
  lineHeight: "loose",
  color: "fg.secondary",
  marginTop: "md",
  // 段落として読まれることを意識してやや広めの max-width。
  maxWidth: "65ch",
});

// メタ情報の上部配置。タイトルの上に控えめに乗る。
const featuredMetaStyles = css({
  marginBottom: "md",
});

// Link wrapper (variant="card" は color: inherit なので、タイトルを継承色で表示できる)。
// block にしてカード全体をクリック可能にする。
//
// AC #395 (vii) の focus.ring 要求に対応: focus-visible で二重リング
// (内側 focus.ring (citrus) + 外側 light: ink-900 / dark: cream-50) を表示する。
// panda.config.ts L362-367 の規定 (内側 13.03:1 AAA / 外側 AA 以上) に準拠。
// FeaturedCard は H2 のみを Link で包む通常パターンなので、stretched link
// (::after) ではなく Link 要素自体に focus ring を当てる。
const featuredLinkStyles = css({
  display: "block",
  textDecoration: "none",
  borderRadius: "sm",
  "&:focus-visible": {
    outline: "none",
    boxShadow: {
      _light:
        "0 0 0 2px var(--colors-focus-ring), 0 0 0 4px var(--colors-ink-900)",
      _dark:
        "0 0 0 2px var(--colors-focus-ring), 0 0 0 4px var(--colors-cream-50)",
    },
  },
});

export const FeaturedCard = memo(({ post }: FeaturedCardProps) => {
  // Hero morph (Issue #397): タイトル H2 に `view-transition-name: post-{id}` を
  // 付与し、記事詳細 (PostDetailPage) の H1 と morph させる。
  // CSSProperties に view-transition-name は未収録のため、index signature で
  // 受け付けるよう CSSProperties をベースに拡張した型として inline 指定する。
  const heroNameStyle: CSSProperties = {
    viewTransitionName: buildPostHeroTransitionName(String(post.id)),
  };

  return (
    <article className={featuredWrapperStyles}>
      <span className={featuredLabelStyles}>Featured</span>
      <div className={featuredMetaStyles}>
        <MetaInfo
          createdAt={post.createdAt}
          author={post.author}
          readingTimeMinutes={post.readingTimeMinutes}
          variant="featured"
        />
      </div>
      <Link
        to={`/posts/${post.id}`}
        variant="card"
        className={featuredLinkStyles}
        viewTransition
      >
        <h2 className={featuredTitleStyles} style={heroNameStyle}>
          {post.title || UNTITLED_POST}
        </h2>
      </Link>
      {post.excerpt && <p className={featuredExcerptStyles}>{post.excerpt}</p>}
    </article>
  );
});

FeaturedCard.displayName = "FeaturedCard";
