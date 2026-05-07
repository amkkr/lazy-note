/**
 * クライアント側検索インデックス用の型定義とローダ
 *
 * `scripts/buildSearchIndex.ts` が生成する `search-index.json` を読み込み、
 * Fuse.js で検索可能な形に保つ。
 */

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
 * 受信した unknown 値が SearchIndexEntry として最低限妥当か判定する型ガード
 *
 * - 期待プロパティの型を厳密に検査する
 * - tags は string の配列であることを確認
 */
export const isSearchIndexEntry = (
  value: unknown,
): value is SearchIndexEntry => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.id !== "string") {
    return false;
  }
  if (typeof candidate.title !== "string") {
    return false;
  }
  if (typeof candidate.excerpt !== "string") {
    return false;
  }
  if (typeof candidate.publishedAt !== "string") {
    return false;
  }
  if (!Array.isArray(candidate.tags)) {
    return false;
  }
  return candidate.tags.every((tag) => typeof tag === "string");
};

/**
 * fetch 結果を SearchIndexEntry[] に正規化する
 *
 * - 配列でない / 要素が型ガードを通らない場合は空配列にフォールバックする
 */
export const normalizeSearchIndex = (
  data: unknown,
): readonly SearchIndexEntry[] => {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.filter(isSearchIndexEntry);
};

/**
 * `search-index.json` を取得する URL を組み立てる
 *
 * - Vite の `BASE_URL` を尊重して `/<base>/search-index.json` を返す
 */
export const getSearchIndexUrl = (baseUrl: string): string => {
  const normalized = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalized}search-index.json`;
};
