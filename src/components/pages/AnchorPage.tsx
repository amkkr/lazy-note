import { memo } from "react";
import { css } from "../../../styled-system/css";
import {
  type Coordinate,
  computeCoordinates,
  inferPublishedAt,
  type Milestone,
} from "../../lib/anchors";
import type { PostSummary } from "../../lib/markdown";

interface AnchorPageProps {
  /**
   * 全期間の記事一覧 (ページング前)。親 (`pages/anchor.tsx`) で `usePosts` から
   * `allPosts` を受け取り、本コンポーネントはそれをそのまま「各記事の座標」リスト
   * に変換して描画する。
   */
  posts: readonly PostSummary[];
  /**
   * 全節目データ。AnchorPage は運用画面のため、tone:heavy を **含めて** 全件
   * 表示する (Coordinate / Resurface とは異なるポリシー)。
   */
  milestones: readonly Milestone[];
}

/**
 * AnchorPage — Anchor 顔2「個人史タイムライン」(Issue #493 / epic #487)。
 *
 * /anchor ページ本体。「節目」と「各記事の座標」を確認できる素朴な一覧画面。
 * **過剰な可視化 (グラフ/統計) は出さない** Pulse 思想の継承。
 *
 * 設計の核 (epic #487 / Issue #493):
 * - 節目を全件 (heavy を含む) 一覧表示する (= 運用画面の透明性)
 * - 各記事の座標を控えめに一覧表示する (Coordinate と同じトーン)
 * - 投稿頻度・統計・グラフのような過剰可視化を一切しない
 * - 空状態は穏やかに表示する (「データなし」「エラー」のような断定的文言を
 *   避け、「まだ節目が記録されていません」のような寄り添う文言を採用する)
 *
 * Coordinate コンポーネントを再利用しない理由:
 * - Coordinate は tone:heavy を除外する (「静かに隠す」設計)
 * - AnchorPage は heavy も表示する (運用画面なので透明性を優先)
 * - ポリシーが異なるため、AnchorPage 内で素朴に「{label} から N 日目」を組み立てる
 *
 * a11y:
 * - h1 ("Anchor") をページのトップ見出しとし、節目一覧 / 各記事の座標を
 *   section (region) で意味的に分離する
 * - 節目一覧の `<ul>` に `aria-label="節目一覧"` を付与
 * - 各記事の座標 section に `aria-labelledby` で見出しを紐付け SR 読み上げを統一
 * - 節目の tone は `data-tone` 属性で表現する (色だけに依存させない)
 *
 * デザイン語彙:
 * - Resurface / Coordinate と同じ補助情報トーン (fg.muted / border.subtle)
 * - Editorial 雑誌風の小型見出し (uppercase + tracking) で章間を意識
 */

const containerStyles = css({
  maxWidth: "content",
  margin: "0 auto",
  padding: "content",
  paddingX: "md",
  md: {
    paddingX: "xl",
  },
});

const sectionGapStyles = css({
  display: "flex",
  flexDirection: "column",
  gap: "section",
  paddingTop: "sm-md",
});

const pageHeadingStyles = css({
  fontSize: "2xl",
  fontWeight: "bold",
  color: "fg.primary",
  marginBottom: "xs",
});

const pageDescriptionStyles = css({
  fontSize: "sm",
  lineHeight: "relaxed",
  color: "fg.secondary",
});

const sectionHeadingStyles = css({
  fontSize: "xs",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: "fg.muted",
  marginBottom: "md",
});

const sectionBlockStyles = css({
  display: "flex",
  flexDirection: "column",
  gap: "md",
  paddingTop: "lg",
  borderTop: "1px solid",
  borderTopColor: "border.subtle",
});

// 節目一覧用の ul。list marker を除去し、Editorial に詰めて並べる。
const milestoneListStyles = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "sm",
});

// 節目 1 件の行。日付 / label / tone を素朴に並べる。
// tone 別の色分けはしない (= 過剰可視化を避ける)。tone は data-tone で構造に出す。
const milestoneItemStyles = css({
  display: "flex",
  alignItems: "baseline",
  gap: "sm-md",
  paddingY: "xs",
  fontSize: "sm",
  lineHeight: "relaxed",
  color: "fg.primary",
  fontVariantNumeric: "tabular-nums",
});

const milestoneDateStyles = css({
  fontSize: "xs",
  color: "fg.muted",
  fontVariantNumeric: "tabular-nums",
});

const milestoneToneLabelStyles = css({
  fontSize: "xs",
  color: "fg.muted",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
});

// 各記事の座標 section 内のリスト。1 記事 1 ブロック。
const postListStyles = css({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "md",
});

const postItemStyles = css({
  display: "flex",
  flexDirection: "column",
  gap: "xs",
  paddingY: "sm",
  borderBottom: "1px solid",
  borderBottomColor: "border.subtle",
  "&:last-child": {
    borderBottom: "none",
  },
});

const postTitleStyles = css({
  fontSize: "sm-lg",
  fontWeight: "600",
  color: "fg.primary",
  lineHeight: "snug",
});

const postCoordinatesStyles = css({
  fontSize: "xs",
  color: "fg.muted",
  lineHeight: "snug",
  fontVariantNumeric: "tabular-nums",
  display: "flex",
  flexWrap: "wrap",
  gap: "xs-sm",
});

const emptyStateStyles = css({
  fontSize: "sm",
  color: "fg.muted",
  lineHeight: "relaxed",
  paddingY: "md",
});

/**
 * 座標 1 件の表示文言を構築する純粋関数。
 *
 * Coordinate コンポーネントと同じ書式 (「{label} から N 日目」) を流用するが、
 * AnchorPage では tone:heavy も含めて表示するため、ここでは tone による分岐は
 * しない (= 隠さない)。
 */
const buildCoordinateLabel = (coordinate: Coordinate): string => {
  return `${coordinate.label} から ${coordinate.daysSince} 日目`;
};

/**
 * 1 記事分の座標エントリ。
 *
 * publishedAt 推定不可な id を持つ記事は呼び出し側でスキップする (= entry に
 * 含まれない)。記事の表示には post.id / post.title を、座標表示には
 * coordinates をそのまま使う。
 */
interface PostCoordinatesEntry {
  readonly post: PostSummary;
  readonly coordinates: readonly Coordinate[];
}

/**
 * posts と milestones から、画面に出す各記事のエントリ配列を構築する純粋関数。
 *
 * publishedAt 推定不可な id を持つ記事 (例: テスト用 "test-post") は素直に
 * スキップする (= 結果配列に含めない)。これは「壊れた id の記事はそもそも
 * 座標を計算できない」という anchors.ts の責務境界に整合させた仕様。
 */
const buildPostCoordinatesEntries = (
  posts: readonly PostSummary[],
  milestones: readonly Milestone[],
): readonly PostCoordinatesEntry[] => {
  const entries: PostCoordinatesEntry[] = [];
  for (const post of posts) {
    const publishedAt = inferPublishedAt(post.id);
    if (publishedAt === null) {
      continue;
    }
    const coordinates = computeCoordinates(publishedAt, milestones);
    entries.push({ post, coordinates });
  }
  return entries;
};

/**
 * AnchorPage コンポーネント本体。
 */
export const AnchorPage = memo(({ posts, milestones }: AnchorPageProps) => {
  const postEntries = buildPostCoordinatesEntries(posts, milestones);

  return (
    <div className={containerStyles}>
      <div className={sectionGapStyles}>
        <div>
          <h1 className={pageHeadingStyles}>Anchor</h1>
          <p className={pageDescriptionStyles}>
            登録された節目と、各記事の座標を一覧表示します。
          </p>
        </div>

        {/* 節目一覧 (heavy を含む全件)
            運用画面のため Coordinate (= 表示時に heavy 除外) とは異なり
            全 tone を見せる。tone は data-tone 属性で構造に出し、視覚は色で
            分けない (= 過剰可視化を避ける)。 */}
        <section
          aria-labelledby="anchor-milestones-heading"
          className={sectionBlockStyles}
          data-token-border="border.subtle"
        >
          <h2 id="anchor-milestones-heading" className={sectionHeadingStyles}>
            節目一覧
          </h2>
          {milestones.length === 0 ? (
            <p className={emptyStateStyles}>
              まだ節目が記録されていません。datasources/milestones.json
              に節目を追記すると、ここに一覧表示されます。
            </p>
          ) : (
            <ul
              aria-label="節目一覧"
              className={milestoneListStyles}
              // biome-ignore lint/a11y/noRedundantRoles: Safari/VoiceOver で list-style: none を当てた ul の list セマンティクスが剥奪される既知の WebKit バグへの防御として role="list" を明示する
              role="list"
            >
              {milestones.map((milestone) => (
                <li
                  // 同 date + 同 label の節目は意味的に重複であるため、
                  // 複合キーで一意性を担保する (React duplicate key warning 回避)
                  key={`${milestone.date}-${milestone.label}`}
                  className={milestoneItemStyles}
                  data-tone={milestone.tone}
                >
                  <span className={milestoneDateStyles}>{milestone.date}</span>
                  <span>{milestone.label}</span>
                  {/* tone の英字タグ。aria-hidden で SR からは隠す
                      (data-tone 属性で SR 非依存の構造表現を別途行うため)。
                      視覚は Editorial 雑誌風の控えめな小型タグとして残す。 */}
                  <span aria-hidden="true" className={milestoneToneLabelStyles}>
                    {milestone.tone}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 各記事の座標一覧
            posts が空のとき section (= region) ごと出さず、穏やかな空状態テキスト
            のみ表示する (= 見出し "各記事の座標" を出さないことで、region として
            残らない)。 posts は存在するが publishedAt 推定不可な id を持つもの
            (= テスト用 id) は素直にスキップする。 */}
        {posts.length === 0 ? (
          <div className={sectionBlockStyles} data-token-border="border.subtle">
            <p className={emptyStateStyles}>
              まだ記事が登録されていません。datasources/ に記事を追加すると、
              ここに各記事の座標が一覧表示されます。
            </p>
          </div>
        ) : (
          <section
            aria-labelledby="anchor-posts-heading"
            className={sectionBlockStyles}
            data-token-border="border.subtle"
          >
            <h2 id="anchor-posts-heading" className={sectionHeadingStyles}>
              各記事の座標
            </h2>
            {/* biome-ignore lint/a11y/noRedundantRoles: Safari/VoiceOver で list-style: none を当てた ul の list セマンティクスが剥奪される既知の WebKit バグへの防御として role="list" を明示する */}
            <ul className={postListStyles} role="list">
              {postEntries.map((entry) => (
                <li
                  key={entry.post.id}
                  className={postItemStyles}
                  data-token-border="border.subtle"
                >
                  <span className={postTitleStyles}>
                    {entry.post.title || "無題の記事"}
                  </span>
                  {entry.coordinates.length === 0 ? (
                    <span className={emptyStateStyles}>
                      まだ通過した節目はありません
                    </span>
                  ) : (
                    <div className={postCoordinatesStyles}>
                      {entry.coordinates.map((coordinate) => (
                        <span
                          key={`${coordinate.label}-${coordinate.daysSince}`}
                          data-tone={coordinate.tone}
                        >
                          {buildCoordinateLabel(coordinate)}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
});

AnchorPage.displayName = "AnchorPage";
