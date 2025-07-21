import { useEffect, useState } from "react";
import { type Post, getPost } from "../lib/markdown";

interface UsePostReturn {
  post: Post | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

/**
 * 記事詳細を取得するカスタムフック
 * @param timestamp 記事のタイムスタンプID
 * @returns 記事詳細、ローディング状態、エラー状態、記事が見つからない状態
 */
export const usePost = (timestamp: string | undefined): UsePostReturn => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      if (!timestamp) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setNotFound(false);

        const postData = await getPost(timestamp);
        if (postData) {
          setPost(postData);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error("Failed to load post:", err);
        setError(
          err instanceof Error ? err.message : "記事の読み込みに失敗しました",
        );
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [timestamp]);

  return { post, loading, error, notFound };
};
