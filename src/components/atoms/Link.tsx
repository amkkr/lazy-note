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

  const variantStyles = {
    default: css({
      color: "blue.light",
      textDecoration: "underline",
      "&:hover": {
        color: "aqua.light",
      },
    }),
    navigation: css({
      display: "inline-flex",
      alignItems: "center",
      gap: "sm",
      color: "blue.light",
      fontSize: "sm",
      fontWeight: "600",
      "&:hover": {
        color: "aqua.light",
      },
    }),
    button: css({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "sm-md md",
      background: "blue.light",
      color: "fg.0",
      fontWeight: "600",
      borderRadius: "md",
      "&:hover": {
        background: "blue.dark",
        transform: "translateY(-1px)",
      },
    }),
    card: css({
      display: "block",
      color: "inherit",
      "&:hover": {
        color: "blue.light",
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
