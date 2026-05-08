import { memo } from "react";
import { css } from "../../../styled-system/css";

const wrapperStyles = css({
  background: "bg.canvas",
  minHeight: "100vh",
});

const innerStyles = css({
  maxWidth: "article",
  margin: "0 auto",
  padding: "md",
  md: {
    padding: "content",
  },
});

// border は bg.surface 同色で視覚消失していたため bg.elevated に変更 (R-2b 修正)。
// 旧 Gruvbox では bg.1 (背景) / bg.3 (border) で明度差があったが、Editorial Citrus
// で機械的に bg.surface に圧縮した結果 1.0:1 となっていた。bg.elevated を採用すると
// 背景 surface より明るい "ハイライト" 風の枠線になり、視覚的に区別可能。
const articleStyles = css({
  background: "bg.surface",
  borderRadius: "lg",
  overflow: "hidden",
  boxShadow: "card-hover",
  border: "1px solid",
  borderColor: "bg.elevated",
});

const headerStyles = css({
  background: "gradients.primary",
  padding: "md",
  md: {
    padding: "section",
  },
});

// 親 articleStyles の bg.surface 上に置く 1px divider のため、同色だと消失する。
// bg.elevated (より明るい色) でハイライト風の区切り線にする (R-2b 修正)。
const dividerStyles = css({
  height: "1px",
  background: "bg.elevated",
});

const contentStyles = css({
  paddingRight: "md",
  paddingLeft: "md",
  paddingBottom: "md",
  paddingTop: "lg",
  md: {
    paddingRight: "section",
    paddingLeft: "section",
    paddingBottom: "section",
    paddingTop: "xl",
  },
});

const skeletonBase = css({
  background: "bg.elevated",
  borderRadius: "sm",
  animation: "skeleton-pulse 1.5s ease-in-out infinite",
});

const headerTitleStyles = css({
  height: "32px",
  width: "70%",
  marginBottom: "card",
  opacity: 0.6,
});

const headerMetaStyles = css({
  height: "16px",
  width: "200px",
  opacity: 0.6,
});

const paragraphFullStyles = css({
  height: "16px",
  width: "100%",
  marginBottom: "sm-md",
});

const paragraphPartialStyles = css({
  height: "16px",
  width: "85%",
  marginBottom: "sm-md",
});

const paragraphShortStyles = css({
  height: "16px",
  width: "60%",
  marginBottom: "lg",
});

const headingStyles = css({
  height: "22px",
  width: "40%",
  marginTop: "xl",
  marginBottom: "md",
});

// borderBottom も bg.surface 同色で視覚消失していたため bg.elevated に変更 (R-2b 修正)。
const navStyles = css({
  background: "bg.surface",
  borderBottom: "1px solid",
  borderColor: "bg.elevated",
  paddingY: "sm-md",
  paddingX: "md",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  md: {
    paddingX: "0",
  },
});

const navInnerStyles = css({
  maxWidth: "content",
  width: "100%",
});

const navLinkStyles = css({
  height: "16px",
  width: "120px",
});

/**
 * 記事詳細ページ用スケルトンローディング
 */
export const ArticleSkeleton = memo(() => {
  return (
    <div role="status" aria-busy="true" aria-label="記事を読み込み中">
      {/* ナビゲーションスケルトン */}
      <nav className={navStyles}>
        <div className={navInnerStyles}>
          <div className={`${skeletonBase} ${navLinkStyles}`} />
        </div>
      </nav>

      <div className={wrapperStyles}>
        <div className={innerStyles}>
          <article className={articleStyles}>
            {/* ヘッダースケルトン */}
            <header className={headerStyles}>
              <div className={`${skeletonBase} ${headerTitleStyles}`} />
              <div className={`${skeletonBase} ${headerMetaStyles}`} />
            </header>

            <div className={dividerStyles} />

            {/* コンテンツスケルトン */}
            <div className={contentStyles}>
              {/* 段落1 */}
              <div className={`${skeletonBase} ${paragraphFullStyles}`} />
              <div className={`${skeletonBase} ${paragraphPartialStyles}`} />
              <div className={`${skeletonBase} ${paragraphShortStyles}`} />

              {/* 見出し */}
              <div className={`${skeletonBase} ${headingStyles}`} />

              {/* 段落2 */}
              <div className={`${skeletonBase} ${paragraphFullStyles}`} />
              <div className={`${skeletonBase} ${paragraphFullStyles}`} />
              <div className={`${skeletonBase} ${paragraphPartialStyles}`} />
              <div className={`${skeletonBase} ${paragraphShortStyles}`} />

              {/* 見出し */}
              <div className={`${skeletonBase} ${headingStyles}`} />

              {/* 段落3 */}
              <div className={`${skeletonBase} ${paragraphFullStyles}`} />
              <div className={`${skeletonBase} ${paragraphPartialStyles}`} />
              <div className={`${skeletonBase} ${paragraphFullStyles}`} />
              <div className={`${skeletonBase} ${paragraphShortStyles}`} />
            </div>
          </article>
        </div>
      </div>
    </div>
  );
});

ArticleSkeleton.displayName = "ArticleSkeleton";
