import { css } from "../../../styled-system/css";
import { BrandName } from "../common/BrandName";

export const Footer = () => {
  return (
    <footer
      className={css({
        background: "bg.surface",
        color: "fg.secondary",
        padding: "md",
        minHeight: "header",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        md: {
          padding: "content",
        },
      })}
    >
      <div
        className={css({
          fontSize: "sm",
          fontWeight: "600",
          marginBottom: "xs",
          color: "fg.secondary",
        })}
      >
        <BrandName variant="footer" />
      </div>
      <div
        className={css({
          color: "fg.muted",
          fontSize: "xs",
        })}
      >
        © 2025 Lazy Note. All rights reserved.
      </div>
    </footer>
  );
};
