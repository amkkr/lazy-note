import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { css } from "../../../styled-system/css";
import {
  focusRingOnAccentStyles,
  focusRingStyles,
} from "../../styles/focusRing";

interface LinkProps {
  children: ReactNode;
  to: string;
  variant?: "default" | "navigation" | "button" | "card";
  external?: boolean;
  className?: string;
}

/**
 * リンクコンポーネント
 *
 * variant ごとの下線挙動 (R-5 / Issue #393):
 * - default     : 本文中のインラインリンク扱い → 常時 underline (WCAG 1.4.1 補強)
 * - navigation  : ヘッダ/フッタ/ページ間ナビ用 → underline なし。
 *                 配色 (accent.link) と weight + アイコン位置で誘導感を担保。
 * - button      : CTA 扱い → underline なし。背景色 (accent.brand) で誘導。
 * - card        : 記事カードラッパ → 通常時は underline なし、hover で color
 *                 のみ accent.link に切り替え (カード全体の装飾は内部要素が担う)。
 *
 * focus-visible リングは src/styles/focusRing.ts に共通化:
 * - button variant のみ accent.brand (persimmon) 背景上のため
 *   `focusRingOnAccentStyles` (内側 ink-900/cream-50 + 外側 citrus-500)。
 * - 他 variant は `focusRingStyles` (内側 bg.canvas + 外側 citrus-500)。
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
    _motionReduce: {
      transition: "none",
    },
  });

  // Editorial Citrus トークンへ移行 (R-2b / Issue #389)。
  // - default / navigation / card のリンク色は accent.link (indigo) で統一。
  //   light: cream-50 上 7.82:1 AAA / dark: sumi-950 上 8.79:1 AAA。
  // - button variant は CTA 扱いのため accent.brand を使用。
  //   文字色は fg.onBrand (Issue #408 で primitive 直書きから semantic token に集約)。
  //   light: fg.onBrand (cream-50) × accent.brand (persimmon-600) = 5.74:1 AA。
  //   dark : fg.onBrand (ink-900)  × accent.brand (persimmon-500) = 5.42:1 AA。
  // - hover で色相を切り替えず、background の変化や filter で表現する
  //   (Editorial Citrus の「accent は単色運用」方針)。
  const variantStyles = {
    default: css({
      color: "accent.link",
      // R-5 (Issue #393) AC (ii): 本文インラインリンクは常時 underline。
      // PostDetailPage.tsx の prose 内の <a> 既存スタイルとも整合。
      textDecoration: "underline",
      textUnderlineOffset: "2px",
    }),
    navigation: css({
      display: "inline-flex",
      alignItems: "center",
      gap: "sm",
      color: "accent.link",
      fontSize: "sm",
      fontWeight: "600",
      // R-5 (Issue #393) AC (ii): Header/Footer ナビは下線なし、配色 + 太字で誘導。
      textDecoration: "none",
    }),
    button: css({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "sm-md md",
      background: "accent.brand",
      color: "fg.onBrand",
      fontWeight: "600",
      borderRadius: "md",
      // R-5 (Issue #393) AC (ii): CTA は背景色で誘導するため下線なし。
      textDecoration: "none",
      "&:hover": {
        background: "accent.brand",
        transform: "translateY(-1px)",
        filter: "brightness(0.92)",
      },
    }),
    card: css({
      display: "block",
      color: "inherit",
      // R-5 (Issue #393) AC (ii): カードは内部見出しの underline で誘導するため
      // 全体としては下線なし。
      textDecoration: "none",
      "&:hover": {
        color: "accent.link",
      },
    }),
  };

  // focus-visible 二重リング (R-5 / Issue #393)
  const focusRingClass =
    variant === "button" ? focusRingOnAccentStyles : focusRingStyles;

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${focusRingClass} ${className || ""}`;

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
