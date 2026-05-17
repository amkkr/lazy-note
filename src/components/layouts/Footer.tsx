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
      {/*
       * 著作権表記は補助情報のため fg.muted を採用。Footer の bg.surface 上に
       * 置かれる前提で WCAG 1.4.3 AA (4.5:1) を満たす (実測 light 6.17:1 /
       * dark 7.91:1。light は AAA 7:1 未達のため補助情報専用で本文転用は不可。
       * 検証は colorTokens.test.ts §"Issue #537")。
       */}
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
