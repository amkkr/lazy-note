import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import React, { useCallback, useEffect, useState } from "react";
import { css } from "../../../styled-system/css";

interface ImageLightboxProps {
  isOpen: boolean;
  imageSrc: string;
  imageAlt: string;
  onClose: () => void;
}

const backdropStyle = css({
  position: "fixed",
  inset: 0,
  background: "overlay",
});

const containerStyle = css({
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "md",
});

const panelStyle = css({
  position: "relative",
  maxWidth: "90vw",
  maxHeight: "90vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

const imageStyle = css({
  maxWidth: "100%",
  maxHeight: "90vh",
  objectFit: "contain",
  borderRadius: "md",
});

const closeButtonStyle = css({
  position: "absolute",
  top: "sm",
  right: "sm",
  background: "bg.2",
  color: "fg.0",
  border: "1px solid",
  borderColor: "bg.3",
  borderRadius: "full",
  width: "xl",
  height: "xl",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "base",
  lineHeight: 1,
  _hover: {
    background: "bg.3",
  },
});

const spinnerContainerStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "xl",
});

const spinnerStyle = css({
  width: "xl",
  height: "xl",
  border: "4px solid",
  borderColor: "bg.3",
  borderTopColor: "blue.light",
  borderRadius: "full",
  animation: "spin 1s linear infinite",
});

const ImageLightboxInner = ({
  isOpen,
  imageSrc,
  imageAlt,
  onClose,
}: ImageLightboxProps) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (imageSrc) {
      setIsLoading(true);
    }
  }, [imageSrc]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogBackdrop className={backdropStyle} />
      <div className={containerStyle}>
        <DialogPanel className={panelStyle}>
          {isLoading && (
            <div className={spinnerContainerStyle}>
              <div className={spinnerStyle} />
            </div>
          )}
          <img
            src={imageSrc}
            alt={imageAlt}
            className={imageStyle}
            style={{ display: isLoading ? "none" : "block" }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          <button
            type="button"
            className={closeButtonStyle}
            onClick={onClose}
            aria-label="閉じる"
          >
            ×
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export const ImageLightbox = React.memo(ImageLightboxInner);
ImageLightbox.displayName = "ImageLightbox";
