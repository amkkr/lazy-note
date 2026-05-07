import { css } from "../../styled-system/css";

/** ページ表示時のフェードイン: enter */
export const fadeInEnter = css({ transition: "all 0.3s ease" });

/** ページ表示時のフェードイン: enterFrom（初期状態） */
export const fadeInEnterFrom = css({
  opacity: 0,
  transform: "translateY(8px)",
});

/** ページ表示時のフェードイン: enterTo（最終状態） */
export const fadeInEnterTo = css({ opacity: 1, transform: "translateY(0)" });
