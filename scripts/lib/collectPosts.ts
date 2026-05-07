/**
 * `datasources/*.md` を全件読み込み、メタデータ付きの記事一覧を返すヘルパ
 *
 * RSS / sitemap 生成の共通基盤。
 * - `## メタ` セクションがある場合は parseMetaSection を使う
 * - 無い場合は createDefaultMeta で既存 16 記事互換の既定値を割り当てる
 * - `status === "published"` のみを返す（draft / archived は除外）
 */

import fs from "node:fs";
import path from "node:path";
import {
  extractBodyContent,
  extractExcerpt,
  extractTitle,
} from "../../src/lib/markdownParser.ts";
import {
  createDefaultMeta,
  parseMetaSection,
  type PostMeta,
} from "../../src/lib/meta.ts";

/**
 * 配信用に正規化された記事レコード
 */
export interface CollectedPost {
  /** ファイル名から拡張子を除いた ID（例: "20250101120000"） */
  readonly id: string;
  /** 元のファイル名（例: "20250101120000.md"） */
  readonly fileName: string;
  /** 記事タイトル（h1）、無ければ ID をフォールバック */
  readonly title: string;
  /** 本文先頭からの抜粋（プレーンテキスト） */
  readonly excerpt: string;
  /** メタデータ（status / publishedAt / updatedAt / tags） */
  readonly meta: PostMeta;
}

/**
 * datasources ディレクトリのデフォルトパス
 */
export const DATASOURCES_DIR = path.resolve(process.cwd(), "datasources");

/**
 * .md ファイル名のみを抽出する
 *
 * - `images/` などのサブディレクトリは無視
 * - `.md` 以外の拡張子も除外
 */
const listMarkdownFiles = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort();
};

/**
 * 1 ファイル分の Markdown から CollectedPost を構築する
 *
 * - parseMetaSection が null を返した場合は createDefaultMeta を使う
 * - parseMetaSection が throw した場合はそのまま伝搬（build fail）
 */
const buildPost = (fileName: string, content: string): CollectedPost => {
  const id = fileName.replace(/\.md$/, "");
  const lines = content.split(/\r\n|\r|\n/);
  const rawTitle = extractTitle(lines);
  const title = rawTitle.length > 0 ? rawTitle : id;
  const body = extractBodyContent(lines);
  const excerpt = extractExcerpt(body);
  const parsed = parseMetaSection(content, fileName);
  const meta = parsed ?? createDefaultMeta(fileName);
  return { id, fileName, title, excerpt, meta };
};

/**
 * datasources 配下の全 Markdown を読み、published のみを返す
 *
 * - publishedAt の降順（新しい順）にソート
 * - パスは絶対パスを既定とし、テスト時のみ任意指定可能
 */
export const collectPublishedPosts = (
  datasourcesDir: string = DATASOURCES_DIR,
): CollectedPost[] => {
  const fileNames = listMarkdownFiles(datasourcesDir);
  const posts = fileNames.map((fileName) => {
    const filePath = path.join(datasourcesDir, fileName);
    const content = fs.readFileSync(filePath, "utf8");
    return buildPost(fileName, content);
  });
  return posts
    .filter((post) => post.meta.status === "published")
    .sort((a, b) => {
      // publishedAt の降順（新しい記事を先頭に）
      if (a.meta.publishedAt === b.meta.publishedAt) {
        return b.id.localeCompare(a.id);
      }
      return b.meta.publishedAt.localeCompare(a.meta.publishedAt);
    });
};
