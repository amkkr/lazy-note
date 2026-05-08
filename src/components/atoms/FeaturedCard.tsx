import { memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
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
 * - メタ情報は variant="featured" の uppercase オーバーライン
 * - hover で subtle elevation + accent underline (タイトルに下線)
 *
 * AA 担保 (calculateContrast.ts による実測値):
 * - bg.surface (light cream-100) × fg.primary: 16.19:1 AAA
 * - bg.surface (dark sumi-700)   × fg.primary (bone-50): 7.93:1 AAA
 * - bg.canvas  × fg.secondary (light): 9.59:1 AAA
 * - bg.canvas  × accent.featured (light persimmon-600): 5.74:1 AA
 * - bg.canvas  × accent.featured (dark persimmon-500): 5.17:1 AA
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
// accent.featured は light cream-50 上で 5.74:1, dark sumi-950 上で 5.17:1 (AA pass)。
// uppercase + 小さなフォントサイズなので bg.surface 上でも 16px+ サイズで運用。
const featuredLabelStyles = css({
  display: "inline-block",
  fontSize: "xs",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: "accent.featured",
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
const featuredLinkStyles = css({
  display: "block",
  textDecoration: "none",
});

export const FeaturedCard = memo(({ post }: FeaturedCardProps) => {
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
      >
        <h2 className={featuredTitleStyles}>{post.title || "無題の記事"}</h2>
      </Link>
      {post.excerpt && <p className={featuredExcerptStyles}>{post.excerpt}</p>}
    </article>
  );
});

FeaturedCard.displayName = "FeaturedCard";
