import type { IconProps } from "./types";

/**
 * FileText アイコン (inline SVG)。
 *
 * R-4 (Issue #392) で `lucide-react` 依存を削除するために自前実装。
 * SVG path は Lucide (https://lucide.dev、ISC License) の `file-text` を流用。
 * Lucide はバージョン間で path を更新する場合があるが、本アイコンは
 * 視認性の都合で 24x24 viewBox の標準形を inline 化している。
 * @see https://lucide.dev/icons/file-text
 */
export const FileText = ({
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
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  );
};
