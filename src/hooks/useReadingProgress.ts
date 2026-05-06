import { useEffect, useState } from "react";
import { useScrollPosition } from "./useScrollPosition";

export const useReadingProgress = () => {
  const scrollY = useScrollPosition();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
      setProgress(Math.min(Math.round((scrollY / docHeight) * 100), 100));
    }
  }, [scrollY]);

  return progress;
};
