/**
 * XML 出力用のエスケープユーティリティ
 *
 * RSS 2.0 / sitemap 双方の生成で利用する。
 * 5 種の XML 予約文字 (& < > " ') を実体参照に変換する。
 */

/**
 * 文字列を XML テキストノード用にエスケープする
 *
 * - `&` は最初に変換しないと他の置換で重複置換が発生するため、必ず先頭で処理する
 * - 属性値・要素値の双方で安全に利用可能
 */
export const escapeXml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};
