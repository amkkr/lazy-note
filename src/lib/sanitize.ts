import DOMPurify from "dompurify";

/**
 * 投稿本文 (Markdown を marked で HTML 化したもの) を DOMPurify でサニタイズする
 * ラッパー関数。
 *
 * 本プロジェクトでは、コードブロックに「コピー」ボタン (`<button class="copy-btn"
 * data-code="...">`) を埋め込むため、DOMPurify の既定許可タグ・属性に加えて
 * 以下を許可している。
 *
 * - `ADD_TAGS: ["button"]` … コピー UI に使用する button タグを保持する
 * - `ADD_ATTR: ["data-code"]` … コピー対象テキストを格納するカスタム属性を保持する
 *
 * これらの追加許可は `PostDetailPage` で必要となる最小限の拡張であり、
 * `onclick` などのイベントハンドラ属性は DOMPurify が既定で除去するため、
 * button が許可された状態でも XSS 経路は開かない。
 *
 * `data-code` 属性は `useCodeBlockCopy.ts` から `navigator.clipboard.writeText` に
 * 渡されるが、`writeText` はコード実行 sink ではなく単なる文字列書き込みのため、
 * 属性値内に `javascript:` URI や `<script>` 文字列が含まれていてもコード実行
 * リスクは生じない。万一クリップボードに長文や制御文字が含まれてもユーザ操作で
 * 上書き可能であり、即時の悪用リスクは低い。
 *
 * 設定の drift を防ぐため、本番コードでの DOMPurify 呼び出しは必ずこの関数を
 * 経由すること (インラインで `DOMPurify.sanitize(..., { ADD_TAGS, ADD_ATTR })`
 * を書かない)。
 *
 * @param html サニタイズ対象の HTML 文字列 (通常 marked が生成した文字列)
 * @returns 安全な HTML 文字列
 */
export const sanitizePostHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["button"],
    ADD_ATTR: ["data-code"],
  });
};
