import { memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
import type { ResurfacedEntry } from "../../lib/resurface";
import { BentoCard } from "../atoms/BentoCard";
import { FeaturedCard } from "../atoms/FeaturedCard";
import { IndexRow } from "../atoms/IndexRow";
import { FileText } from "../atoms/icons";
import { EmptyState } from "../common/EmptyState";
import { Pagination } from "../common/Pagination";
import { Resurface } from "../common/Resurface";

interface HomePageProps {
  posts: PostSummary[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /**
   * Resurface (Issue #492 / N-5) の浮上対象エントリ。
   *
   * 算出は呼び出し側 (`pages/index.tsx`) で `selectResurfaced` により行い、
   * 結果を props として受け取ることで HomePage は純粋にレンダリングに専念する。
   * null のとき Resurface セクションは描画されない (スロット非表示)。
   * 既定 null (= 後方互換: 既存テストは影響を受けない)。
   */
  resurfaceEntry?: ResurfacedEntry | null;
  /**
   * Resurface の表示 OFF フラグ (撤退可能性 / Issue #492 AC)。
   *
   * Anchor 企画の「いつでも黙らせられる」要件のため、Resurface を独立に OFF
   * できる。既定 true (= 通常表示)。
   */
  showResurface?: boolean;
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
 * 件数前提:
 * - usePosts.ts の POSTS_PER_PAGE = 16 に揃え、1 ページに Featured 1 + Bento 6
 *   + Index 9 が収まる構成を基準とする。Magazine 風 Index TOC が意味を持つには
 *   1 ページ目に Index が複数件並ぶ必要があり、10 件区切りでは TOC が成立しない。
 * - 件数依存の挙動 (3〜6 件の Bento 配列縮退、7 件で Index 出現境界、16 件超で
 *   Pagination 起動) は VR snapshot で確認する想定。本 PR ではエッジケース
 *   (1〜6 件運用時のレイアウト微調整) は別 Issue で対応する。
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
//
// 親レイアウト (HomePage / bg.canvas) 上に置かれる Magazine 風 Index の
// 上端区切り線。Issue #409 で導入した border 専用 token (border.subtle) に
// 置換 (Issue #419)。
// - 旧実装は bg.elevated を使用していたが、light の bg.elevated (cream-100)
//   は外側 bg.canvas (cream-50) との差が 1.06:1 で視覚消失していた。
// - border.subtle は WCAG 1.4.11 (Non-text Contrast) の 3:1 を満たす:
//   light: cream-300 × cream-50 (bg.canvas) = 3.49:1
//   dark : sumi-450  × sumi-950 (bg.canvas) = 6.18:1 (Issue #423 で sumi-400 から変更、Calm 思想と整合)
const indexListStyles = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  // 上部に小さな見出し的な余白
  borderTop: "1px solid",
  borderTopColor: "border.subtle",
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
const bentoSizes = [
  "wide",
  "default",
  "default",
  "tall",
  "default",
  "default",
] as const;

/**
 * ホームページコンポーネント (Editorial Bento レイアウト)。
 */
export const HomePage = memo(
  ({
    posts,
    currentPage,
    totalPages,
    onPageChange,
    resurfaceEntry = null,
    showResurface = true,
  }: HomePageProps) => {
    // 記事を Featured (1) / Bento (2-7) / Index (8+) に分割。
    //
    // 件数別の表示挙動:
    //   - 0 件: EmptyState のみ (下記 if 分岐)
    //   - 1 件: Featured のみ。bentoPosts / indexPosts は空なので Bento / Index
    //           セクション (条件付き render) は描画されない
    //   - 2〜7 件: Featured + Bento (1〜6 件) のみ。Index は非表示
    //   - 8 件以上: Featured + Bento (6 件) + Index (8 件目以降) を全て描画
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
            <section className={bentoGridStyles} aria-label="注目の記事">
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
              <ul className={indexListStyles} data-token-border="border.subtle">
                {indexPosts.map((post, idx) => (
                  // 全体連番 (Featured 1 件 + Bento 6 件 = 7 件オフセット)。
                  // POSTS_PER_PAGE = 16 で 1 ページ完結を前提としているため、
                  // currentPage は加味せず idx + 7 で 8, 9, ... を表示する。
                  // 16 件超で Pagination が発生した場合は、Featured / Bento は
                  // 1 ページ目限定の意味付けを維持しつつ Index 番号は 1 ページ
                  // 完結のままで良い (各ページが独立した Magazine の章扱い)。
                  <IndexRow key={post.id} post={post} index={idx + 7} />
                ))}
              </ul>
            </section>
          )}

          {/* Resurface: Anchor 顔3「再浮上」(Issue #492 / N-5)。
              新着セクション (Featured / Bento / Index) の下に独立スロットで配置し、
              過去記事を 1 件浮上させる。
              - currentPage === 1 のときのみ表示 (Featured が "全期間の最新" 意味を
                持つのは 1 ページ目限定なので、Resurface も 1 ページ目限定にする)。
              - resurfaceEntry===null または showResurface===false で非表示
                (Resurface コンポーネント側で early return)。
              - 新着とは aria-label="過去の記事" で意味的に分離 (Resurface 内部)。 */}
          {currentPage === 1 && (
            <Resurface entry={resurfaceEntry} show={showResurface} />
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
