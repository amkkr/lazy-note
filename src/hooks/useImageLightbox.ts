import { useCallback, useEffect, useState } from "react";

interface UseImageLightboxReturn {
  isOpen: boolean;
  imageSrc: string;
  imageAlt: string;
  open: (src: string, alt: string) => void;
  close: () => void;
}

export const useImageLightbox = (
  containerRef: React.RefObject<HTMLElement | null>,
): UseImageLightboxReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const [imageAlt, setImageAlt] = useState("");

  const open = useCallback((src: string, alt: string) => {
    setImageSrc(src);
    setImageAlt(alt);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setImageSrc("");
    setImageAlt("");
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "IMG") {
        const imgElement = target as HTMLImageElement;
        if (imgElement.src) {
          open(imgElement.src, imgElement.alt || "");
        }
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [containerRef, open]);

  return { isOpen, imageSrc, imageAlt, open, close };
};
