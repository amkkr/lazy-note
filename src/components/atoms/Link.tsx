import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { css } from "../../../styled-system/css";

interface LinkProps {
  children: ReactNode;
  to: string;
  variant?: "default" | "navigation" | "button" | "card";
  external?: boolean;
  className?: string;
}

/**
 * リンクコンポーネント
 */
export const Link = ({
  children,
  to,
  variant = "default",
  external = false,
  className,
}: LinkProps) => {
  const baseStyles = css({
    textDecoration: "none",
    transition: "all 0.2s ease",
  });

  // Editorial Citrus トークンへ移行 (R-2b / Issue #389)。
  // - default / navigation / card のリンク色は accent.link (indigo) で統一。
  //   light: cream-50 上 7.82:1 AAA / dark: sumi-950 上 8.79:1 AAA。
  // - button variant は CTA 扱いのため accent.brand を使用。
  //   文字色は light=cream.50, dark=ink.900 (CTA 専用ペア、AA pass を担保)。
  // - hover で色相を切り替えず、background の変化や filter で表現する
  //   (Editorial Citrus の「accent は単色運用」方針)。
  const variantStyles = {
    default: css({
      color: "accent.link",
      textDecoration: "underline",
    }),
    navigation: css({
      display: "inline-flex",
      alignItems: "center",
      gap: "sm",
      color: "accent.link",
      fontSize: "sm",
      fontWeight: "600",
    }),
    button: css({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "sm-md md",
      background: "accent.brand",
      // TODO(R-2c+): fg.onBrand semantic token に置換予定
      // (CTA 文字色を直書きせず semantic token に集約する。R-2a #388 は merge 準備中
      //  のため再変更は避け、R-2c または別 hotfix で導入。)
      color: { _light: "cream.50", _dark: "ink.900" },
      fontWeight: "600",
      borderRadius: "md",
      "&:hover": {
        background: "accent.brand",
        transform: "translateY(-1px)",
        filter: "brightness(0.92)",
      },
    }),
    card: css({
      display: "block",
      color: "inherit",
      "&:hover": {
        color: "accent.link",
      },
    }),
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className || ""}`;

  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={combinedClassName}
      >
        {children}
      </a>
    );
  }

  return (
    <RouterLink to={to} className={combinedClassName}>
      {children}
    </RouterLink>
  );
};
