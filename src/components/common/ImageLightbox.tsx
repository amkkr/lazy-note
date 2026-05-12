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

// Editorial Citrus トークン (R-2b / Issue #389、Issue #421 で border/hover を改訂)
// - 暗い backdrop 上の浮き上がる閉じるボタン: bg.surface を背景に
// - border 専用 token (border.subtle) で 1.4.11 (3:1) を確保
//   旧 bg.elevated 反転は light で bg.surface × bg.elevated = 1.06:1 となり視覚消失していた
//   - light: bg.surface (cream-100) × border.subtle (cream-300) = 3.29:1 PASS
//   - dark : bg.surface (sumi-700) × border.subtle (sumi-450) = 3.29:1 PASS
// - hover 背景は bg.elevated だと dark で bg.elevated × border.subtle = 2.25:1 (3:1 未達)
//   となるため bg.muted に変更し、light/dark とも 3:1 以上を維持:
//   - light: bg.muted (cream-75) × border.subtle = 3.39:1 PASS
//   - dark : bg.muted (sumi-650) × border.subtle = 4.94:1 PASS
//   視覚効果は「明るくフラッシュ」→「わずかに沈み込み」へ。
// 注意: light の backdrop は overlay 暗色のため、light でも事実上暗背景上に
// 閉じるボタンが浮かぶ。border.subtle (cream-300) が overlay 上で視認可能か
// は手動確認推奨だが、ボタン本体 bg.surface との 3.29:1 で枠線が縁取れる。
const closeButtonStyle = css({
  position: "absolute",
  top: "sm",
  right: "sm",
  background: "bg.surface",
  color: "fg.primary",
  border: "1px solid",
  borderColor: "border.subtle",
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
    background: "bg.muted",
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
            data-token-bg="bg.surface"
            data-token-border="border.subtle"
            data-token-hover-bg="bg.muted"
            data-focus-ring="default"
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
