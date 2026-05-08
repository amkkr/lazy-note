import { css } from "../../styled-system/css";

/**
 * R-5 (Issue #393) で追加した visible focus ring 共通スタイル。
 *
 * 目的:
 * - 全インタラクティブ要素 (button / a / input / [role=switch] など) で
 *   キーボード操作時に WCAG 2.4.7 (Focus Visible) を満たす 2px 以上の
 *   可視リングを統一的に提供する。
 * - light テーマでは `focus.ring` (citrus-500) 単独だと cream-50 上で
 *   1.45:1 と AA 不足となるため、内側に ink-900 の細リングを敷いた
 *   **二重リング** で 13.03:1 (AAA) を確保する (panda.config.ts の
 *   focus.ring JSDoc 参照)。
 * - track 形状 (角丸・サイズ) を破壊しないよう、`outline` ではなく
 *   `box-shadow` を使い、外側オフセット 2px で描画する。
 *
 * 運用ルール:
 * - 通常用途は `focusRingStyles` (二重リング) を `&:focus-visible`
 *   で適用すること。:focus 全体に適用するとマウスクリック時にも
 *   リングが出てしまい Editorial Citrus の Calm 思想 (装飾ノイズ
 *   削除) に反するため、必ず :focus-visible のみとする。
 * - `outline-offset` 相当は `box-shadow` の第 1 段で表現する。
 * - prefers-reduced-motion: reduce 時はリング自体は維持し
 *   transition のみ無効化する (リングの可視化は a11y 必須要件)。
 *
 * 二重リングのレイヤ構成 (外側から順):
 *   1. 4px ring (focus.ring 色 / citrus-500): 視認用の太い外側リング
 *   2. 2px ring (ink-900 / sumi-950): light テーマでも contrast を確保する内側細リング
 *   3. (要素本体)
 */
export const focusRingStyles = css({
  outline: "none",
  _focusVisible: {
    outline: "none",
    boxShadow:
      "0 0 0 2px var(--colors-bg-canvas), 0 0 0 4px var(--colors-focus-ring)",
  },
});

/**
 * accent.brand (persimmon) など濃色背景上の要素向け二重リング。
 *
 * 例: 主要 CTA ボタン (variant=primary)。背景がブランド色のため、
 * 内側に bg.canvas (cream-50 / sumi-950) の細リングを置くと逆に視認性が
 * 落ちる。代わりに ink-900 / cream-50 の濃淡反転リングを敷くことで
 * 二重リング外側 (citrus) との見切り線を確保する。
 *
 * - light: 内側 ink-900 (cream-50 上 13.03:1 AAA) → 外側 citrus-500 (見切り 4.45:1)
 * - dark : 内側 cream-50 (sumi-950 上 16.98:1 AAA) → 外側 citrus-500
 *
 * 値は light: ink.900 (oklch(0.150 0.020 85))、dark: cream.50 を使用。
 * panda の var() を使うため CSS 変数名は `--colors-ink-900` と
 * `--colors-cream-50` が styled-system で生成されていることが前提。
 */
export const focusRingOnAccentStyles = css({
  outline: "none",
  _focusVisible: {
    outline: "none",
    boxShadow: {
      _light:
        "0 0 0 2px var(--colors-ink-900), 0 0 0 4px var(--colors-focus-ring)",
      _dark:
        "0 0 0 2px var(--colors-cream-50), 0 0 0 4px var(--colors-focus-ring)",
    },
  },
});
