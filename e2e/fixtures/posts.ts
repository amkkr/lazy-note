import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * e2e テスト共通 fixture: datasource の記事を動的に解決する
 *
 * `e2e/visual/main-pages.spec.ts` / `e2e/a11y/violations.spec.ts` などで
 * PostDetail の test URL をハードコードすると、記事の追加 / 削除のたびに
 * テストが一斉に壊れる。datasource (`datasources/*.md`) から記事を動的に
 * 取得することで、test URL を記事の増減に自動追従させる。
 *
 * datasource のファイル命名はタイムスタンプ形式 (`20260307120000.md` 等) で、
 * 文字列降順ソートの先頭が最新記事になる (`src/api/posts.ts` と同じ規約)。
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * datasource ディレクトリ (`datasources/`) の絶対パス。
 * 本ファイルは `e2e/fixtures/` に置かれているため、リポジトリルートは 2 階層上。
 */
const DATASOURCES_DIR = join(__dirname, "..", "..", "datasources");

/**
 * datasource ディレクトリ直下の Markdown ファイル名 (タイムスタンプ) を
 * 新しい順 (文字列降順) でソートして返す。
 *
 * @returns タイムスタンプ文字列の配列 (例: `["20260307120000", ...]`)。降順。
 * @throws datasource に Markdown ファイルが 1 つも存在しない場合
 */
export const getPostTimestamps = (): string[] => {
  const timestamps = readdirSync(DATASOURCES_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""))
    // タイムスタンプ形式のファイル名のみを対象にする (降順ソートの先頭 = 最新)
    .filter((name) => /^\d{14}$/.test(name))
    .sort((a, b) => b.localeCompare(a));

  if (timestamps.length === 0) {
    throw new Error(
      `datasource にタイムスタンプ形式の Markdown が見つかりません: ${DATASOURCES_DIR}`,
    );
  }

  return timestamps;
};

/**
 * 最新記事 (タイムスタンプ最大) のタイムスタンプを返す。
 *
 * @returns 最新記事のタイムスタンプ文字列 (例: `"20260307120000"`)
 */
export const getLatestPostTimestamp = (): string => {
  const [latest] = getPostTimestamps();
  return latest;
};

/**
 * 最新から数えて n 番目 (0-indexed) の記事タイムスタンプを返す。
 * 代表ページとして「最新」「2 番目に新しい記事」を使い分けるための補助。
 *
 * @param index 0 = 最新, 1 = 2 番目に新しい記事, ...
 * @returns 指定位置の記事タイムスタンプ文字列
 * @throws 指定位置の記事が存在しない場合
 */
export const getPostTimestampByRecency = (index: number): string => {
  const timestamps = getPostTimestamps();
  const timestamp = timestamps[index];

  if (timestamp === undefined) {
    throw new Error(
      `datasource に最新から ${index} 番目の記事が存在しません ` +
        `(記事数: ${timestamps.length})`,
    );
  }

  return timestamp;
};

/**
 * 記事タイムスタンプから PostDetail ページの URL パスを組み立てる。
 *
 * @param timestamp 記事タイムスタンプ (例: `"20260307120000"`)
 * @returns PostDetail の URL パス (例: `"/posts/20260307120000"`)
 */
export const buildPostDetailPath = (timestamp: string): string =>
  `/posts/${timestamp}`;

/**
 * 最新記事の PostDetail URL パスを返す。
 *
 * @returns 最新記事の URL パス (例: `"/posts/20260307120000"`)
 */
export const getLatestPostDetailPath = (): string =>
  buildPostDetailPath(getLatestPostTimestamp());
