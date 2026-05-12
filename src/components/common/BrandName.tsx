import { Link } from "react-router-dom";
import { css } from "../../../styled-system/css";
import { focusRingStyles } from "../../styles/focusRing";

interface BrandNameProps {
  variant?: "header" | "footer";
}

export const BrandName = ({ variant = "header" }: BrandNameProps) => {
  const isHeader = variant === "header";

  // Editorial Citrus: header はブランド見出し相当 (fg.primary)、
  // footer は補助情報相当 (fg.secondary)。Header/Footer どちらも
  // bg.canvas (light: cream.50 / dark: sumi.950) 上に配置されるため、
  // R-5 (Issue #393) の visible focus ring は通常背景向け
  // `focusRingStyles` (内側 citrus / 外側 ink-900 or cream-50) を適用する。
  const brandLinkStyles = css({
    fontSize: isHeader ? "lg" : "sm",
    fontWeight: "bold",
    color: isHeader ? "fg.primary" : "fg.secondary",
    textDecoration: "none",
    ...(variant === "footer" && {
      marginBottom: "xs",
    }),
  });

  return (
    <Link
      to="/"
      className={`${brandLinkStyles} ${focusRingStyles}`}
      data-variant={variant}
      data-focus-ring="default"
    >
      Lazy Note
    </Link>
  );
};
