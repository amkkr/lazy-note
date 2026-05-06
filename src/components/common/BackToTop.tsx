import { Transition } from "@headlessui/react";
import { css } from "../../../styled-system/css";
import { useScrollPosition } from "../../hooks/useScrollPosition";

const SHOW_THRESHOLD = 300;

const buttonStyles = css({
  position: "fixed",
  bottom: "32px",
  right: "32px",
  width: "48px",
  height: "48px",
  borderRadius: "full",
  background: "bg.2",
  color: "fg.1",
  border: "1px solid",
  borderColor: "bg.3",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "xl",
  boxShadow: "card",
  zIndex: 50,
  transition: "all 0.2s ease",
  "&:hover": {
    background: "bg.3",
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
