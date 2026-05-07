/**
 * 検索インデックスの 1 レコードと、Markdown からのエントリ生成ロジック
 *
 * - サーバ側スクリプト (`scripts/buildSearchIndex.ts`) からも、テストからも利用される
 * - DOM / fs に依存しない純粋関数として実装する
 */
import {
  extractBodyContent,
  extractExcerpt,
  extractTitle,
} from "./markdownParser.ts";
import {
  createDefaultMeta,
  parseMetaSection,
  type PostMeta,
} from "./meta.ts";

/**
 * 検索インデックスの 1 レコード
 */
export interface SearchIndexEntry {
  readonly id: string;
  readonly title: string;
  readonly excerpt: string;
  readonly tags: readonly string[];
  readonly publishedAt: string;
}

/**
 * excerpt の最大文字数（一覧と同等）
 */
export const SEARCH_EXCERPT_MAX_LENGTH = 150;

/**
 * Markdown 全文 + ファイル名から SearchIndexEntry を構築する
 *
 * - `## メタ` セクションを参照し、`status !== "published"` の場合は null を返す
 * - 本文を Markdown 記法を取り除いた excerpt に圧縮する
 * - メタパース失敗時は MetaParseError をそのまま投げる（呼び出し元で build fail 化）
 */
export const buildSearchEntry = (
  content: string,
  fileName: string,
): SearchIndexEntry | null => {
  const meta: PostMeta =
    parseMetaSection(content, fileName) ?? createDefaultMeta(fileName);

  if (meta.status !== "published") {
    return null;
  }

  const lines = content.split(/\r\n|\r|\n/);
  const title = extractTitle(lines);
  const body = extractBodyContent(lines);
  const excerpt = extractExcerpt(body, SEARCH_EXCERPT_MAX_LENGTH);
  const id = fileName.replace(/\.md$/, "");

  return {
    id,
    title,
    excerpt,
    tags: meta.tags,
    publishedAt: meta.publishedAt,
  };
};

/**
 * SearchIndexEntry 配列を publishedAt 降順でソートする
 */
export const sortEntriesByPublishedAtDesc = (
  entries: readonly SearchIndexEntry[],
): SearchIndexEntry[] => {
  return [...entries].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
};
