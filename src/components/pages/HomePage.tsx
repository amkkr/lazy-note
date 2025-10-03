import { css } from "../../../styled-system/css";
import type { Post } from "../../lib/markdown";
import { Link } from "../atoms/Link";
import { Heading2 } from "../atoms/Typography";
import { EmptyState } from "../common/EmptyState";
import { MetaInfo } from "../common/MetaInfo";
import { Pagination } from "../common/Pagination";

interface HomePageProps {
  posts: Post[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const HomePage = ({
  posts,
  currentPage,
  totalPages,
  onPageChange,
}: HomePageProps) => {
  return (
    <div
      className={css({
        maxWidth: "900px",
        margin: "0 auto",
        padding: "content",
        paddingX: "32px",
      })}
    >
      {posts.length === 0 ? (
        <EmptyState
          icon="📝"
          title="新しい記事をお楽しみに"
          description="まもなく素晴らしい記事が公開される予定です。創造性に満ちたコンテンツをお届けします。"
        />
      ) : (
        <>
          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "32px",
              paddingTop: "12px",
            })}
          >
            {posts.map((post) => (
              <article
                key={post.id}
                className={css({
                  background: "bg.1",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "card",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "card-hover",
                  },
                })}
              >
                <div
                  className={css({
                    padding: "card",
                    paddingBottom: "16px",
                    paddingX: "12px",
                    borderBottom: "1px solid",
                    borderColor: "surface.200",
                  })}
                >
                  <MetaInfo
                    createdAt={post.createdAt}
                    author={post.author}
                    variant="card"
                  />
                </div>

                <div className={css({ padding: "card" })}>
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
};
