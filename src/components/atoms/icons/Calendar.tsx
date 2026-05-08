import type { IconProps } from "./types";

/**
 * Calendar アイコン (inline SVG)。
 *
 * R-4 (Issue #392) で `lucide-react` 依存を削除するために自前実装。
 * SVG path は Lucide (https://lucide.dev、ISC License) の `calendar` を流用。
 * Lucide はバージョン間で path を更新する場合があるが、本アイコンは
 * 視認性の都合で 24x24 viewBox の標準形を inline 化している。
 * @see https://lucide.dev/icons/calendar
 */
export const Calendar = ({
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
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
};
