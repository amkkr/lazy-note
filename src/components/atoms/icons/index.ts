/**
 * inline SVG アイコンコンポーネントの再エクスポート。
 *
 * R-4 (Issue #392) で `lucide-react` 依存を削除するために導入。
 * 各アイコンは Lucide v1.14.0 (ISC License) の SVG path を流用した独立コンポーネント。
 */

export { Calendar } from "./Calendar";
export { Clock } from "./Clock";
export { FileQuestion } from "./FileQuestion";
export { FileText } from "./FileText";
export { PenLine } from "./PenLine";
export type { IconComponent, IconProps } from "./types";
