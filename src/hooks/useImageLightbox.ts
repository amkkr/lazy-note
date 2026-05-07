import { useCallback, useEffect, useState } from "react";

interface UseImageLightboxReturn {
  isOpen: boolean;
  imageSrc: string;
  open: (src: string) => void;
  close: () => void;
}

export const useImageLightbox = (
  containerRef: React.RefObject<HTMLElement | null>,
): UseImageLightboxReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState("");

  const open = useCallback((src: string) => {
    setImageSrc(src);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setImageSrc("");
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "IMG") {
        const src = (target as HTMLImageElement).src;
        if (src) {
          open(src);
        }
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [containerRef, open]);

  return { isOpen, imageSrc, open, close };
};
