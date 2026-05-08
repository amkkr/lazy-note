import { memo, type ReactNode } from "react";
import { css } from "../../../styled-system/css";
import {
  focusRingOnAccentStyles,
  focusRingStyles,
} from "../../styles/focusRing";

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
// R-5 (Issue #393) で focus ring を src/styles/focusRing.ts に共通化。
// outline は none に統一し、box-shadow 二重リングで track 形状を保つ。
// transition は prefers-reduced-motion: reduce 時に無効化する。
const baseButtonStyles = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "md",
  fontWeight: "medium",
  transition: "all 0.2s ease",
  _motionReduce: {
    transition: "none",
  },
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
//   文字色は fg.onBrand (Issue #408 で primitive 直書きから semantic token に集約)。
//   light: fg.onBrand (cream-50) × accent.brand (persimmon-600) = 5.74:1 AA。
//   dark : fg.onBrand (ink-900)  × accent.brand (persimmon-500) = 5.42:1 AA。
// - secondary は表面階層のため bg.elevated / bg.surface で構成し、文字色は fg.primary。
//   light: bg.elevated (cream-50) × fg.primary (ink-primary) = 17.16:1 AAA。
//   dark : bg.elevated (sumi-600) × fg.primary (bone-50) = 7.76:1 AAA (実測)。
// - ghost のテキストはリンク扱いとし accent.link (indigo) を使用。
//   light: bg.canvas/surface × accent.link (indigo-500) = 7.82:1 AAA。
//   dark : bg.canvas × accent.link (indigo-300) = 8.79:1 AAA。
const variantStyles = {
  primary: css({
    background: "accent.brand",
    color: "fg.onBrand",
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
 *
 * R-5 (Issue #393) で focus-visible 二重リングを variant 別に切替:
 * - primary: 背景が accent.brand (persimmon) のため `focusRingOnAccentStyles`
 *   (内側 ink-900/cream-50 + 外側 citrus-500) を使用。
 * - secondary / ghost: 通常背景上のため `focusRingStyles`
 *   (内側 bg.canvas + 外側 citrus-500) を使用。
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
    const focusRingClass =
      variant === "primary" ? focusRingOnAccentStyles : focusRingStyles;
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${baseButtonStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${focusRingClass} ${className || ""}`}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
