import { useEffect, useState } from "react";
import { getAllPosts, type Post } from "../lib/markdown";

const POSTS_PER_PAGE = 10;

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
}

/**
 * 記事一覧を取得するカスタムフック（ページング機能付き）
 * @returns 記事一覧、ローディング状態、エラー状態、ページング情報
 */
export const usePosts = (): UsePostsReturn => {
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const posts = await getAllPosts();
        setAllPosts(posts);
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

  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const posts = allPosts.slice(startIndex, endIndex);

  return { posts, loading, error, currentPage, totalPages, setCurrentPage };
};
