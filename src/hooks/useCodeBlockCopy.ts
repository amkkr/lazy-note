import { useEffect } from "react";

/**
 * コードブロックのコピーボタンにイベントデリゲーションでクリックリスナーを設定するフック
 * @param containerRef コンテンツを包含する要素のref
 */
export const useCodeBlockCopy = (
  containerRef: React.RefObject<HTMLElement | null>,
): void => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains("copy-btn")) {
        return;
      }

      const code = target.getAttribute("data-code");
      if (!code) {
        return;
      }

      try {
        // data-codeのHTMLエンティティをデコード
        const decodedCode = code
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&");
        await navigator.clipboard.writeText(decodedCode);
        const originalText = target.textContent;
        target.textContent = "コピー済み!";
        setTimeout(() => {
          target.textContent = originalText;
        }, 2000);
      } catch {
        target.textContent = "コピー失敗";
        setTimeout(() => {
          target.textContent = "コピー";
        }, 2000);
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [containerRef]);
};
