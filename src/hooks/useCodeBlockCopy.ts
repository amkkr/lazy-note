import { useEffect } from "react";

/**
 * Biome 厳格化耐性メモ (Issue #652 / PR #623 follow-up)
 *
 * 本ファイルは `maxAllowedComplexity:8` 厳格化条件下でも違反 0 になるよう、
 * `handleClick` 内のコピー成否分岐を `copyAndAnimate` ヘルパーへ抽出している。
 * 再現手順:
 *   1. `biome.jsonc` の `noExcessiveCognitiveComplexity` の `maxAllowedComplexity`
 *      を 8 に下げる
 *   2. `pnpm exec biome lint src/hooks/useCodeBlockCopy.ts` で違反 0 を確認
 *   3. `pnpm test:run` で既存テスト全 pass を確認
 *
 * 公開 API シグネチャ (`useCodeBlockCopy` の引数・戻り値) は不変。
 */

/**
 * コピー成功時の表示文言と復元までのディレイ (ms)。
 */
const COPY_SUCCESS_LABEL = "コピー済み!";
const COPY_FAILURE_LABEL = "コピー失敗";
const COPY_DEFAULT_LABEL = "コピー";
const RESTORE_DELAY_MS = 2000;

/**
 * 指定 button 要素のテキストを一時的に label に切り替え、`delayMs` 後に
 * `restoreTo` の文言へ戻すユーティリティ。
 *
 * コピー成功時 / 失敗時の表示切替を 1 つの関数に集約し、`handleClick` の
 * cognitive complexity を引き下げる。
 */
const flashButtonLabel = (
  target: HTMLElement,
  transient: string,
  restoreTo: string | null,
  delayMs: number,
): void => {
  target.textContent = transient;
  setTimeout(() => {
    target.textContent = restoreTo;
  }, delayMs);
};

/**
 * クリップボードへのコピーと UI フィードバック (成功 / 失敗の文言切替) を
 * 1 関数にまとめる。`handleClick` から try/catch 分岐を引き剥がすために抽出。
 */
const copyAndAnimate = async (target: HTMLElement, code: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(code);
    const originalText = target.textContent;
    flashButtonLabel(target, COPY_SUCCESS_LABEL, originalText, RESTORE_DELAY_MS);
  } catch {
    flashButtonLabel(target, COPY_FAILURE_LABEL, COPY_DEFAULT_LABEL, RESTORE_DELAY_MS);
  }
};

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

    const handleClick = (event: MouseEvent): void => {
      if (!(event.target instanceof HTMLElement)) {
        return;
      }
      const target = event.target;
      if (!target.classList.contains("copy-btn")) {
        return;
      }
      const code = target.getAttribute("data-code");
      if (!code) {
        return;
      }
      void copyAndAnimate(target, code);
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [containerRef]);
};
