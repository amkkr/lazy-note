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
   *
   * **表示順契約 (Issue #543)**: 各記事の座標セクションでの表示順は、本配列の
   * **入力順をそのまま保つ** (内部での再ソートや並び替えはしない)。したがって
   * 「どの順で並べるか」は呼び出し側 (= `pages/anchor.tsx`) の責務であり、
   * 現状の呼び出し側は **id 降順** (= timestamp 降順 = 最新が先頭) で渡してくる
   * (`pages/anchor.tsx` 側で `localeCompare` による明示 sort を実施)。
   *
   * なお `id` は `YYYYMMDDhhmmss` の 14 桁 timestamp 形式を前提としており
   * (`src/lib/anchors.ts` の `inferPublishedAt` が同正規表現で 14 桁を強制)、
   * この前提のもとで `localeCompare` 降順は timestamp 降順と一致する。
   * 並び順を変えたい場合は、呼び出し側でソート済み配列を渡すこと。
   */
  posts: readonly PostSummary[];
  /**
   * 全節目データ。AnchorPage は運用画面のため、tone:heavy を **含めて** 全件
   * 表示する (Coordinate / Resurface とは異なるポリシー)。
   *
   * **表示順契約 (Issue #543)**: 節目一覧セクションでの表示順は、本配列の
   * **入力順をそのまま保つ** (date / tone での内部ソートはしない)。
   * 現状の運用では `datasources/milestones.json` の配列順 (= ファイル上の
   * 記載順) をそのまま画面に反映する。日付昇順 / 降順などで並び替えたい場合は、
   * 呼び出し側でソート済み配列を渡すこと。
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
 * 表示順契約 (Issue #543):
 * - **節目一覧**: 入力 `milestones` 配列の順序をそのまま保持して描画する
 *   (内部で date / tone でソートしない)。並び順は呼び出し側 = `milestones.json`
 *   の記載順が決める。
 * - **各記事の座標**: 入力 `posts` 配列の順序をそのまま保持して描画する
 *   (内部で id / 日付でソートしない)。並び順は呼び出し側 (`pages/anchor.tsx`)
 *   が明示的に行う `localeCompare` ベースの id 降順 sort (= timestamp 降順、
 *   id は 14 桁 `YYYYMMDDhhmmss` 前提) に完全に依存する。
 * - したがって表示順を変えたい場合は、本コンポーネントを変更するのではなく
 *   呼び出し側でソート済み配列を渡すこと。
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
 * publishedAt 推定不可なスキップ件数注記 (Issue #544):
 * - `inferPublishedAt(post.id) === null` で除外された記事の件数を、各記事の座標
 *   section 末尾に「publishedAt 推定不可でスキップした記事: N 件」と控えめに表示する
 * - 0 件のときは注記そのものを出さない (= ノイズ削減 + 運用画面の静かなトーン維持)
 * - `role="note"` で補助情報であることを意味的に示す。件数は注記テキスト本体に
 *   埋め込まれるため、Tripwire 検証は `toHaveTextContent` で行う (= 数値メトリクス
 *   用の data-* カテゴリが CLAUDE.md 規約未確定のため、テキストでの検証に統一)
 * - 全記事が publishedAt 推定不可で `postEntries` が空になった場合は、「各記事の座標」
 *   見出し配下に空 `<ul>` を出さず、穏やかな空状態テキスト
 *   (「全記事が publishedAt 推定不可のためスキップしました (N 件)」) にフォールバック
 *   する (= 不自然な空 list 表示を回避)
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

// publishedAt 推定不可でスキップした記事の件数注記。Issue #544 で追加。
// 運用画面の透明性を優先するため、件数 N >= 1 のとき末尾に小さく出す。
// emptyStateStyles と同じ補助情報トーン (fg.muted) に揃え、過剰可視化を避ける。
// section の枠 (= border.subtle の境界) は重ねず、文章として控えめに添える。
const skippedNoteStyles = css({
  fontSize: "xs",
  color: "fg.muted",
  lineHeight: "relaxed",
  paddingTop: "md",
  fontVariantNumeric: "tabular-nums",
});

// Issue #534: 表示文言テンプレート / 固定文言を定数として外出し。将来の i18n
// 化や文言調整の影響範囲をファイル内 1 箇所に局所化する。
// (i18n フレームワークは導入しない方針 — 単純な template リテラル / 文字列定数)
//
// Coordinate.tsx 側の COORDINATE_LABEL_TEMPLATE と書式が一致する事実は意図的に
// 二重定義する (= Coordinate と AnchorPage は表示ポリシーが異なるため共通化
// しない / CLAUDE.md の「過度に抽象化しない」方針)。書式変更時は両ファイルを
// 同時更新する運用責任は Tripwire テスト (出力文字列の正規表現マッチ) が担う。
const ANCHOR_PAGE_HEADING = "Anchor" as const;
const ANCHOR_PAGE_DESCRIPTION =
  "登録された節目と、各記事の座標を一覧表示します。" as const;
const ANCHOR_MILESTONES_SECTION_HEADING = "節目一覧" as const;
const ANCHOR_MILESTONES_LIST_ARIA_LABEL = "節目一覧" as const;
const ANCHOR_POSTS_SECTION_HEADING = "各記事の座標" as const;
const ANCHOR_EMPTY_MILESTONES_MESSAGE =
  "まだ節目が記録されていません。" as const;
const ANCHOR_EMPTY_POSTS_MESSAGE = "まだ記事がありません。" as const;
const ANCHOR_EMPTY_COORDINATES_MESSAGE =
  "まだ通過した節目はありません" as const;
const ANCHOR_UNTITLED_POST = "無題の記事" as const;
const ANCHOR_SKIPPED_NOTE_TEMPLATE = (skippedCount: number): string =>
  `publishedAt 推定不可でスキップした記事: ${skippedCount} 件`;
const ANCHOR_ALL_SKIPPED_FALLBACK_TEMPLATE = (skippedCount: number): string =>
  `全記事が publishedAt 推定不可のためスキップしました (${skippedCount} 件)`;
const ANCHOR_COORDINATE_LABEL_TEMPLATE = (
  label: string,
  daysSince: number,
): string => `${label} から ${daysSince} 日目`;

/**
 * 座標 1 件の表示文言を構築する純粋関数。
 *
 * Coordinate コンポーネントと同じ書式 (「{label} から N 日目」) を流用するが、
 * AnchorPage では tone:heavy も含めて表示するため、ここでは tone による分岐は
 * しない (= 隠さない)。
 */
const buildCoordinateLabel = (coordinate: Coordinate): string => {
  return ANCHOR_COORDINATE_LABEL_TEMPLATE(
    coordinate.label,
    coordinate.daysSince,
  );
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
 *
 * スキップ件数 (= 注記用) は、本関数の呼び出し側で
 * `posts.length - entries.length` として算出する (Issue #544)。これにより
 * 「publishedAt 推定不可」の判定軸を本関数 1 箇所に集約し、二重定義による
 * 将来の乖離リスクを排除する。
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
  // publishedAt 推定不可でスキップされた記事の件数 (Issue #544)。
  // 「publishedAt 推定不可」の判定軸は `buildPostCoordinatesEntries` 内に集約
  // されており、ここでは入力件数と描画対象件数の差分で算出する (= 二重定義の
  // 乖離リスクを排除)。0 件のときは注記そのものを出さない (= ノイズ削減)。
  const skippedCount = posts.length - postEntries.length;

  return (
    <div className={containerStyles}>
      <div className={sectionGapStyles}>
        <div>
          <h1 className={pageHeadingStyles}>{ANCHOR_PAGE_HEADING}</h1>
          <p className={pageDescriptionStyles}>{ANCHOR_PAGE_DESCRIPTION}</p>
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
            {ANCHOR_MILESTONES_SECTION_HEADING}
          </h2>
          {milestones.length === 0 ? (
            <p className={emptyStateStyles}>
              {ANCHOR_EMPTY_MILESTONES_MESSAGE}
            </p>
          ) : (
            <ul
              aria-label={ANCHOR_MILESTONES_LIST_ARIA_LABEL}
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
            <p className={emptyStateStyles}>{ANCHOR_EMPTY_POSTS_MESSAGE}</p>
          </div>
        ) : (
          <section
            aria-labelledby="anchor-posts-heading"
            className={sectionBlockStyles}
            data-token-border="border.subtle"
          >
            <h2 id="anchor-posts-heading" className={sectionHeadingStyles}>
              {ANCHOR_POSTS_SECTION_HEADING}
            </h2>
            {postEntries.length === 0 ? (
              // 全記事が publishedAt 推定不可だった場合のフォールバック (Issue #544)。
              // 空 `<ul>` を出すと「各記事の座標」見出し + 空 list + 注記という
              // 不自然な画面になるため、穏やかな空状態テキストにまとめる。
              <p className={emptyStateStyles} role="note">
                {ANCHOR_ALL_SKIPPED_FALLBACK_TEMPLATE(skippedCount)}
              </p>
            ) : (
              <>
                {/* biome-ignore lint/a11y/noRedundantRoles: Safari/VoiceOver で list-style: none を当てた ul の list セマンティクスが剥奪される既知の WebKit バグへの防御として role="list" を明示する */}
                <ul className={postListStyles} role="list">
                  {postEntries.map((entry) => (
                    <li
                      key={entry.post.id}
                      className={postItemStyles}
                      data-token-border="border.subtle"
                    >
                      <span className={postTitleStyles}>
                        {entry.post.title || ANCHOR_UNTITLED_POST}
                      </span>
                      {entry.coordinates.length === 0 ? (
                        <span className={emptyStateStyles}>
                          {ANCHOR_EMPTY_COORDINATES_MESSAGE}
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
                {/* publishedAt 推定不可な記事のスキップ件数注記 (Issue #544)
                    運用画面として「壊れた id がある事実」を画面に出すための添え書き。
                    0 件のときは注記そのものを出さない (= ノイズ削減 + 運用画面の
                    控えめなトーンを維持)。 */}
                {skippedCount > 0 ? (
                  <p className={skippedNoteStyles} role="note">
                    {ANCHOR_SKIPPED_NOTE_TEMPLATE(skippedCount)}
                  </p>
                ) : null}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
});

AnchorPage.displayName = "AnchorPage";
