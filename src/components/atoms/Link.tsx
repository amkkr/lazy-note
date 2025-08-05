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
      gap: "8px",
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
      padding: "12px 16px",
      background: "blue.light",
      color: "white",
      fontWeight: "600",
      borderRadius: "8px",
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