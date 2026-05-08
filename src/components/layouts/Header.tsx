import { css } from "../../../styled-system/css";
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
            // 表記を「全 N 件」とし、視覚と SR で同じ意味が伝わるように統一。
            // aria-label で SR には「記事 N 件」と意味明確に補完する。
            <div
              aria-label={`記事 ${postCount} 件`}
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
              全 {postCount} 件
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
