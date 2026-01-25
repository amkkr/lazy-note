import { memo, type ReactNode } from "react";
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

// スタイルをコンポーネント外に定数として定義（毎レンダリングでの再生成を防ぐ）
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
} as const;

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
} as const;

/**
 * ボタンコンポーネント（CSS定数抽出 + React.memoでメモ化）
 */
export const Button = memo(({
  children,
  variant = "primary",
  size = "medium",
  onClick,
  disabled = false,
  type = "button",
  className,
}: ButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variantStyles[variant]} ${sizeStyles[size]} ${className || ""}`}
    >
      {children}
    </button>
  );
});
