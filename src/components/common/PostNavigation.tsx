import { memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
import { Link } from "../atoms/Link";

interface PostNavigationProps {
  prevPost: PostSummary | null;
  nextPost: PostSummary | null;
}

const navStyles = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "md",
  marginTop: "xl",
  paddingTop: "xl",
  borderTop: "1px solid",
  borderColor: "bg.3",
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
  color: "fg.3",
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

/**
 * 前後記事ナビゲーションコンポーネント
 * 記事詳細ページ下部に前後の記事へのリンクを表示する
 */
export const PostNavigation = memo(
  ({ prevPost, nextPost }: PostNavigationProps) => {
    if (!prevPost && !nextPost) {
      return null;
    }

    return (
      <nav className={navStyles} aria-label="前後の記事">
        <div className={linkContainerStyles}>
          {prevPost && (
            <Link to={`/posts/${prevPost.id}`} variant="card">
              <span className={labelStyles}>← 前の記事</span>
              <span className={titleStyles}>{prevPost.title}</span>
            </Link>
          )}
        </div>
        <div className={`${linkContainerStyles} ${linkContainerRightStyles}`}>
          {nextPost && (
            <Link to={`/posts/${nextPost.id}`} variant="card">
              <span className={labelStyles}>次の記事 →</span>
              <span className={titleStyles}>{nextPost.title}</span>
            </Link>
          )}
        </div>
      </nav>
    );
  },
);

PostNavigation.displayName = "PostNavigation";
