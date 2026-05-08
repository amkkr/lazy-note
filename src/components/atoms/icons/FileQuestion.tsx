import type { IconProps } from "./types";

/**
 * FileQuestion アイコン (inline SVG)。
 *
 * R-4 (Issue #392) で `lucide-react` 依存を削除するために自前実装。
 * SVG path は Lucide v1.14.0 (ISC License) の `file-question-mark`
 * (旧 `file-question` のエイリアス先) から流用。
 * @see https://github.com/lucide-icons/lucide
 */
export const FileQuestion = ({
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
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      <path d="M12 17h.01" />
      <path d="M9.1 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
    </svg>
  );
};
