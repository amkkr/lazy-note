import { memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
import { Link } from "../atoms/Link";

interface PostNavigationProps {
  olderPost: PostSummary | null;
  newerPost: PostSummary | null;
}

// 親レイアウト (PostDetailPage) の bg.canvas 上に置かれる前後ナビの区切り線。
// Issue #409 で導入した border 専用 token (border.subtle) に置換 (Issue #419)。
// - 旧実装は bg.surface を使用していたが、light の bg.surface (cream-100) は
//   外側 bg.canvas (cream-50) との差が 1.06:1 で視覚消失していた。
// - border.subtle は WCAG 1.4.11 (Non-text Contrast) の 3:1 を満たす:
//   light: cream-300 × cream-50 (bg.canvas) = 3.49:1
//   dark : sumi-450  × sumi-950 (bg.canvas) = 6.18:1 (Issue #423 で sumi-400 から変更、Calm 思想と整合)
const navStyles = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "md",
  marginTop: "xl",
  paddingTop: "xl",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});

const linkContainerStyles = css({
  flex: "1",
  minWidth: "0",
});

const linkContainerRightStyles = css({
  textAlign: "right",
});

const labelStyles = css({
  display: "block",
  fontSize: "sm",
  // 「前/次の記事」ラベルは記事間の重要な誘導 UI のため fg.secondary を採用 (R-2b 修正)。
  // 当初 fg.muted (補助情報用) を当てていたが、devils-advocate レビュー (Q1) で
  // 「重要な誘導 UI に muted は弱すぎる」と指摘されたため fg.secondary に格上げ。
  // light: cream-50 上 9.59:1 AAA / dark: sumi-950 上 14.84:1 AAA を確保。
  color: "fg.secondary",
  marginBottom: "sm",
});

const titleStyles = css({
  display: "block",
  fontSize: "base",
  fontWeight: "600",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const PostNavigation = memo(
  ({ olderPost, newerPost }: PostNavigationProps) => {
    if (!olderPost && !newerPost) {
      return null;
    }

    return (
      <nav className={navStyles} aria-label="前後の記事">
        <div className={linkContainerStyles}>
          {olderPost && (
            // viewTransition=true で記事 → 記事の遷移時にも Hero morph
            // (前/次記事タイトル → 詳細 H1) が動作する (Issue #397 / 推奨 6)。
            <Link
              to={`/posts/${olderPost.id}`}
              variant="card"
              viewTransition={true}
            >
              <span className={labelStyles}>← 前の記事</span>
              <span className={titleStyles}>{olderPost.title}</span>
            </Link>
          )}
        </div>
        <div className={`${linkContainerStyles} ${linkContainerRightStyles}`}>
          {newerPost && (
            <Link
              to={`/posts/${newerPost.id}`}
              variant="card"
              viewTransition={true}
            >
              <span className={labelStyles}>次の記事 →</span>
              <span className={titleStyles}>{newerPost.title}</span>
            </Link>
          )}
        </div>
      </nav>
    );
  },
);

PostNavigation.displayName = "PostNavigation";
