import type { IconProps } from "./types";

/**
 * PenLine アイコン (inline SVG)。
 *
 * R-4 (Issue #392) で `lucide-react` 依存を削除するために自前実装。
 * SVG path は Lucide (https://lucide.dev、ISC License) の `pen-line` を流用。
 * Lucide はバージョン間で path を更新する場合があるが、本アイコンは
 * 視認性の都合で 24x24 viewBox の標準形を inline 化している。
 * @see https://lucide.dev/icons/pen-line
 */
export const PenLine = ({
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
      <path d="M13 21h8" />
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
    </svg>
  );
};
