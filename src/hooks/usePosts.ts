import { useEffect, useState } from "react";
import { getAllPosts, type Post } from "../lib/markdown";

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
}

/**
 * 記事一覧を取得するカスタムフック
 * @returns 記事一覧、ローディング状態、エラー状態
 */
export const usePosts = (): UsePostsReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const allPosts = await getAllPosts();
        setPosts(allPosts);
      } catch (err) {
        console.error("Failed to load posts:", err);
        setError(
          err instanceof Error ? err.message : "記事の読み込みに失敗しました",
        );
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  return { posts, loading, error };
};
