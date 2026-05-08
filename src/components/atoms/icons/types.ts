import type { ComponentType } from "react";

/**
 * inline SVG アイコンコンポーネントの共通 props 型。
 *
 * R-4 (Issue #392) で `lucide-react` 依存を削除するために導入。
 * Lucide の API 形に近づけて、`size` / `strokeWidth` / `aria-hidden` を受ける。
 * 装飾アイコンとして利用する場合は呼び出し側で `aria-hidden="true"` を付ける。
 */
export interface IconProps {
  /**
   * アイコンの一辺のサイズ (px)。デフォルト 24px。
   */
  size?: number;
  /**
   * 線の太さ。Calm 思想 (R-4) に合わせて細めの 1.5 をデフォルトにする。
   */
  strokeWidth?: number;
  /**
   * SR (スクリーンリーダー) からアイコンを隠すかどうか。
   * 装飾扱いの場合は呼び出し側で `aria-hidden="true"` を付ける。
   */
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * inline SVG アイコンコンポーネントの型。
 *
 * R-4 (Issue #392) で旧 `LucideIcon` 型の置き換えとして導入。
 * `EmptyState` などアイコンを prop として受け取るコンポーネントが利用する。
 */
export type IconComponent = ComponentType<IconProps>;
