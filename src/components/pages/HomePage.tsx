import { memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
import { FileText } from "../atoms/icons";
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
  maxWidth: "content",
  margin: "0 auto",
  padding: "content",
  paddingX: "md",
  md: {
    paddingX: "xl",
  },
});

const postListStyles = css({
  display: "flex",
  flexDirection: "column",
  gap: "xl",
  paddingTop: "sm-md",
});

const articleStyles = css({
  background: "bg.surface",
  borderRadius: "lg",
  overflow: "hidden",
  boxShadow: "card",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: "card-hover",
  },
});

// 親 articleStyles の bg.surface 上に置く 1px divider のため、bg.surface だと
// 同色で消失する。bg.elevated (より明るい色) でハイライト風の区切り線にする
// (R-2b 修正方針を踏襲)。
const articleHeaderStyles = css({
  padding: "sm-md",
  paddingBottom: "md",
  borderBottom: "1px solid",
  borderColor: "bg.elevated",
  md: {
    padding: "card",
    paddingBottom: "md",
    paddingX: "sm-md",
  },
});

const articleContentStyles = css({
  padding: "sm-md",
  md: {
    padding: "card",
  },
});

// 記事一覧の excerpt は本文寄りの用途のため、fg.muted (light: 6.54:1 AA) ではなく
// fg.secondary (light: 9.59:1 AAA / dark: 14.84:1 AAA) を採用する。
// (R-2c レビュー指摘: 記事カード上の excerpt は補助情報ではなく読まれる前提のため。)
const excerptStyles = css({
  fontSize: "sm",
  color: "fg.secondary",
  lineHeight: "body",
  marginTop: "sm",
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
            icon={FileText}
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
                      readingTimeMinutes={post.readingTimeMinutes}
                      variant="card"
                    />
                  </div>

                  <div className={articleContentStyles}>
                    <Link to={`/posts/${post.id}`} variant="card">
                      <Heading2 variant="card">
                        {post.title || "無題の記事"}
                      </Heading2>
                    </Link>
                    {post.excerpt && (
                      <p className={excerptStyles}>{post.excerpt}</p>
                    )}
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
