import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathnameの変更をトリガーとしてスクロール位置をリセットする
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};
