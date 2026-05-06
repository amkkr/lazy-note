import { css } from "../../../styled-system/css";
import { useReadingProgress } from "../../hooks/useReadingProgress";

const barContainerStyles = css({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: "3px",
  background: "bg.2",
  zIndex: 100,
});

const barStyles = css({
  height: "100%",
  background: "accent.blue",
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
