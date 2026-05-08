import { Switch } from "@headlessui/react";
import { css } from "../../../styled-system/css";
import { useTheme } from "../../hooks/useTheme";

/**
 * テーマ切替トグル。
 *
 * a11y:
 * - role=switch + aria-checked は Headless UI の Switch が提供
 * - aria-label は現在の状態と次の操作を含めて動的に変更
 * - フォーカスリングは focus.ring (citrus-500) で可視化 (:focus-visible)
 * - キーボード操作 (Space) は Headless UI Switch が WAI-ARIA に従い対応
 * - タッチターゲットは 56x28px。WCAG 2.5.8 (AA: 24x24px) を満たす
 *   (2.5.5 AAA: 44x44px には届かないため、将来的に拡張余地あり)
 */
// Editorial Citrus トークン (R-2b / Issue #389)
// - スイッチ本体: 沈み込みトラック相当のため bg.elevated
// - ボーダー: bg.surface で軽く差別化
// - フォーカスリング: focus.ring (citrus-500)。R-2a で旧 focus 用 token を削除し
//   focus.ring に一本化したのに伴い、CSS 変数も var(--colors-focus-ring) に修正。
//   ※ R-5 で box-shadow inset/outset の二重リング共通化を予定。
// - サム (動く丸): fg.primary
const switchStyles = css({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  width: "56px",
  height: "28px",
  padding: "0",
  borderRadius: "full",
  border: "2px solid",
  borderColor: "bg.surface",
  cursor: "pointer",
  transition: "all 0.2s ease",
  background: "bg.elevated",
  outline: "none",
  // キーボードフォーカス時のみ citrus-500 リングを表示
  _focusVisible: {
    boxShadow: "0 0 0 2px var(--colors-focus-ring)",
  },
});

const thumbStyles = css({
  display: "inline-block",
  width: "20px",
  height: "20px",
  borderRadius: "full",
  background: "fg.primary",
  transition: "transform 0.2s ease",
});

const thumbTranslateOff = css({ transform: "translateX(2px)" });
const thumbTranslateOn = css({ transform: "translateX(28px)" });

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const ariaLabel = isLight
    ? "テーマ切替: 現在ライト。クリックでダークに切り替えます"
    : "テーマ切替: 現在ダーク。クリックでライトに切り替えます";

  return (
    <Switch
      checked={isLight}
      onChange={toggleTheme}
      className={switchStyles}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span
        aria-hidden="true"
        className={`${thumbStyles} ${isLight ? thumbTranslateOn : thumbTranslateOff}`}
      />
    </Switch>
  );
};
