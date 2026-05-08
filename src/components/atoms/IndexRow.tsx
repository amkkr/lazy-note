import { memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
import { Link } from "./Link";

interface IndexRowProps {
  post: PostSummary;
  /**
   * 表示順インデックス (0-origin)。Magazine 風 zero-padded 2 桁番号として表示する。
   * 全体での連番にするか、Index 内での連番にするかは呼び出し側の責務。
   */
  index: number;
}

/**
 * Magazine 風 Index 行 (Issue #395 / Editorial Bento ホームレイアウト)。
 *
 * Featured + Bento の後ろに続く 8 番目以降の記事を、雑誌の目次風に
 * `01 — タイトル ─── 著者 ── 日付` の体裁で羅列する。
 *
 * 設計方針:
 * - 番号は zero-padded 2 桁 (01, 02, ...) でタブナム揃え
 * - タイトルと右側メタ (著者・日付) を flex で 1 行に並べる
 * - 真ん中の点線/罫線はタイトルと右側メタの間を flex-1 で埋め、
 *   border-bottom (dotted) で視覚的に繋ぐ。狭い画面では崩れて 2 段になる
 * - リンクはタイトル要素のみを包み、stretched link パターン (::after) で
 *   行全体をクリック可能にする (a11y name はタイトルのみで一意性を担保)
 * - hover 時に番号が accent.featured 化 + タイトル下線
 * - フォーカス時に focus.ring (二重リング、citrus + ink-900)
 *
 * AA 担保 (calculateContrast.ts による実測値):
 * - bg.canvas × fg.primary: 17.16:1 AAA / 16.98:1 AAA
 * - bg.canvas × fg.secondary: 9.59:1 AAA / 14.84:1 AAA
 * - bg.canvas × accent.featured: 5.74:1 AA / 5.17:1 AA
 *
 * UI 用絵文字は使用しない (R-4 / Issue #395 (vi))。区切りは Em ダッシュと
 * dotted border のみで構成する。
 */

// 行ラッパー。border-bottom で行間を視覚的に区切る。
// hover/focus で背景色を bg.surface に切り替えて行を強調。
// position: relative で stretched link (::after) のアンカーを兼ねる。
const indexRowStyles = css({
  position: "relative",
  display: "flex",
  alignItems: "baseline",
  gap: "md",
  paddingY: "sm-md",
  paddingX: "sm",
  borderBottom: "1px solid",
  borderColor: "bg.elevated",
  flexWrap: "wrap",
  transition: "background 0.2s ease",
  "&:hover": {
    background: "bg.surface",
  },
  // hover 時に内部の番号 (.index-row-number) と タイトル (.index-row-title) を強調
  "&:hover .index-row-number": {
    color: "accent.featured",
  },
  "&:hover .index-row-title": {
    textDecoration: "underline",
    textDecorationThickness: "1px",
    textUnderlineOffset: "0.2em",
  },
  // 行末用の余白 (hover 領域確保)
  "&:last-child": {
    borderBottom: "none",
  },
  md: {
    paddingX: "md",
    flexWrap: "nowrap",
  },
});

// 番号 (01, 02, ...)。tabular-nums で桁ぞろえ。
// fg.muted (light 6.54:1 AA) は装飾扱いなので問題なし。bold + 小フォントなので
// 14pt 未満でも装飾的役割。意味は隣接の (link) タイトルが伝える。
const indexNumberStyles = css({
  fontSize: "sm",
  fontWeight: "700",
  fontVariantNumeric: "tabular-nums",
  color: "fg.muted",
  letterSpacing: "0.05em",
  flexShrink: 0,
  minWidth: "2.5em",
  transition: "color 0.2s ease",
});

// タイトル。fg.primary。link wrapper を内側に持つ。
// stretched link パターンで行全体クリック可能にしつつ、a11y name は
// タイトル文字列のみに絞る。
const indexTitleStyles = css({
  fontSize: "base",
  fontWeight: "500",
  // link wrapper の color は inherit なのでこの色が反映される
  color: "fg.primary",
  // 長いタイトルが右側メタを押し出さないよう、min-width:0 + ellipsis を付与
  minWidth: 0,
  flexShrink: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  transition: "color 0.2s ease",
  md: {
    fontSize: "lg",
  },
});

// stretched link 用ラッパー。タイトルを包む Link の ::after で li 行全体を覆う。
const indexStretchedLinkStyles = css({
  position: "static",
  textDecoration: "none",
  // ::after で親 li を覆って stretched link 化
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "transparent",
  },
  // focus-visible 時はフォーカスリングを li 全体に視覚的に乗せる。
  // panda.config.ts L362-367 の規定に従い、内側 = focus.ring (citrus) で要素背景に対し
  // 13.03:1 AAA、外側 = light: ink-900 / dark: cream-50 で周囲背景に対し AA 以上を確保。
  "&:focus-visible::after": {
    boxShadow: {
      _light:
        "0 0 0 2px var(--colors-focus-ring), 0 0 0 4px var(--colors-ink-900)",
      _dark:
        "0 0 0 2px var(--colors-focus-ring), 0 0 0 4px var(--colors-cream-50)",
    },
    borderRadius: "sm",
  },
});

// タイトルと右側メタの間の dotted leader (雑誌目次の点線)。
// flex-1 で間を埋め、border-bottom dotted で視覚的に繋ぐ。
// モバイルでは非表示にして、メタ情報を改行させる。
const indexLeaderStyles = css({
  flex: 1,
  // モバイルでは leader を表示しない (改行で視認性を確保)
  display: "none",
  borderBottom: "1px dotted",
  borderColor: "fg.muted",
  marginBottom: "0.3em",
  minWidth: "2rem",
  md: {
    display: "block",
  },
});

// 右側のメタ情報 (著者 / 日付)。fg.secondary で本文寄り。
// モバイルでは折り返して下に来る (flex-wrap: wrap で flex 全体が折り返される)。
const indexMetaStyles = css({
  display: "flex",
  alignItems: "baseline",
  gap: "sm-md",
  flexShrink: 0,
  fontSize: "sm",
  color: "fg.secondary",
  fontVariantNumeric: "tabular-nums",
});

// メタ間の区切り。視覚絵文字は使わず Em ダッシュで控えめに。
const indexMetaSeparatorStyles = css({
  color: "fg.muted",
});

export const IndexRow = memo(({ post, index }: IndexRowProps) => {
  // zero-padded 2 桁。100 を超える場合は 3 桁になっても許容。
  const numberLabel = String(index + 1).padStart(2, "0");

  return (
    <li className={indexRowStyles}>
      <span className={`index-row-number ${indexNumberStyles}`}>
        {numberLabel}
      </span>
      <span className={`index-row-title ${indexTitleStyles}`}>
        <Link
          to={`/posts/${post.id}`}
          variant="card"
          className={indexStretchedLinkStyles}
        >
          {post.title || "無題の記事"}
        </Link>
      </span>
      <span className={indexLeaderStyles} aria-hidden="true" />
      <span className={indexMetaStyles}>
        <span>{post.author || "匿名"}</span>
        <span className={indexMetaSeparatorStyles} aria-hidden="true">
          —
        </span>
        <span>{post.createdAt || "日付未設定"}</span>
      </span>
    </li>
  );
});

IndexRow.displayName = "IndexRow";
