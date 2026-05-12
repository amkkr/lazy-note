import { useEffect } from "react";

/**
 * コードブロックのコピーボタンにイベントデリゲーションでクリックリスナーを設定するフック。
 *
 * クリック時、対象 button の `data-code` 属性値を `navigator.clipboard.writeText` に
 * 渡してクリップボードへコピーする。`writeText` はコード実行 sink ではなく単なる
 * 文字列書き込みのため、`data-code` 内に `javascript:` URI や `<script>` 文字列が
 * 含まれていてもコード実行リスクは生じない (XSS 観点では低リスク)。
 *
 * 加えて、`src/lib/sanitize.ts` の `sanitizePostHtml` 経由で DOMPurify が
 * `data-code` 値内の危険なパターンを検知すると属性ごと除去するため、本フックには
 * 危険な文字列が到達しにくい構造になっている。
 *
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
        await navigator.clipboard.writeText(code);
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
