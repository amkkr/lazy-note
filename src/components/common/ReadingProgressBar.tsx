import { css } from "../../../styled-system/css";
import { useReadingProgress } from "../../hooks/useReadingProgress";

// Editorial Citrus トークン (R-2b / Issue #389)
// - 軌道背景: bg.elevated (控えめなトラック)
// - 進捗バー: accent.brand (Persimmon)。読み進捗は記事の主要 UI 操作 = CTA 系扱いとし、
//   ブランド一次色で視認性を担保 (light cream-50 上 5.74:1 / dark sumi-950 上 5.17:1 AA)。
const barContainerStyles = css({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: "3px",
  background: "bg.elevated",
  zIndex: 100,
});

const barStyles = css({
  height: "100%",
  background: "accent.brand",
  transition: "width 0.1s ease-out",
});

export const ReadingProgressBar = () => {
  const progress = useReadingProgress();

  return (
    <div
      className={barContainerStyles}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={barStyles} style={{ width: `${progress}%` }} />
    </div>
  );
};
