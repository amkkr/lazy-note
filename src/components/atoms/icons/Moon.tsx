import type { IconProps } from "./types";

/**
 * Moon アイコン (inline SVG)。
 *
 * R-5 (Issue #393) で `ThemeToggle` の thumb 上に表示する。
 * SVG path は Lucide (https://lucide.dev、ISC License) の `moon` を流用。
 * Lucide はバージョン間で path を更新する場合があるが、本アイコンは
 * 視認性の都合で 24x24 viewBox の標準形を inline 化している。
 * @see https://lucide.dev/icons/moon
 */
export const Moon = ({
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
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
};
