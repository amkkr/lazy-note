import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import React, { useCallback, useState } from "react";
import { css } from "../../../styled-system/css";

interface ImageLightboxProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
}

const backdropStyle = css({
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.8)",
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
  top: "-xl",
  right: "-xl",
  background: "bg.2",
  color: "fg.0",
  border: "1px solid",
  borderColor: "bg.3",
  borderRadius: "50%",
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
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
});

const ImageLightboxInner = ({
  isOpen,
  imageSrc,
  onClose,
}: ImageLightboxProps) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleImageLoad = useCallback(() => {
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
            alt=""
            className={imageStyle}
            style={{ display: isLoading ? "none" : "block" }}
            onLoad={handleImageLoad}
          />
          <button
            type="button"
            className={closeButtonStyle}
            onClick={onClose}
            aria-label="閉じる"
          >
            x
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export const ImageLightbox = React.memo(ImageLightboxInner);
ImageLightbox.displayName = "ImageLightbox";
