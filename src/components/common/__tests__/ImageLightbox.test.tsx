import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ImageLightbox } from "../ImageLightbox";

describe("ImageLightbox", () => {
  it("isOpen=trueの時にダイアログが表示される", () => {
    render(
      <ImageLightbox
        isOpen={true}
        imageSrc="https://example.com/photo.jpg"
        imageAlt="テスト画像"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("isOpen=falseの時にダイアログが非表示になる", () => {
    render(
      <ImageLightbox
        isOpen={false}
        imageSrc="https://example.com/photo.jpg"
        imageAlt="テスト画像"
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("画像がsrc URLで表示される", () => {
    const { container } = render(
      <ImageLightbox
        isOpen={true}
        imageSrc="https://example.com/photo.jpg"
        imageAlt="テスト画像"
        onClose={vi.fn()}
      />,
    );

    const img = container.ownerDocument.querySelector(
      "img[src='https://example.com/photo.jpg']",
    );
    expect(img).toBeInTheDocument();
  });

  it("画像にalt属性が設定される", () => {
    render(
      <ImageLightbox
        isOpen={true}
        imageSrc="https://example.com/photo.jpg"
        imageAlt="テスト画像"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByAltText("テスト画像")).toBeInTheDocument();
  });

  it("閉じるボタンクリックでonCloseが呼ばれる", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ImageLightbox
        isOpen={true}
        imageSrc="https://example.com/photo.jpg"
        imageAlt="テスト画像"
        onClose={handleClose}
      />,
    );

    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("画像読み込みエラー時にスピナーが非表示になる", () => {
    const { container } = render(
      <ImageLightbox
        isOpen={true}
        imageSrc="https://example.com/broken.jpg"
        imageAlt="壊れた画像"
        onClose={vi.fn()}
      />,
    );

    const img = container.ownerDocument.querySelector(
      "img[src='https://example.com/broken.jpg']",
    ) as HTMLImageElement;

    fireEvent.error(img);

    expect(img.style.display).toBe("block");
  });

  it("閉じるボタンに×が表示される", () => {
    render(
      <ImageLightbox
        isOpen={true}
        imageSrc="https://example.com/photo.jpg"
        imageAlt=""
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "閉じる" })).toHaveTextContent(
      "×",
    );
  });
});
