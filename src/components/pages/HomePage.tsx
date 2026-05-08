import { memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
import { BentoCard } from "../atoms/BentoCard";
import { FeaturedCard } from "../atoms/FeaturedCard";
import { FileText } from "../atoms/icons";
import { IndexRow } from "../atoms/IndexRow";
import { EmptyState } from "../common/EmptyState";
import { Pagination } from "../common/Pagination";

interface HomePageProps {
  posts: PostSummary[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Editorial Bento ホームレイアウト (Issue #395)
 *
 * 全 16 記事が同サイズ・縦一列で並ぶ平板さを解消し、雑誌風の階層構造で
 * 「読みたくなる」第一印象を作る。
 *
 * 構成:
 * - Featured: 最新 1 記事 (FeaturedCard) - 巨大タイトル + 控えめメタ
 * - Bento: 2-7 記事目 (最大 6 件、BentoCard) - 2x2 + 非対称 grid
 * - Index: 8 記事目以降 (IndexRow) - Magazine 風 `01 — タイトル ─── 著者 ── 日付`
 *
 * レスポンシブ:
 * - mobile (< 768px):  Featured 大 + Bento 1col + Index (leader 非表示で改行)
 * - tablet (768-1024): Featured 大 + Bento 2col + Index
 * - desktop (>= 1024): Featured 大 + Bento 3col 非対称 + Index
 *
 * AC (Issue #395):
 * - (i) Featured full-bleed: FeaturedCard で実装
 * - (ii) 2-7 番目 Bento: 6 セル非対称 (1 件目 wide, 4 件目 tall, 残り default)
 * - (iii) 8 番目以降 Index: IndexRow で羅列 (zero-padded 2 桁番号)
 * - (iv) レスポンシブ: 上記の grid template
 * - (v) WCAG AA: calculateContrast.ts で全ペア実測済み
 * - (vi) UI 用絵文字なし: MetaInfo は inline SVG icon、IndexRow は dash と dotted leader
 * - (vii) hover/focus: 各 atom に subtle elevation + accent underline 実装済み
 * - (viii) VR snapshot: 大幅変更を許容
 */

// Page コンテナ。Featured は full-bleed 寄りに広く取れるよう、container 幅を採用。
const containerStyles = css({
  maxWidth: "container",
  margin: "0 auto",
  padding: "content",
  paddingX: "md",
  md: {
    paddingX: "xl",
  },
});

// セクション間の余白。Editorial 雑誌の章間隔を意識して section スペース。
const sectionGapStyles = css({
  display: "flex",
  flexDirection: "column",
  gap: "section",
  paddingTop: "sm-md",
});

// Bento グリッド。
// - mobile (< 768px): 1col (1fr)
// - tablet (768-1024): 2col (1fr 1fr)
// - desktop (>= 1024px): 3col 非対称 grid。BentoCard 側の size prop で
//   "wide" は 2col、"tall" は 2row 占有することで非対称性を実現する。
//
// 各セルが揃いすぎないよう、grid-auto-rows: minmax で最低高を担保しつつ
// セル毎の高さに応じて自動で伸びるように設定。
const bentoGridStyles = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "md",
  md: {
    gridTemplateColumns: "1fr 1fr",
    gap: "lg",
  },
  lg: {
    gridTemplateColumns: "1fr 1fr 1fr",
    gridAutoRows: "minmax(220px, auto)",
    gap: "lg",
  },
});

// Index リスト (Magazine 風 TOC)。ul のデフォルトリストマーカーは消す。
const indexListStyles = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  // 上部に小さな見出し的な余白
  borderTop: "1px solid",
  borderTopColor: "bg.elevated",
});

// Index セクションの見出し (Editorial 風)。
// "Index" のような小さな目印で雑誌の章タイトルを意識。
const indexHeadingStyles = css({
  fontSize: "xs",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: "fg.muted",
  marginBottom: "md",
});

/**
 * 6 件以下の Bento 用 size 配列。
 *
 * 非対称性を出すパターンとして:
 * - 0: wide (2col) - Bento 内のサブヘッダー的な大セル
 * - 1: default
 * - 2: default
 * - 3: tall (2row) - 縦方向のリズム
 * - 4: default
 * - 5: default
 *
 * 結果として 3col grid 内では:
 *   row1: [wide___][_____][3-tall]
 *   row2: [1_____][2____][3-tall]
 *   row3: [4_____][5____]
 * のような階段状の非対称配置になる。実セル数に応じて自動的に切り詰められる。
 */
const bentoSizes = ["wide", "default", "default", "tall", "default", "default"] as const;

/**
 * ホームページコンポーネント (Editorial Bento レイアウト)。
 */
export const HomePage = memo(
  ({ posts, currentPage, totalPages, onPageChange }: HomePageProps) => {
    // 記事を Featured (1) / Bento (2-7) / Index (8+) に分割
    const featured = posts[0];
    const bentoPosts = posts.slice(1, 7);
    const indexPosts = posts.slice(7);

    if (posts.length === 0) {
      return (
        <div className={containerStyles}>
          <EmptyState
            icon={FileText}
            title="新しい記事をお楽しみに"
            description="まもなく素晴らしい記事が公開される予定です。創造性に満ちたコンテンツをお届けします。"
          />
        </div>
      );
    }

    return (
      <div className={containerStyles}>
        <div className={sectionGapStyles}>
          {/* Featured: 最新 1 記事 */}
          {featured && <FeaturedCard post={featured} />}

          {/* Bento: 2-7 記事目 */}
          {bentoPosts.length > 0 && (
            <section
              className={bentoGridStyles}
              aria-label="注目の記事"
            >
              {bentoPosts.map((post, idx) => (
                <BentoCard key={post.id} post={post} size={bentoSizes[idx]} />
              ))}
            </section>
          )}

          {/* Index: 8 記事目以降 (Magazine 風 TOC)
              見出し階層: FeaturedCard h2 → BentoCard h3 + Index h3 (並列) で
              論理的な heading hierarchy を維持する (h3 → h2 逆転を回避)。
              section は aria-labelledby で可視見出しと紐付け、SR 読み上げを統一。 */}
          {indexPosts.length > 0 && (
            <section aria-labelledby="index-section-heading">
              <h3 id="index-section-heading" className={indexHeadingStyles}>
                Index
              </h3>
              <ul className={indexListStyles}>
                {indexPosts.map((post, idx) => (
                  // index は Index 内の連番 (Featured/Bento は別カウント)。
                  // 全体連番にしたい場合は idx + 7 にすれば良いが、
                  // Magazine 風 TOC の "01..." は Index 自身のカウントが直感的。
                  <IndexRow key={post.id} post={post} index={idx} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    );
  },
);

HomePage.displayName = "HomePage";
