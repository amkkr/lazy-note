import { memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
import { Link } from "../atoms/Link";

interface PostNavigationProps {
  olderPost: PostSummary | null;
  newerPost: PostSummary | null;
}

const navStyles = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "md",
  marginTop: "xl",
  paddingTop: "xl",
  borderTop: "1px solid",
  borderColor: "bg.surface",
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
            <Link to={`/posts/${olderPost.id}`} variant="card">
              <span className={labelStyles}>← 前の記事</span>
              <span className={titleStyles}>{olderPost.title}</span>
            </Link>
          )}
        </div>
        <div className={`${linkContainerStyles} ${linkContainerRightStyles}`}>
          {newerPost && (
            <Link to={`/posts/${newerPost.id}`} variant="card">
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
