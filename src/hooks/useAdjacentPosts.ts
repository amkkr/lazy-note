import { useEffect, useState } from "react";
import { getAllPostSummaries, type PostSummary } from "../lib/markdown";

interface AdjacentPosts {
  prevPost: PostSummary | null;
  nextPost: PostSummary | null;
}

interface UseAdjacentPostsReturn extends AdjacentPosts {
  loading: boolean;
}

/**
 * 記事リストから指定IDの前後の記事を取得する
 * @param summaries ID降順でソートされた記事サマリーリスト
 * @param currentId 現在表示中の記事ID
 * @returns 前の記事（より新しい）と次の記事（より古い）
 */
const findAdjacentPosts = (
  summaries: PostSummary[],
  currentId: string,
): AdjacentPosts => {
  const currentIndex = summaries.findIndex((post) => post.id === currentId);

  if (currentIndex === -1) {
    return { prevPost: null, nextPost: null };
  }

  const prevPost = currentIndex > 0 ? summaries[currentIndex - 1] : null;
  const nextPost =
    currentIndex < summaries.length - 1 ? summaries[currentIndex + 1] : null;

  return { prevPost, nextPost };
};

/**
 * 前後の記事を取得するカスタムフック
 * @param currentId 現在表示中の記事ID
 * @returns 前の記事（より新しい）、次の記事（より古い）、ローディング状態
 */
export const useAdjacentPosts = (
  currentId: string | undefined,
): UseAdjacentPostsReturn => {
  const [adjacentPosts, setAdjacentPosts] = useState<AdjacentPosts>({
    prevPost: null,
    nextPost: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdjacentPosts = async () => {
      if (!currentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const summaries = await getAllPostSummaries();
        setAdjacentPosts(findAdjacentPosts(summaries, currentId));
      } catch (error) {
        console.error("Failed to load adjacent posts:", error);
        setAdjacentPosts({ prevPost: null, nextPost: null });
      } finally {
        setLoading(false);
      }
    };

    loadAdjacentPosts();
  }, [currentId]);

  return { ...adjacentPosts, loading };
};
