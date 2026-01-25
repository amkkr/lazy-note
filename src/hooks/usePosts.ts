import { useEffect, useState } from "react";
import { getAllPostSummaries, type PostSummary } from "../lib/markdown";

const POSTS_PER_PAGE = 10;

interface UsePostsReturn {
  posts: PostSummary[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  setCurrentPage: (page: number) => void;
}

/**
 * 記事一覧を取得するカスタムフック（ページング機能付き）
 * 高速化のためメタデータのみを取得（本文は含まない）
 * @returns 記事一覧、ローディング状態、エラー状態、ページング情報
 */
export const usePosts = (): UsePostsReturn => {
  const [allPosts, setAllPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const posts = await getAllPostSummaries();
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

  const totalPosts = allPosts.length;
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const posts = allPosts.slice(startIndex, endIndex);

  return {
    posts,
    loading,
    error,
    currentPage,
    totalPages,
    totalPosts,
    setCurrentPage,
  };
};
