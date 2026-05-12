import { useEffect, useState } from "react";
import { getAllPostSummaries, type PostSummary } from "../lib/markdown";

interface AdjacentPosts {
  olderPost: PostSummary | null;
  newerPost: PostSummary | null;
}

interface UseAdjacentPostsReturn extends AdjacentPosts {
  loading: boolean;
}

/**
 * 記事リストから指定IDの前後の記事を取得する
 * 配列はID降順（新しい順）のため、index+1が古い記事、index-1が新しい記事
 * @param summaries ID降順でソートされた記事サマリーリスト
 * @param currentId 現在表示中の記事ID
 */
export const findAdjacentPosts = (
  summaries: PostSummary[],
  currentId: string,
): AdjacentPosts => {
  const currentIndex = summaries.findIndex((post) => post.id === currentId);

  if (currentIndex === -1) {
    return { olderPost: null, newerPost: null };
  }

  const newerPost = currentIndex > 0 ? summaries[currentIndex - 1] : null;
  const olderPost =
    currentIndex < summaries.length - 1 ? summaries[currentIndex + 1] : null;

  return { olderPost, newerPost };
};

/**
 * 前後の記事を取得するカスタムフック
 * @param currentId 現在表示中の記事ID
 */
export const useAdjacentPosts = (
  currentId: string | undefined,
): UseAdjacentPostsReturn => {
  const [adjacentPosts, setAdjacentPosts] = useState<AdjacentPosts>({
    olderPost: null,
    newerPost: null,
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
        setAdjacentPosts({ olderPost: null, newerPost: null });
      } finally {
        setLoading(false);
      }
    };

    loadAdjacentPosts();
  }, [currentId]);

  return { ...adjacentPosts, loading };
};
