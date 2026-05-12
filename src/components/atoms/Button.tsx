import { memo, type ReactNode } from "react";
import { cva } from "../../../styled-system/css";
import {
  focusRingOnAccentStyles,
  focusRingStyles,
} from "../../styles/focusRing";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "small" | "medium" | "large";

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

/**
 * Button の recipe (Issue #422 Option A)。
 *
 * Panda CSS の `cva` で variant / size を定義し、生成 className は hash 化
 * オプション (panda.config.ts の `hash: true`) を有効化しても破綻しないよう、
 * Component 側で `data-variant` / `data-size` 等の属性を併せて吐く構造に
 * リファクタした。
 *
 * Tripwire テストは className 文字列マッチ (`/bg_accent\.brand/` 等) では
 * なく、`data-token-bg="accent.brand"` といった意味属性で検証する
 * (Issue #422 DA レビューで jsdom の var() 解決不能が物理的に確認済み)。
 *
 * - primary: CTA。accent.brand 背景 + 文字色 light=cream.50 / dark=ink.900。
 * - secondary: bg.surface 背景 + border.subtle 枠線。hover で bg.muted に沈み込み。
 * - ghost: 透明背景 + accent.link 文字色。
 *
 * border / hover token の根拠は src/components/atoms/Button.tsx の旧版 JSDoc
 * (R-2b / Issue #421 / Issue #423) と同じ。
 */
const buttonRecipe = cva({
  base: {
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
  },
  variants: {
    variant: {
      primary: {
        background: "accent.brand",
        // TODO(R-2c+): fg.onBrand semantic token に置換予定。
        color: { _light: "cream.50", _dark: "ink.900" },
        "&:hover:not(:disabled)": {
          background: "accent.brand",
          transform: "translateY(-1px)",
          filter: "brightness(0.92)",
        },
      },
      secondary: {
        background: "bg.surface",
        color: "fg.primary",
        border: "1px solid",
        borderColor: "border.subtle",
        "&:hover:not(:disabled)": {
          background: "bg.muted",
          transform: "translateY(-1px)",
        },
      },
      ghost: {
        background: "transparent",
        color: "accent.link",
        "&:hover:not(:disabled)": {
          background: "bg.surface",
          color: "accent.link",
        },
      },
    },
    size: {
      small: {
        padding: "sm sm-md",
        fontSize: "sm",
        gap: "xs",
      },
      medium: {
        padding: "sm-md md",
        fontSize: "base",
        gap: "xs-sm",
      },
      large: {
        padding: "md lg",
        fontSize: "lg",
        gap: "sm",
      },
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "medium",
  },
});

/**
 * variant ごとに参照する Panda token を `data-token-*` 属性として
 * Tripwire テスト用に export する。
 *
 * Issue #422 DA: className 文字列マッチ (`/bg_accent\.brand/` 等) は
 * Panda の `hash: true` を有効化すると破綻するため、意味属性に集約する。
 */
const variantTokenAttrs: Record<
  ButtonVariant,
  {
    bg: string;
    color: string;
    border?: string;
    hoverBg?: string;
  }
> = {
  primary: {
    bg: "accent.brand",
    color: "fg.onBrand",
  },
  secondary: {
    bg: "bg.surface",
    color: "fg.primary",
    border: "border.subtle",
    hoverBg: "bg.muted",
  },
  ghost: {
    bg: "transparent",
    color: "accent.link",
    hoverBg: "bg.surface",
  },
};

/**
 * ボタンコンポーネント（cva recipe + data-token 属性で hash 化耐性を確保）
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
    const focusRingTone = variant === "primary" ? "on-accent" : "default";
    const tokens = variantTokenAttrs[variant];

    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${buttonRecipe({ variant, size })} ${focusRingClass} ${className || ""}`}
        data-variant={variant}
        data-size={size}
        data-token-bg={tokens.bg}
        data-token-color={tokens.color}
        data-token-border={tokens.border}
        data-token-hover-bg={tokens.hoverBg}
        data-focus-ring={focusRingTone}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
