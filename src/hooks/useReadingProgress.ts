import { useEffect, useState } from "react";
import { useScrollPosition } from "./useScrollPosition";

/**
 * ページ全体のスクロール進捗率 (0..100) を返すフック。
 *
 * Safari の elastic scroll (overscroll bounce) では `window.scrollY` が
 * 一時的に負値を取りうるため、計算前に `Math.max(0, scrollY)` で下限を
 * クランプする。これにより:
 *
 * - progress の値ドメインが厳密に 0..100 に正規化される
 * - `Math.round((-1 / docHeight) * 100)` が `-0` を返す問題を回避
 * - 呼び出し側 (ReadingProgressBar) の `aria-valuenow` /
 *   `aria-valuetext` が `aria-valuemin=0` を満たし、axe-core の
 *   `aria-valid-attr-value` 違反を防止できる
 *
 * @returns 0..100 の整数値 (Math.round 済み)
 */
export const useReadingProgress = () => {
  const scrollY = useScrollPosition();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      // Safari overscroll 対策: scrollY を先に下限クランプして
      // progress の値ドメインを 0..100 に正規化する。
      const clampedScrollY = Math.max(0, scrollY);
      setProgress(
        Math.min(Math.round((clampedScrollY / docHeight) * 100), 100),
      );
    }
  }, [scrollY]);

  return progress;
};
