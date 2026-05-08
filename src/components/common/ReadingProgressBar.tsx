import { css } from "../../../styled-system/css";
import { useReadingProgress } from "../../hooks/useReadingProgress";

// Editorial Citrus トークン (R-2b / Issue #389)
// - 軌道背景: bg.elevated (控えめなトラック)
// - 進捗バー: accent.link (Indigo)。RFC 02 §"Persimmon の使用範囲" は
//   「ホーム Featured タイル / CTA ボタン (主要動作 1 個まで) / OG 画像」に限定するため、
//   読書進捗バーは accent.brand (Persimmon) ではなく accent.link を採用する。
//   読書進捗は「記事への没入を促すリンク誘導 / 二次的な視覚要素」と解釈。
//   light cream-50 上で 7.82:1 AAA / dark sumi-950 上で 8.79:1 AAA を確保。
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
  background: "accent.link",
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
