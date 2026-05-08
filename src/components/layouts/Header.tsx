import { css } from "../../../styled-system/css";
import { visuallyHidden } from "../../../styled-system/patterns";
import { BrandName } from "../common/BrandName";
import { ThemeToggle } from "../common/ThemeToggle";

interface HeaderProps {
  postCount?: number;
}

export const Header = ({ postCount }: HeaderProps) => {
  return (
    <header
      className={css({
        background: "bg.0",
        color: "fg.1",
        paddingY: "content",
        paddingX: "md",
        minHeight: "header",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        md: {
          paddingX: "0",
        },
      })}
    >
      <div
        className={css({
          maxWidth: "content",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        })}
      >
        <BrandName variant="header" />

        <div
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "md",
          })}
        >
          {postCount !== undefined && (
            // R-4 (Issue #392) で BookOpen 装飾を削除。
            // 視覚は短く「全 N 件」、SR は意味明確に「記事 N 件」と読み上げる
            // 両立対応 (DA 重大 5、Reviewer praise)。
            // - 視覚テキスト: aria-hidden で SR から隠す
            // - 補助テキスト: visuallyHidden パターンで視覚から隠し SR にだけ届ける
            // div に直接 aria-label を付けると Biome a11y
            // (useAriaPropsSupportedByRole) を踏むため、テキスト二重化方式を採用。
            <div
              className={css({
                background: "bg.2",
                color: "fg.1",
                paddingY: "sm",
                paddingX: "md",
                borderRadius: "xl",
                fontSize: "sm",
                fontWeight: "bold",
                boxShadow: "card",
              })}
            >
              <span aria-hidden="true">全 {postCount} 件</span>
              <span className={visuallyHidden()}>記事 {postCount} 件</span>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
