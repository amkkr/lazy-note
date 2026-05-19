import { Transition } from "@headlessui/react";
import { css } from "../../../styled-system/css";
import { useScrollPosition } from "../../hooks/useScrollPosition";
import { focusRingStyles } from "../../styles/focusRing";

const SHOW_THRESHOLD = 300;

/**
 * ボタンの aria-label。スクリーンリーダ向けの操作説明として観測される単独参照の文言だが、
 * 表示文言の散らばり防止 (Issue #534 follow-up: Issue #707) のため、PostDetailPage 等の先行 PR と
 * 同方針で `as const` + UPPER_SNAKE_CASE で定数化する。
 *
 * PostDetailPage の `POST_DETAIL_BACK_TO_TOP_LABEL = "← TOPに戻る"` とは意味が異なる:
 *   - こちらは「ページトップへ戻る」(常設の浮動ボタンの aria-label)
 *   - PostDetailPage 側は「記事末尾から記事冒頭(= 記事タイトル/ナビ)へ戻る」インラインリンクのテキスト
 * 共通化はしない (Issue #707 推奨アプローチに準拠)。
 */
const BACK_TO_TOP_ARIA_LABEL = "ページトップへ戻る" as const;

/**
 * ボタン表示文言の上矢印アイコン。Unicode 記号 1 文字の trivial な単独参照だが、JSX 内の
 * 直接記述を避け表示文言を一箇所に集約する Issue #534 系列の方針に沿って定数化する。
 * 将来アイコン差し替え (例: lucide-react icon 化) する際の置換点を 1 箇所に局所化する目的も兼ねる。
 */
const BACK_TO_TOP_ICON_LABEL = "↑" as const;

// Editorial Citrus トークン (R-2b / Issue #389、Issue #421 で border/hover を改訂)
// - 浮き上がる固定ボタンのため bg.surface を背景に使用 (親 bg.canvas より一段濃く、視認性確保)
// - border 専用 token (border.subtle) で 1.4.11 (3:1) を確保
//   旧 bg.elevated 反転は light で bg.surface × bg.elevated = 1.06:1 となり視覚消失していた
//   - light: bg.surface (cream-100) × border.subtle (cream-300) = 3.29:1 PASS
//   - dark : bg.surface (sumi-700) × border.subtle (sumi-450) = 3.29:1 PASS
// - hover 背景は bg.elevated だと dark で bg.elevated × border.subtle = 2.25:1 (3:1 未達)
//   となるため bg.muted に変更し、light/dark とも 3:1 以上を維持:
//   - light: bg.muted (cream-75) × border.subtle = 3.39:1 PASS
//   - dark : bg.muted (sumi-650) × border.subtle = 4.94:1 PASS
//   視覚効果は「明るくフラッシュ」→「わずかに沈み込み」へ。translateY(-2px) と
//   boxShadow: card → card-hover は維持し、浮き上がり感は補強する。
// - 文字色は本文色 fg.primary。bg.surface / bg.muted 上で AAA を担保。
// R-5 (Issue #393) で transition は prefers-reduced-motion: reduce 時に無効化。
const buttonStyles = css({
  position: "fixed",
  bottom: "32px",
  right: "32px",
  width: "48px",
  height: "48px",
  borderRadius: "full",
  background: "bg.surface",
  color: "fg.primary",
  border: "1px solid",
  borderColor: "border.subtle",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "xl",
  boxShadow: "card",
  zIndex: 50,
  transition: "all 0.2s ease",
  _motionReduce: {
    transition: "none",
  },
  "&:hover": {
    background: "bg.muted",
    transform: "translateY(-2px)",
    boxShadow: "card-hover",
  },
});

const enterStyles = css({ transition: "all 0.2s ease" });
const enterFromStyles = css({ opacity: 0, transform: "translateY(10px)" });
const enterToStyles = css({ opacity: 1, transform: "translateY(0)" });
const leaveStyles = css({ transition: "all 0.15s ease" });
const leaveFromStyles = css({ opacity: 1, transform: "translateY(0)" });
const leaveToStyles = css({ opacity: 0, transform: "translateY(10px)" });

const handleClick = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const BackToTop = () => {
  const scrollY = useScrollPosition();
  const isVisible = scrollY > SHOW_THRESHOLD;

  return (
    <Transition
      show={isVisible}
      enter={enterStyles}
      enterFrom={enterFromStyles}
      enterTo={enterToStyles}
      leave={leaveStyles}
      leaveFrom={leaveFromStyles}
      leaveTo={leaveToStyles}
    >
      <button
        type="button"
        className={`${buttonStyles} ${focusRingStyles}`}
        onClick={handleClick}
        aria-label={BACK_TO_TOP_ARIA_LABEL}
        data-token-bg="bg.surface"
        data-token-border="border.subtle"
        data-token-hover-bg="bg.muted"
        data-focus-ring="default"
      >
        {BACK_TO_TOP_ICON_LABEL}
      </button>
    </Transition>
  );
};
