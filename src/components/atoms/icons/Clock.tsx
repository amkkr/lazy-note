import type { IconProps } from "./types";

/**
 * Clock アイコン (inline SVG)。
 *
 * R-4 (Issue #392) で `lucide-react` 依存を削除するために自前実装。
 * SVG path は Lucide v1.14.0 (ISC License) の `clock` から流用。
 * @see https://github.com/lucide-icons/lucide
 */
export const Clock = ({
  size = 24,
  strokeWidth = 1.5,
  "aria-hidden": ariaHidden,
}: IconProps) => {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: 装飾用途のアイコン。呼び出し側で aria-hidden="true" を付与する。
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
};
