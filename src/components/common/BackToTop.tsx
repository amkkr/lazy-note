import { Transition } from "@headlessui/react";
import { css } from "../../../styled-system/css";
import { useScrollPosition } from "../../hooks/useScrollPosition";

const SHOW_THRESHOLD = 300;

// Editorial Citrus トークン (R-2b / Issue #389)
// - 浮き上がる固定ボタンのため bg.surface を背景に使用 (親 bg.canvas より一段濃く、視認性確保)
// - border は bg.elevated でハイライト風の枠線にする (bg.surface 同色だと 1.06:1 で消失するため)
// - hover 時に bg.elevated に反転させて押下感を演出
// - 文字色は本文色 fg.primary。bg.surface 上で AAA を担保。
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
  borderColor: "bg.elevated",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "xl",
  boxShadow: "card",
  zIndex: 50,
  transition: "all 0.2s ease",
  "&:hover": {
    background: "bg.elevated",
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
        className={buttonStyles}
        onClick={handleClick}
        aria-label="ページトップへ戻る"
      >
        ↑
      </button>
    </Transition>
  );
};
