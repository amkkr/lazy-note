import { useEffect, useState } from "react";
import { getPost, type Post } from "../lib/markdown";

interface UsePostReturn {
  post: Post | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

/**
 * 記事詳細を取得するカスタムフック
 *
 * useEffect 内で非同期に記事をロードするため、timestamp 切替や unmount 時に
 * 古いリクエストの解決が新しい state を上書きする race condition、および
 * unmount 後の setState を防止するための cancellation flag を併用する。
 *
 * @param timestamp 記事のタイムスタンプID
 * @returns 記事詳細、ローディング状態、エラー状態、記事が見つからない状態
 */
export const usePost = (timestamp: string | undefined): UsePostReturn => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!timestamp) {
      setPost(null);
      setError(null);
      setNotFound(true);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError(null);
    setNotFound(false);

    getPost(timestamp)
      .then((postData) => {
        if (cancelled) {
          return;
        }
        if (postData) {
          setPost(postData);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load post:", err);
        if (cancelled) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "記事の読み込みに失敗しました",
        );
        setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [timestamp]);

  return { post, loading, error, notFound };
};
