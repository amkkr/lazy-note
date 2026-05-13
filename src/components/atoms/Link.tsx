import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { cva } from "../../../styled-system/css";
import { useViewTransitionNavigate } from "../../hooks/useViewTransitionNavigate";
import {
  focusRingOnAccentStyles,
  focusRingStyles,
} from "../../styles/focusRing";

type LinkVariant = "default" | "navigation" | "button" | "card";

interface LinkProps {
  children: ReactNode;
  to: string;
  variant?: LinkVariant;
  external?: boolean;
  className?: string;
  /**
   * SPA 遷移時に View Transitions API でラップするかどうか (Issue #397)。
   *
   * Editorial Bento の Featured / Bento / Index から記事詳細に遷移する際に
   * `view-transition-name: post-{id}` 同士を morph させるために使用する。
   * 未対応ブラウザ / prefers-reduced-motion の場合は通常遷移にフォールバック
   * する (`useViewTransitionNavigate` 内で graceful degrade)。
   *
   * external=true (外部リンク) の場合はブラウザ既定遷移となるため無視される。
   *
   * 実装上の注意: viewTransition=true は内部で `useNavigate` を呼ぶため、
   * 必ず Router context (BrowserRouter / MemoryRouter 等) の下で render される
   * 必要がある。Router 外で使う Link は viewTransition を指定しないこと。
   */
  viewTransition?: boolean;
  /**
   * インラインスタイル。Hero morph 用に `view-transition-name` (CSSProperties に
   * まだ収録されていない) を渡すケースに対応するため、CSSProperties を許容する。
   * Panda CSS の className では view-transition-name を動的に注入しづらいため、
   * 限定的に inline style での指定を許可する。
   */
  style?: CSSProperties;
}

/**
 * Link recipe (Issue #422 Option A)。
 *
 * Panda CSS の `cva` で variant を定義し、Tripwire テストは Component 側で
 * 吐く `data-token-*` 属性で検証する形に切り替えた。
 *
 * variant ごとの下線挙動 (R-5 / Issue #393):
 * - default     : 本文中のインラインリンク扱い → 常時 underline (WCAG 1.4.1 補強)
 * - navigation  : ヘッダ/フッタ/ページ間ナビ用 → underline なし。
 *                 配色 (accent.link) と weight + アイコン位置で誘導感を担保。
 * - button      : CTA 扱い → underline なし。背景色 (accent.brand) で誘導。
 * - card        : 記事カードラッパ → 通常時は underline なし、hover で color
 *                 のみ accent.link に切り替え (カード全体の装飾は内部要素が担う)。
 */
const linkRecipe = cva({
  base: {
    textDecoration: "none",
    transition: "all 0.2s ease",
    _motionReduce: {
      transition: "none",
    },
  },
  variants: {
    variant: {
      default: {
        color: "accent.link",
        // R-5 (Issue #393) AC (ii): 本文インラインリンクは常時 underline。
        textDecoration: "underline",
        textUnderlineOffset: "2px",
      },
      navigation: {
        display: "inline-flex",
        alignItems: "center",
        gap: "sm",
        color: "accent.link",
        fontSize: "sm",
        fontWeight: "600",
        // R-5 (Issue #393) AC (ii): Header/Footer ナビは下線なし、配色 + 太字で誘導。
        textDecoration: "none",
      },
      button: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "sm-md md",
        background: "accent.brand",
        // TODO(R-2c+): fg.onBrand semantic token に置換予定。
        color: { _light: "cream.50", _dark: "ink.900" },
        fontWeight: "600",
        borderRadius: "md",
        // R-5 (Issue #393) AC (ii): CTA は背景色で誘導するため下線なし。
        textDecoration: "none",
        "&:hover": {
          background: "accent.brand",
          transform: "translateY(-1px)",
          filter: "brightness(0.92)",
        },
      },
      card: {
        display: "block",
        color: "inherit",
        // R-5 (Issue #393) AC (ii): カードは内部見出しの underline で誘導するため
        // 全体としては下線なし。
        textDecoration: "none",
        "&:hover": {
          color: "accent.link",
        },
      },
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

/**
 * variant ごとに参照する Panda token を `data-token-*` 属性として
 * Tripwire テスト用に export する。
 *
 * Issue #422 DA: className 文字列マッチは Panda の `hash: true` で破綻する。
 * 意味属性に集約して hash 化耐性を確保する。
 *
 * `textDecoration` も variant の意味的特徴のため `data-text-decoration`
 * として吐く (R-5 / Issue #393 の Tripwire と対応)。
 *
 * Issue #474 DA: `color` には現時点で実 CSS が参照している primitive token を
 * 出力する (button variant は `_light: cream.50 / _dark: ink.900` のため
 * slash 表記)。`colorTodo` には R-2c+ で導入予定の semantic token
 * (`fg.onBrand`) を別属性で併記し、Tripwire テストでは「実 CSS と data 属性が
 * 一致している」「将来の置換先が宣言されている」の両方を独立に検証できる
 * ようにする (data 属性が実 CSS と乖離しない不変条件を機械的に保証)。
 */
const variantTokenAttrs: Record<
  LinkVariant,
  {
    color: string;
    colorTodo?: string;
    bg?: string;
    textDecoration: "underline" | "none";
    hoverColor?: string;
  }
> = {
  default: {
    color: "accent.link",
    textDecoration: "underline",
  },
  navigation: {
    color: "accent.link",
    textDecoration: "none",
  },
  button: {
    // 実 CSS は `_light: cream.50 / _dark: ink.900` (primitive 直書き)。
    // R-2c+ で `fg.onBrand` semantic token に置換予定 (`colorTodo` を参照)。
    color: "cream.50/ink.900",
    colorTodo: "fg.onBrand",
    bg: "accent.brand",
    textDecoration: "none",
  },
  card: {
    color: "inherit",
    textDecoration: "none",
    hoverColor: "accent.link",
  },
};

/**
 * View Transitions 対応版の Internal Link。
 *
 * 内部で `useNavigate` を使うため、必ず Router context の下でのみ render
 * される (= viewTransition=true の Link 利用箇所限定)。Router 外で使う Link
 * (PostNavigation テスト等で `react-router-dom` mock 下で render されるなど) は
 * 上位の Link コンポーネント側で本コンポーネントを呼び出さない分岐とする。
 */
const ViewTransitionLink = ({
  children,
  to,
  className,
  style,
  dataAttrs,
}: {
  children: ReactNode;
  to: string;
  className: string;
  style?: CSSProperties;
  dataAttrs: Record<string, string | undefined>;
}) => {
  const vtNavigate = useViewTransitionNavigate();

  // View Transitions 利用時のクリックハンドラ。
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    vtNavigate(to);
  };

  return (
    <RouterLink
      to={to}
      className={className}
      style={style}
      onClick={handleClick}
      {...dataAttrs}
    >
      {children}
    </RouterLink>
  );
};

/**
 * リンクコンポーネント
 *
 * - external=true: 新規タブで開く外部 anchor
 * - viewTransition=true: SPA 遷移を View Transitions API でラップする
 *   (Hero morph 用、Issue #397)。Router context 必須。
 * - 上記いずれでもない場合: 通常の RouterLink (React Router DOM)
 */
export const Link = ({
  children,
  to,
  variant = "default",
  external = false,
  className,
  viewTransition = false,
  style,
}: LinkProps) => {
  // focus-visible 二重リング (R-5 / Issue #393)
  const focusRingClass =
    variant === "button" ? focusRingOnAccentStyles : focusRingStyles;
  const focusRingTone = variant === "button" ? "on-accent" : "default";

  const combinedClassName = `${linkRecipe({ variant })} ${focusRingClass} ${className || ""}`;

  const tokens = variantTokenAttrs[variant];
  // Tripwire 用 data 属性。undefined は React により出力されないので
  // 必要なものだけ吐かせる。
  const dataAttrs: Record<string, string | undefined> = {
    "data-variant": variant,
    "data-token-color": tokens.color,
    "data-token-color-todo": tokens.colorTodo,
    "data-token-bg": tokens.bg,
    "data-token-hover-color": tokens.hoverColor,
    "data-text-decoration": tokens.textDecoration,
    "data-focus-ring": focusRingTone,
  };

  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={combinedClassName}
        style={style}
        {...dataAttrs}
      >
        {children}
      </a>
    );
  }

  if (viewTransition) {
    return (
      <ViewTransitionLink
        to={to}
        className={combinedClassName}
        style={style}
        dataAttrs={dataAttrs}
      >
        {children}
      </ViewTransitionLink>
    );
  }

  return (
    <RouterLink
      to={to}
      className={combinedClassName}
      style={style}
      {...dataAttrs}
    >
      {children}
    </RouterLink>
  );
};
