/**
 * Markdownパース用の純粋関数群
 */

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
 * @returns 本文の内容（空行を除く）
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

  return bodyLines.filter((line) => line.trim() !== "").join("\n");
};

/**
 * 投稿のメタデータ（一覧表示用、本文を含まない）
 */
export interface PostSummary {
  id: string;
  title: string;
  createdAt: string;
  author: string;
}

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
  const lines = content.split("\n");
  const title = extractTitle(lines);
  const createdAt = extractSectionContent(lines, "投稿日時");
  const author = extractSectionContent(lines, "筆者名");
  return { id: timestamp, title, createdAt, author };
};
