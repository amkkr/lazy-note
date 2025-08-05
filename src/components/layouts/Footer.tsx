import { css } from "../../../styled-system/css";
import { BrandName } from "../common/BrandName";

export const Footer = () => {
  return (
    <footer
      className={css({
        background: "bg.1",
        color: "fg.2",
        padding: "content",
        minHeight: "header",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      })}
    >
      <div
        className={css({
          fontSize: "sm",
          fontWeight: "600",
          marginBottom: "xs",
          color: "fg.2",
        })}
      >
        <BrandName variant="footer" />
      </div>
      <div
        className={css({
          color: "fg.4",
          fontSize: "xs",
        })}
      >
        © 2025 Lazy Note. All rights reserved.
      </div>
    </footer>
  );
};
