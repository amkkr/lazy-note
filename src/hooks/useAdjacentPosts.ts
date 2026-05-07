import { useEffect, useState } from "react";
import { getAllPostSummaries, type PostSummary } from "../lib/markdown";

interface UseAdjacentPostsReturn {
  prevPost: PostSummary | null;
  nextPost: PostSummary | null;
  loading: boolean;
}

/**
 * 前後の記事を取得するカスタムフック
 * @param currentId 現在表示中の記事ID
 * @returns 前の記事（より新しい）、次の記事（より古い）、ローディング状態
 */
export const useAdjacentPosts = (
  currentId: string | undefined,
): UseAdjacentPostsReturn => {
  const [prevPost, setPrevPost] = useState<PostSummary | null>(null);
  const [nextPost, setNextPost] = useState<PostSummary | null>(null);
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

        const currentIndex = summaries.findIndex(
          (post) => post.id === currentId,
        );

        if (currentIndex === -1) {
          setPrevPost(null);
          setNextPost(null);
        } else {
          setPrevPost(currentIndex > 0 ? summaries[currentIndex - 1] : null);
          setNextPost(
            currentIndex < summaries.length - 1
              ? summaries[currentIndex + 1]
              : null,
          );
        }
      } catch (error) {
        console.error("Failed to load adjacent posts:", error);
        setPrevPost(null);
        setNextPost(null);
      } finally {
        setLoading(false);
      }
    };

    loadAdjacentPosts();
  }, [currentId]);

  return { prevPost, nextPost, loading };
};
