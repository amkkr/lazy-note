import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import { css } from "../../../styled-system/css";
import { MetaInfo } from "../common/MetaInfo";
import type { Post } from "../../lib/markdown";

interface PostDetailPageProps {
  post: Post;
}

export const PostDetailPage = ({ post }: PostDetailPageProps) => {
  return (
    <>
      {/* Navigation */}
      <nav
        className={css({
          background: "bg.1",
          borderBottom: "1px solid",
          borderColor: "bg.3",
          paddingY: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <div
          className={css({
            maxWidth: "900px",
            width: "100%",
          })}
        >
          <Link
            to="/"
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "blue.light",
              fontSize: "sm",
              fontWeight: "600",
              textDecoration: "none",
              "&:hover": {
                color: "aqua.light",
              },
            })}
          >
            ← Lazy Note に戻る
          </Link>
        </div>
      </nav>

      <div
        className={css({
          background: "bg.0",
          minHeight: "100vh",
        })}
      >
        <div
          className={css({
            maxWidth: "article",
            margin: "0 auto",
            padding: "content",
          })}
        >
          <article
            className={css({
              background: "bg.1",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "card-hover",
              border: "1px solid",
              borderColor: "bg.3",
            })}
          >
            {/* Article Header with Gradient */}
            <header
              className={css({
                background: "gradients.primary",
                color: "fg.0",
                padding: "section",
              })}
            >
              <h1
                className={css({
                  fontSize: "3xl",
                  fontWeight: "bold",
                  lineHeight: "1.2",
                  marginBottom: "card",
                })}
              >
                {post.title || "無題の記事"}
              </h1>

              <MetaInfo
                createdAt={post.createdAt}
                author={post.author}
                variant="header"
              />
            </header>

            {/* Divider */}
            <div className={css({
              height: "1px",
              background: "surface.200"
            })} />

            {/* Article Content */}
            <main
              className={css({
                padding: "section",
                lineHeight: "1.7",
                fontSize: "base",
                color: "fg.1",
                "& h1, & h2, & h3": {
                  color: "fg.0",
                  fontWeight: "bold",
                  marginTop: "32px",
                  marginBottom: "16px",
                },
                "& h1": { fontSize: "28px" },
                "& h2": { fontSize: "24px" },
                "& h3": { fontSize: "20px" },
                "& p": {
                  marginBottom: "16px",
                },
                "& ul, & ol": {
                  paddingLeft: "24px",
                  marginBottom: "16px",
                },
                "& li": {
                  marginBottom: "8px",
                },
                "& a": {
                  color: "blue.light",
                  textDecoration: "underline",
                  "&:hover": {
                    color: "aqua.light",
                  },
                },
                "& code": {
                  background: "bg.2",
                  color: "orange.light",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "14px",
                },
                "& pre": {
                  background: "bg.0",
                  color: "fg.1",
                  padding: "24px",
                  borderRadius: "8px",
                  overflow: "auto",
                  margin: "24px 0",
                },
              })}
            >
              <div
                // biome-ignore lint/security/noDangerouslySetInnerHtml: MarkdownをHTMLとして表示するために必要。DOMPurifyでサニタイズ済み
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(post.content),
                }}
              />
            </main>
          </article>
        </div>
      </div>
    </>
  );
};