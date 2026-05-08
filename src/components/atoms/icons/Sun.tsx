import type { IconProps } from "./types";

/**
 * Sun アイコン (inline SVG)。
 *
 * R-5 (Issue #393) で `ThemeToggle` の thumb 上に表示する。
 * SVG path は Lucide (https://lucide.dev、ISC License) の `sun` を流用。
 * Lucide はバージョン間で path を更新する場合があるが、本アイコンは
 * 視認性の都合で 24x24 viewBox の標準形を inline 化している。
 * @see https://lucide.dev/icons/sun
 */
export const Sun = ({
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
};
