import { css } from "../../styled-system/css";

/**
 * R-5 (Issue #393) で追加した visible focus ring 共通スタイル。
 *
 * 目的:
 * - 全インタラクティブ要素 (button / a / input / [role=switch] など) で
 *   キーボード操作時に WCAG 2.4.7 (Focus Visible) を満たす 2px 以上の
 *   可視リングを統一的に提供する。
 * - light テーマでは `focus.ring` (citrus-500) 単独だと cream-50 上で
 *   1.45:1 と AA 不足となるため、内側に focus.ring (citrus) + 外側に
 *   ink-900 (light) / cream-50 (dark) を敷いた **二重リング** で
 *   13.03:1 (AAA) を確保する (panda.config.ts L362-367 / focus.ring
 *   JSDoc 「内側に focus.ring (citrus-500) + 外側に ink-900 を伴う
 *   二重リング」運用ルール参照)。
 * - track 形状 (角丸・サイズ) を破壊しないよう、`outline` ではなく
 *   `box-shadow` を使い、外側オフセット 2px / 4px で描画する。
 *
 * 運用ルール:
 * - 通常用途は `focusRingStyles` (二重リング) を `&:focus-visible`
 *   で適用すること。:focus 全体に適用するとマウスクリック時にも
 *   リングが出てしまい Editorial Citrus の Calm 思想 (装飾ノイズ
 *   削除) に反するため、必ず :focus-visible のみとする。
 * - prefers-reduced-motion: reduce 時はリング自体は維持し
 *   transition のみ無効化する (リングの可視化は a11y 必須要件)。
 *
 * 二重リングのレイヤ構成 (要素から外側に向かって):
 *   1. 要素本体
 *   2. 内側 2px ring (focus.ring 色 / citrus-500):
 *        要素背景との隣接面で AAA を確保する citrus リング
 *        (citrus-500 × bg.canvas dark = 12.43:1 AAA 想定)
 *   3. 外側 4px ring:
 *        light = ink-900: 周囲背景 cream-50 に対し 19:1 級で輪郭を確保
 *        dark  = cream-50: 周囲背景 sumi-950 に対し 16.98:1 で輪郭を確保
 *
 * box-shadow の積み順について:
 *   `box-shadow: 0 0 0 2px X, 0 0 0 4px Y` の場合、X が要素隣接 (内側 2px)、
 *   Y が外側 4px となる。よって内側に X=focus.ring、外側に Y=ink-900/cream-50
 *   を指定することで、上記 2-3 のレイヤ構成を実現する。
 */
export const focusRingStyles = css({
  outline: "none",
  _focusVisible: {
    outline: "none",
    boxShadow: {
      _light:
        "0 0 0 2px var(--colors-focus-ring), 0 0 0 4px var(--colors-ink-900)",
      _dark:
        "0 0 0 2px var(--colors-focus-ring), 0 0 0 4px var(--colors-cream-50)",
    },
  },
});

/**
 * accent.brand (persimmon) など濃色背景上の要素向け二重リング。
 *
 * 例: 主要 CTA ボタン (variant=primary)。背景がブランド色のため、
 * `focusRingStyles` と同じく「内側 citrus-500 + 外側 ink-900」を敷くと、
 * 内側 citrus が要素隣接面 (persimmon) と同系色になり境界が曖昧になる。
 * そのため accent 上では積み順を反転し、内側に ink-900 / cream-50 を置いて
 * accent 色との見切りを確保する。
 *
 * 二重リングのレイヤ構成 (要素から外側に向かって):
 *   1. 要素本体 (accent.brand = persimmon)
 *   2. 内側 2px ring:
 *        light = ink-900: persimmon との見切りを濃淡で確保
 *        dark  = cream-50: persimmon との見切りを濃淡反転で確保
 *   3. 外側 4px ring (focus.ring = citrus-500):
 *        周囲背景 (bg.canvas) との見切り。light の cream-50 上では 1.45:1
 *        (AA 不足) となるが、内側 ink-900 のリングが既に視認性を担保しており、
 *        外側 citrus は「focus 状態である」ことの色シグナルとして機能する。
 *
 * box-shadow の積み順:
 *   `box-shadow: 0 0 0 2px X, 0 0 0 4px Y` で X=ink-900/cream-50 (内側 2px)、
 *   Y=focus.ring (外側 4px) を指定している。
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
