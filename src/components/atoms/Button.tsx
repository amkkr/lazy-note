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

// ベーススタイル（全バリアント共通）
const baseButtonStyles = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "md",
  fontWeight: "medium",
  transition: "all 0.2s ease",
  cursor: "pointer",
  border: "none",
  outline: "none",
  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
});

// バリアントスタイル
// 旧 Gruvbox トークン群を Editorial Citrus セマンティック token に置換 (R-2b)。
// - primary は CTA 系のため accent.brand (persimmon) を使用。
//   文字色は light=cream.50, dark=ink.900 (CTA 専用ペア、scripts/calculateContrast.ts で
//   light 5.74:1 AA / dark は ink-900 × persimmon-500 で AA pass を担保)。
// - secondary は表面階層のため bg.elevated / bg.surface で構成し、文字色は fg.primary。
//   light: bg.elevated (cream-50) × fg.primary (ink-primary) = 17.16:1 AAA。
//   dark : bg.elevated (sumi-600) × fg.primary (bone-50) = 7.76:1 AAA (実測)。
// - ghost のテキストはリンク扱いとし accent.link (indigo) を使用。
//   light: bg.canvas/surface × accent.link (indigo-500) = 7.82:1 AAA。
//   dark : bg.canvas × accent.link (indigo-300) = 8.79:1 AAA。
const variantStyles = {
  primary: css({
    background: "accent.brand",
    color: { _light: "cream.50", _dark: "ink.900" },
    "&:hover:not(:disabled)": {
      background: "accent.brand",
      transform: "translateY(-1px)",
      filter: "brightness(0.92)",
    },
  }),
  secondary: css({
    background: "bg.elevated",
    color: "fg.primary",
    border: "1px solid",
    borderColor: "bg.surface",
    "&:hover:not(:disabled)": {
      background: "bg.surface",
      transform: "translateY(-1px)",
    },
  }),
  ghost: css({
    background: "transparent",
    color: "accent.link",
    "&:hover:not(:disabled)": {
      background: "bg.surface",
      color: "accent.link",
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
export const Button = memo(
  ({
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
        className={`${baseButtonStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ""}`}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
