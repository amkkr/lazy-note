import { css } from "../../../styled-system/css";
import { BrandName } from "../common/BrandName";
import { SearchTrigger } from "../common/Search/SearchTrigger";
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
              📚 {postCount}記事
            </div>
          )}
          <SearchTrigger />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
