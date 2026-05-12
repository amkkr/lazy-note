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
  background: "bg.surface",
  borderRadius: "lg",
  overflow: "hidden",
  boxShadow: "card",
});

// 親 cardStyles の bg.surface (light: cream-100 / dark: sumi-700) 上に置く
// 1px divider。Issue #409 で導入した border 専用 token (border.subtle) に
// 置換 (Issue #419)。
// - 旧実装は bg.elevated を使用していたが、light の bg.elevated (cream-100) は
//   bg.surface (cream-50) との差が 1.06:1 で視覚消失していた。
// - border.subtle は WCAG 1.4.11 (Non-text Contrast) の 3:1 を満たす:
//   light: cream-300 × cream-100 (bg.surface) = 3.29:1
//   dark : sumi-450  × sumi-700  (bg.surface) = 3.29:1 (Issue #423 で sumi-400 から変更)
const cardHeaderStyles = css({
  padding: "sm-md",
  paddingBottom: "md",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
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
  background: "bg.elevated",
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
  const skeletonItems = Array.from(
    { length: count },
    (_, i) => `skeleton-${i}`,
  );

  return (
    <div
      className={containerStyles}
      role="status"
      aria-busy="true"
      aria-label="記事を読み込み中"
    >
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
