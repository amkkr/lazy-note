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
    // TODO(R-2c+): fg.onBrand semantic token に置換予定
    // (CTA 文字色を直書きせず semantic token に集約する。R-2a #388 は merge 準備中
    //  のため再変更は避け、R-2c または別 hotfix で導入。)
    color: { _light: "cream.50", _dark: "ink.900" },
    "&:hover:not(:disabled)": {
      background: "accent.brand",
      transform: "translateY(-1px)",
      filter: "brightness(0.92)",
    },
  }),
  // R-2b 修正: border bg.surface × bg bg.elevated は 1.06:1 で枠線が視覚消失していたため、
  // bg を bg.surface (一段濃い色) / border を bg.elevated (ハイライト色) に反転。
  // light: bg.surface (cream-100) × fg.primary = 16.19:1 AAA を維持。
  // dark : bg.surface (sumi-700) × fg.primary (bone-50) = 7.93:1 AAA を維持。
  secondary: css({
    background: "bg.surface",
    color: "fg.primary",
    border: "1px solid",
    borderColor: "bg.elevated",
    "&:hover:not(:disabled)": {
      background: "bg.elevated",
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
