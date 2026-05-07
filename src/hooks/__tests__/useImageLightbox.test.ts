import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useImageLightbox } from "../useImageLightbox";

describe("useImageLightbox", () => {
  let container: HTMLDivElement;
  let containerRef: React.RefObject<HTMLDivElement | null>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    containerRef = { current: container };
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it("初期状態ではisOpenがfalseになる", () => {
    const { result } = renderHook(() => useImageLightbox(containerRef));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.imageSrc).toBe("");
    expect(result.current.imageAlt).toBe("");
  });

  it("imgクリック時にisOpenがtrueになる", () => {
    const { result } = renderHook(() => useImageLightbox(containerRef));

    const img = document.createElement("img");
    img.src = "https://example.com/photo.jpg";
    img.alt = "テスト画像";
    container.appendChild(img);

    act(() => {
      img.click();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("imgクリック時にimageSrcとimageAltが設定される", () => {
    const { result } = renderHook(() => useImageLightbox(containerRef));

    const img = document.createElement("img");
    img.src = "https://example.com/photo.jpg";
    img.alt = "テスト画像";
    container.appendChild(img);

    act(() => {
      img.click();
    });

    expect(result.current.imageSrc).toBe("https://example.com/photo.jpg");
    expect(result.current.imageAlt).toBe("テスト画像");
  });

  it("alt属性がないimgクリック時にimageAltが空文字になる", () => {
    const { result } = renderHook(() => useImageLightbox(containerRef));

    const img = document.createElement("img");
    img.src = "https://example.com/photo.jpg";
    container.appendChild(img);

    act(() => {
      img.click();
    });

    expect(result.current.imageSrc).toBe("https://example.com/photo.jpg");
    expect(result.current.imageAlt).toBe("");
  });

  it("close呼び出し時にisOpen・imageSrc・imageAltがリセットされる", () => {
    const { result } = renderHook(() => useImageLightbox(containerRef));

    const img = document.createElement("img");
    img.src = "https://example.com/photo.jpg";
    img.alt = "テスト画像";
    container.appendChild(img);

    act(() => {
      img.click();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.imageSrc).toBe("");
    expect(result.current.imageAlt).toBe("");
  });

  it("img以外の要素クリックでは反応しない", () => {
    const { result } = renderHook(() => useImageLightbox(containerRef));

    const paragraph = document.createElement("p");
    paragraph.textContent = "テキスト";
    container.appendChild(paragraph);

    act(() => {
      paragraph.click();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.imageSrc).toBe("");
    expect(result.current.imageAlt).toBe("");
  });

  it("containerRefがnullの場合にエラーにならない", () => {
    const nullRef: React.RefObject<HTMLElement | null> = { current: null };

    const { result } = renderHook(() => useImageLightbox(nullRef));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.imageSrc).toBe("");
    expect(result.current.imageAlt).toBe("");
  });
});
