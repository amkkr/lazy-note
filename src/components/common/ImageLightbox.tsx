import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import React, { useCallback, useEffect, useState } from "react";
import { css } from "../../../styled-system/css";
import { focusRingStyles } from "../../styles/focusRing";

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

// Editorial Citrus トークンに置換 (R-2b / Issue #389、R-2b 修正で border 色を修正)
// - 暗い backdrop 上の浮き上がる閉じるボタン: bg.surface を背景に
//   (bg.elevated と bg.surface の同色 border 問題を回避し、視認性も向上)
// - border は bg.elevated でハイライト風の枠線
// - hover で bg.elevated に反転
const closeButtonStyle = css({
  position: "absolute",
  top: "sm",
  right: "sm",
  background: "bg.surface",
  color: "fg.primary",
  border: "1px solid",
  borderColor: "bg.elevated",
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
    background: "bg.elevated",
  },
});

const spinnerContainerStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "xl",
});

// スピナーの軌道色とリング色を Editorial Citrus トークンに置換 (R-2b)
// - 環色: bg.surface
// - 進捗ハイライト: accent.link (リンク誘導と同色、汎用 UI ハイライト)
const spinnerStyle = css({
  width: "xl",
  height: "xl",
  border: "4px solid",
  borderColor: "bg.surface",
  borderTopColor: "accent.link",
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
            className={`${closeButtonStyle} ${focusRingStyles}`}
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
