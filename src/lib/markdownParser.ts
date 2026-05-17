/**
 * Markdownパース用の純粋関数群
 */

/**
 * Markdown 全文を行配列に変換する
 *
 * - 文字列冒頭の UTF-8 BOM (U+FEFF) を 1 文字除去する
 * - 改行コードは CRLF (`\r\n`) / LF (`\n`) / CR (`\r`) の 3 種を許容する
 *
 * 旧 `src/lib/meta.ts` の `splitLines` (Issue #520 で削除) が持っていた
 * BOM 除去 + CRLF/LF/CR 三対応のノウハウを `markdownParser.ts` 側に
 * バックポートしたもの (Issue #558)。
 *
 * @param content Markdown 全文の文字列
 * @returns 改行で分割された行配列
 */
export const splitLines = (content: string): string[] => {
  const stripped = content.replace(/^﻿/, "");
  return stripped.split(/\r\n|\r|\n/);
};

/**
 * Markdownの行配列からタイトル（# で始まる行）を抽出する
 * @param lines Markdownの行配列
 * @returns タイトル文字列（見つからない場合は空文字）
 */
export const extractTitle = (lines: string[]): string => {
  const titleLine = lines.find((line) => line.startsWith("# "));
  return titleLine ? titleLine.substring(2).trim() : "";
};

/**
 * Markdownの行配列から指定されたセクション（## で始まる）の内容を抽出する
 * @param lines Markdownの行配列
 * @param sectionName セクション名（例: "投稿日時"）
 * @returns セクション内のリストアイテム（- で始まる行）の内容
 */
export const extractSectionContent = (
  lines: string[],
  sectionName: string,
): string => {
  const sectionIndex = lines.findIndex((line) =>
    line.startsWith(`## ${sectionName}`),
  );
  if (sectionIndex === -1) {
    return "";
  }

  const nextSectionIndex = lines.findIndex(
    (line, index) => index > sectionIndex && line.startsWith("## "),
  );

  const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
  const sectionLines = lines.slice(sectionIndex + 1, endIndex);

  const listItem = sectionLines.find((line) => line.startsWith("- "));
  return listItem ? listItem.substring(2).trim() : "";
};

/**
 * Markdownの行配列から本文セクションの内容を抽出する
 * @param lines Markdownの行配列
 * @returns 本文の内容（空行は段落区切りとして保持）
 */
export const extractBodyContent = (lines: string[]): string => {
  const bodyStartIndex = lines.findIndex((line) => line.startsWith("## 本文"));
  if (bodyStartIndex === -1) {
    return "";
  }

  const nextSectionIndex = lines.findIndex(
    (line, index) => index > bodyStartIndex && line.startsWith("## "),
  );

  const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
  const bodyLines = lines.slice(bodyStartIndex + 1, endIndex);

  return bodyLines.join("\n").trim();
};

/**
 * 投稿のメタデータ（一覧表示用、本文を含まない）
 */
export interface PostSummary {
  id: string;
  title: string;
  createdAt: string;
  author: string;
  excerpt: string;
  readingTimeMinutes: number;
}

/**
 * 本文からMarkdown記法を除去し、先頭の指定文字数を抽出する
 * @param bodyContent 本文のMarkdownコンテンツ
 * @param maxLength 最大文字数（デフォルト: 150）
 * @returns プレーンテキストの抜粋
 */
export const extractExcerpt = (
  bodyContent: string,
  maxLength = 150,
): string => {
  const plainText = bodyContent
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/!\[.*?\]\(.+?\)/g, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/---/g, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }
  return `${plainText.slice(0, maxLength)}...`;
};

/**
 * 本文の文字数から読了時間を算出する（日本語400文字/分ベース）
 * @param bodyContent 本文のMarkdownコンテンツ
 * @returns 読了時間（分、最低1分）
 */
export const calculateReadingTime = (bodyContent: string): number => {
  const charCount = bodyContent.replace(/\s/g, "").length;
  const minutes = Math.ceil(charCount / 400);
  return Math.max(1, minutes);
};

/**
 * Markdownコンテンツからサマリー（メタデータ）を抽出する
 * @param content Markdownコンテンツ
 * @param timestamp 投稿のタイムスタンプ（ID）
 * @returns 投稿のサマリー
 */
export const extractSummaryFromContent = (
  content: string,
  timestamp: string,
): PostSummary => {
  const lines = splitLines(content);
  const title = extractTitle(lines);
  const createdAt = extractSectionContent(lines, "投稿日時");
  const author = extractSectionContent(lines, "筆者名");
  const bodyContent = extractBodyContent(lines);
  return {
    id: timestamp,
    title,
    createdAt,
    author,
    excerpt: extractExcerpt(bodyContent),
    readingTimeMinutes: calculateReadingTime(bodyContent),
  };
};
