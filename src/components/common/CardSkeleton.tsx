import { memo } from "react";
import { css } from "../../../styled-system/css";

interface CardSkeletonProps {
  count?: number;
}

const containerStyles = css({
  maxWidth: "content",
  margin: "0 auto",
  padding: "content",
  paddingX: "md",
  md: {
    paddingX: "xl",
  },
});

const listStyles = css({
  display: "flex",
  flexDirection: "column",
  gap: "xl",
  paddingTop: "sm-md",
});

const cardStyles = css({
  background: "bg.1",
  borderRadius: "lg",
  overflow: "hidden",
  boxShadow: "card",
});

const cardHeaderStyles = css({
  padding: "sm-md",
  paddingBottom: "md",
  borderBottom: "1px solid",
  borderColor: "bg.3",
  display: "flex",
  alignItems: "center",
  gap: "sm",
  md: {
    padding: "card",
    paddingBottom: "md",
    paddingX: "sm-md",
  },
});

const cardContentStyles = css({
  padding: "sm-md",
  md: {
    padding: "card",
  },
});

const skeletonBase = css({
  background: "bg.2",
  borderRadius: "sm",
  animation: "skeleton-pulse 1.5s ease-in-out infinite",
});

const metaLineStyles = css({
  height: "14px",
  width: "180px",
});

const titleLineStyles = css({
  height: "22px",
  width: "75%",
  marginBottom: "sm",
});

const excerptLine1Styles = css({
  height: "14px",
  width: "100%",
  marginTop: "sm",
});

const excerptLine2Styles = css({
  height: "14px",
  width: "60%",
  marginTop: "sm",
});

/**
 * ホームページ用カード型スケルトンローディング
 */
export const CardSkeleton = memo(({ count = 4 }: CardSkeletonProps) => {
  const skeletonItems = Array.from({ length: count }, (_, i) => `skeleton-${i}`);

  return (
    <div className={containerStyles} role="status" aria-busy="true" aria-label="記事を読み込み中">
      <div className={listStyles}>
        {skeletonItems.map((key) => (
          <div key={key} className={cardStyles}>
            <div className={cardHeaderStyles}>
              <div className={`${skeletonBase} ${metaLineStyles}`} />
            </div>
            <div className={cardContentStyles}>
              <div className={`${skeletonBase} ${titleLineStyles}`} />
              <div className={`${skeletonBase} ${excerptLine1Styles}`} />
              <div className={`${skeletonBase} ${excerptLine2Styles}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

CardSkeleton.displayName = "CardSkeleton";
