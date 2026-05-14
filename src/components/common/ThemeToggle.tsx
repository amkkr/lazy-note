import { Switch } from "@headlessui/react";
import { css } from "../../../styled-system/css";
import { useTheme } from "../../hooks/useTheme";
import { Moon } from "../atoms/icons/Moon";
import { Sun } from "../atoms/icons/Sun";
import { focusRingStyles } from "../../styles/focusRing";

/**
 * テーマ切替トグル。
 *
 * R-5 (Issue #393) で視覚改善:
 * - thumb に Sun/Moon アイコン (inline SVG) を表示し、状態を一目で判別可能にする
 * - タッチターゲットを 56x44px (WCAG 2.5.5 AAA: 44x44px) に拡張
 *   外枠 Switch を 44px 高にしつつ、視覚 track は内部の 28px span で従来見た目を維持
 * - focus ring は src/styles/focusRing.ts の二重リングを `outline-offset` 相当
 *   (box-shadow 2px ギャップ) で描画し、track 形状を破壊しない (R-5 共通仕様)
 *
 * a11y:
 * - role=switch + aria-checked は Headless UI の Switch が提供
 * - aria-label は現在の状態と次の操作を含めて動的に変更
 * - キーボード操作 (Space) は Headless UI Switch が WAI-ARIA に従い対応
 *
 * Editorial Citrus トークン (R-2b / Issue #389、Issue #421 で border を改訂):
 * - Switch (タッチ枠): 透明 (タッチターゲット拡張用、視覚は内部 track で表現)
 * - track 視覚: bg.surface 背景 + border.subtle ボーダー (2px solid)
 *   旧 bg.elevated 反転は light で bg.surface × bg.elevated = 1.06:1 となり視覚消失
 *   - light: bg.surface (cream-100) × border.subtle (cream-300) = 3.29:1 PASS
 *   - dark : bg.surface (sumi-700) × border.subtle (sumi-450) = 3.29:1 PASS
 *   ThemeToggle はクリックで即状態遷移するため hover 状態は存在せず、border の
 *   単純置換のみ。(他 3 コンポーネントの「hover bg を bg.muted」適用は不要)
 * - thumb (動く丸): light=ink.900 / dark=cream.50 で track と AA 以上のコントラスト確保
 *   light: ink-900 (oklch 0.150) × cream-100 (oklch 0.965) で >= 16:1 (AAA)
 *   dark : cream-50 (oklch 0.985) × sumi-700 (oklch 0.380) で >= 8:1 (AAA)
 * - thumb 内アイコン: thumb 背景 (ink-900 / cream-50) と反転色で描画。
 *   - light: thumb=ink.900 → icon stroke=cream.50 (Sun アイコン)
 *   - dark : thumb=cream.50 → icon stroke=ink.900 (Moon アイコン)
 */

// 外枠 Switch: タッチ領域 56x44px。視覚 track は内部 span に切り出し、
// padding で実 track を上下中央に置く (44 - 32 = 12px → 上下 6px ずつ)。
const switchOuterStyles = css({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  width: "56px",
  height: "44px",
  padding: "6px 0",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  outline: "none",
});

// 視覚 track: 56x32px (R-5 修正で thumb 24x24 + 上下 2px 余白に拡張)。
// Issue #421: borderColor を bg.elevated → border.subtle に置換。
// (bg.elevated 反転は light で 1.06:1 で視覚消失していた)
const trackStyles = css({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  width: "56px",
  height: "32px",
  borderRadius: "full",
  border: "2px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  transition: "background 0.2s ease",
  _motionReduce: {
    transition: "none",
  },
});

// thumb: 24x24px (旧 20x20 より一回り拡大、icon 16px の視認性を確保)。
// thumb 自体は icon を内包するため flex 中央寄せにする。
const thumbStyles = css({
  position: "absolute",
  top: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  borderRadius: "full",
  background: { _light: "ink.900", _dark: "cream.50" },
  // thumb 内アイコンの色 (currentColor 経由で SVG stroke にも適用される)
  color: { _light: "cream.50", _dark: "ink.900" },
  transition: "transform 0.2s ease",
  _motionReduce: {
    transition: "none",
  },
});

// translate 量は track (内側 width 52px = 56 - border 2px*2) と thumb (24px) から算出:
//   off (dark): 左端余白 2px → translate(2px, -50%)
//   on  (light): 右端余白 2px に寄せる → 52 - 24 - 2 = 26px → translate(26px, -50%)
const thumbTranslateOff = css({ transform: "translate(2px, -50%)" });
const thumbTranslateOn = css({ transform: "translate(26px, -50%)" });

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
      className={`${switchOuterStyles} ${focusRingStyles}`}
      aria-label={ariaLabel}
      title={ariaLabel}
      data-touch-target="56x44"
      data-focus-ring="default"
    >
      <span
        aria-hidden="true"
        className={trackStyles}
        data-token-border="border.subtle"
        data-token-bg="bg.surface"
      >
        <span
          className={`${thumbStyles} ${isLight ? thumbTranslateOn : thumbTranslateOff}`}
        >
          {isLight ? (
            <Sun size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Moon size={16} strokeWidth={2} aria-hidden="true" />
          )}
        </span>
      </span>
    </Switch>
  );
};
