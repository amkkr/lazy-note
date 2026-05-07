import Fuse, { type IFuseOptions } from "fuse.js";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getSearchIndexUrl,
  normalizeSearchIndex,
  type SearchIndexEntry,
} from "./searchIndex";

/**
 * Fuse.js のオプション
 *
 * - title を最重視 (weight 0.6)、tags 中位 (0.3)、excerpt 軽め (0.1) で重み付け
 * - threshold は 0.4 で fuzzy 寄り
 * - includeScore で結果ソートに利用
 */
const FUSE_OPTIONS: IFuseOptions<SearchIndexEntry> = {
  keys: [
    { name: "title", weight: 0.6 },
    { name: "tags", weight: 0.3 },
    { name: "excerpt", weight: 0.1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeScore: true,
  minMatchCharLength: 1,
};

/**
 * 検索結果の最大件数（UI 上の上限）
 */
const MAX_RESULTS = 20;

/**
 * useSearch の戻り値
 */
export interface UseSearchResult {
  readonly query: string;
  readonly setQuery: (next: string) => void;
  readonly results: readonly SearchIndexEntry[];
  readonly isReady: boolean;
  readonly hasError: boolean;
  readonly totalIndexed: number;
}

/**
 * クライアント側検索を提供するカスタムフック
 *
 * - マウント時に search-index.json を fetch（active=true 時のみ）
 * - `setQuery` で検索クエリを更新、`results` に上位 MAX_RESULTS 件
 * - クエリが空のときは結果を空にして履歴的な情報を出さない
 *
 * @param active - true のときのみインデックスをロードする（モーダルが開いた時等）
 * @param baseUrl - Vite の `import.meta.env.BASE_URL` を渡す
 */
export const useSearch = (
  active: boolean,
  baseUrl: string,
): UseSearchResult => {
  const [entries, setEntries] = useState<readonly SearchIndexEntry[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [query, setQuery] = useState("");
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!active || loadedRef.current) {
      return;
    }
    loadedRef.current = true;
    const controller = new AbortController();
    const load = async (): Promise<void> => {
      try {
        const response = await fetch(getSearchIndexUrl(baseUrl), {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load search index: ${response.status}`);
        }
        const data: unknown = await response.json();
        setEntries(normalizeSearchIndex(data));
        setIsReady(true);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("[search] index load failed:", error);
        setHasError(true);
        setIsReady(true);
      }
    };
    load();
    return () => {
      controller.abort();
    };
  }, [active, baseUrl]);

  const fuse = useMemo(() => {
    if (entries.length === 0) {
      return null;
    }
    return new Fuse([...entries], FUSE_OPTIONS);
  }, [entries]);

  const results = useMemo<readonly SearchIndexEntry[]>(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0 || fuse === null) {
      return [];
    }
    return fuse
      .search(trimmed, { limit: MAX_RESULTS })
      .map((match) => match.item);
  }, [fuse, query]);

  return {
    query,
    setQuery,
    results,
    isReady,
    hasError,
    totalIndexed: entries.length,
  };
};
