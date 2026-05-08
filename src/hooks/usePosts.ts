import { useEffect, useState } from "react";
import { getAllPostSummaries, type PostSummary } from "../lib/markdown";

/**
 * 1 ページあたりの記事件数。
 *
 * Issue #395 (Editorial Bento) の構成に合わせ、Featured 1 + Bento 6 + Index 9 の
 * 計 16 件を 1 ページに収められるよう 16 に設定している。これにより:
 * - 1 ページ目に Featured / Bento / Index の全ロールが揃い、Magazine 風 TOC として
 *   Index セクションが意味を持つ (10 件のままだと 1 ページ目に最大 3 件しか出ず TOC が破綻する)
 * - 「特集 1 件」の雑誌メタファーが Featured = 全期間の最新 1 件として保たれる
 *   (10 件区切りだと 2 ページ目以降にも Featured が出てしまう)
 *
 * TODO: 記事が 16 件を大きく超えてきた場合、lazy-load / 仮想スクロール導入を別 Issue
 * で検討する。現時点 (運用記事数 < 30 程度) では 1 ページ完結 + Pagination 自動表示で
 * 十分機能するため、本 PR ではこの値で固定する。
 */
const POSTS_PER_PAGE = 16;

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
