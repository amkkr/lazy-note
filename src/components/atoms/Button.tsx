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
  // Issue #421 修正: R-2b の bg.elevated 反転 border は light で
  //   bg.surface (cream-100) × bg.elevated (cream-50) = 1.06:1 となり
  //   視覚消失していた。border 専用 token (border.subtle) に置換することで、
  //   1.4.11 (Non-text Contrast) 3:1 を確保する。
  //   - light: bg.surface (cream-100) × border.subtle (cream-300) = 3.29:1 PASS
  //   - dark : bg.surface (sumi-700) × border.subtle (sumi-450) = 3.29:1 PASS
  // また hover 背景は bg.elevated のままだと dark で
  //   bg.elevated (sumi-600) × border.subtle (sumi-450) = 2.25:1 となり 3:1 未達。
  // 対応として hover 背景を bg.muted に変更:
  //   - light: bg.muted (cream-75) × border.subtle (cream-300) = 3.39:1 PASS
  //   - dark : bg.muted (sumi-650) × border.subtle (sumi-450) = 4.94:1 PASS
  // 本文コントラスト (AAA 7.20:1) も維持される:
  //   - light: bg.surface × fg.primary = 16.19:1 / bg.muted × fg.primary = 16.67:1
  //   - dark : bg.surface × fg.primary = 7.93:1 / bg.muted × fg.primary = 13.59:1
  // 視覚効果: hover が「明るくフラッシュ」→「わずかに沈み込み」となり、
  // Editorial Citrus の Calm 思想と整合する。
  secondary: css({
    background: "bg.surface",
    color: "fg.primary",
    border: "1px solid",
    borderColor: "border.subtle",
    "&:hover:not(:disabled)": {
      background: "bg.muted",
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
