import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { css } from "../../../styled-system/css";
import { useViewTransitionNavigate } from "../../hooks/useViewTransitionNavigate";
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
 * Link 共通スタイル定義。
 *
 * 表示用の hook (Panda の css() 呼び出し) に副作用は無いので、コンポーネント
 * 外側 (関数内 module-scope) で組み立てて全ての Link variant が共有する。
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
const buildLinkClassName = (
  variant: NonNullable<LinkProps["variant"]>,
  className: string | undefined,
): string => {
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
  //   文字色は light=cream.50, dark=ink.900 (CTA 専用ペア、AA pass を担保)。
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
      // TODO(R-2c+): fg.onBrand semantic token に置換予定
      // (CTA 文字色を直書きせず semantic token に集約する。R-2a #388 は merge 準備中
      //  のため再変更は避け、R-2c または別 hotfix で導入。)
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

  return `${baseStyles} ${variantStyles[variant]} ${focusRingClass} ${className || ""}`;
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
}: {
  children: ReactNode;
  to: string;
  className: string;
  style?: CSSProperties;
}) => {
  const vtNavigate = useViewTransitionNavigate();

  // View Transitions 利用時のクリックハンドラ。
  // - 修飾キー併用 (Cmd/Ctrl/Shift/Alt クリック / 中クリック) は新規タブやウィンドウ
  //   操作のため preventDefault せず、ブラウザ既定挙動に委ねる。
  // - target=_blank なども想定されるが、本コンポーネントは internal Link なので
  //   そのケースは external prop 側を使う前提。
  // - 通常クリックのみ preventDefault → vtNavigate でラップ navigate を実行する。
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
  const combinedClassName = buildLinkClassName(variant, className);

  if (external) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        className={combinedClassName}
        style={style}
      >
        {children}
      </a>
    );
  }

  if (viewTransition) {
    return (
      <ViewTransitionLink to={to} className={combinedClassName} style={style}>
        {children}
      </ViewTransitionLink>
    );
  }

  return (
    <RouterLink to={to} className={combinedClassName} style={style}>
      {children}
    </RouterLink>
  );
};
