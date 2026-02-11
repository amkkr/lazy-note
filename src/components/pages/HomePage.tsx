import { memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
import { Link } from "../atoms/Link";
import { Heading2 } from "../atoms/Typography";
import { EmptyState } from "../common/EmptyState";
import { MetaInfo } from "../common/MetaInfo";
import { Pagination } from "../common/Pagination";

interface HomePageProps {
  posts: PostSummary[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// スタイルをコンポーネント外に定数として定義
const containerStyles = css({
  maxWidth: "900px",
  margin: "0 auto",
  padding: "content",
  paddingX: "32px",
});

const postListStyles = css({
  display: "flex",
  flexDirection: "column",
  gap: "32px",
  paddingTop: "12px",
});

const articleStyles = css({
  background: "bg.1",
  borderRadius: "12px",
  overflow: "hidden",
  boxShadow: "card",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "card-hover",
  },
});

const articleHeaderStyles = css({
  padding: "card",
  paddingBottom: "16px",
  paddingX: "12px",
  borderBottom: "1px solid",
  borderColor: "surface.200",
});

const articleContentStyles = css({
  padding: "card",
});

/**
 * ホームページコンポーネント（CSS定数抽出 + React.memoでメモ化）
 */
export const HomePage = memo(
  ({ posts, currentPage, totalPages, onPageChange }: HomePageProps) => {
    return (
      <div className={containerStyles}>
        {posts.length === 0 ? (
          <EmptyState
            icon="📝"
            title="新しい記事をお楽しみに"
            description="まもなく素晴らしい記事が公開される予定です。創造性に満ちたコンテンツをお届けします。"
          />
        ) : (
          <>
            <div className={postListStyles}>
              {posts.map((post) => (
                <article key={post.id} className={articleStyles}>
                  <div className={articleHeaderStyles}>
                    <MetaInfo
                      createdAt={post.createdAt}
                      author={post.author}
                      variant="card"
                    />
                  </div>

                  <div className={articleContentStyles}>
                    <Link to={`/posts/${post.id}`} variant="card">
                      <Heading2 variant="card">
                        {post.title || "無題の記事"}
                      </Heading2>
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </>
        )}
      </div>
    );
  },
);

HomePage.displayName = "HomePage";
