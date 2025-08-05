import type { ReactNode } from "react";
import { css } from "../../../styled-system/css";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "small" | "medium" | "large";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

/**
 * ボタンコンポーネント
 */
export const Button = ({
  children,
  variant = "primary",
  size = "medium",
  onClick,
  disabled = false,
  type = "button",
  className,
}: ButtonProps) => {
  const baseStyles = css({});

  const variantStyles = {
    primary: css({
      background: "blue.light",
      color: "white",
      "&:hover:not(:disabled)": {
        background: "blue.dark",
        transform: "translateY(-1px)",
      },
    }),
    secondary: css({
      background: "bg.2",
      color: "fg.1",
      border: "1px solid",
      borderColor: "bg.3",
      "&:hover:not(:disabled)": {
        background: "bg.3",
        transform: "translateY(-1px)",
      },
    }),
    ghost: css({
      background: "transparent",
      color: "blue.light",
      "&:hover:not(:disabled)": {
        background: "bg.1",
        color: "aqua.light",
      },
    }),
  };

  const sizeStyles = {
    small: css({
      padding: "sm sm-md",
      fontSize: "sm",
      gap: "xs",
    }),
    medium: css({
      padding: "sm-md md",
      fontSize: "base",
      gap: "xs-sm",
    }),
    large: css({
      padding: "md lg",
      fontSize: "lg",
      gap: "sm",
    }),
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ""}`}
    >
      {children}
    </button>
  );
};