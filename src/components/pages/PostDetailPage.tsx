import DOMPurify from "dompurify";
import { css } from "../../../styled-system/css";
import type { Post } from "../../lib/markdown";
import { Link } from "../atoms/Link";
import { Heading1 } from "../atoms/Typography";
import { MetaInfo } from "../common/MetaInfo";

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
          <Link to="/" variant="navigation">
            ← TOPに戻る
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
              <Heading1
                variant="page"
                className={css({ marginBottom: "card" })}
              >
                {post.title || "無題の記事"}
              </Heading1>

              <MetaInfo
                createdAt={post.createdAt}
                author={post.author}
                variant="header"
              />
            </header>

            {/* Divider */}
            <div
              className={css({
                height: "1px",
                background: "surface.200",
              })}
            />

            {/* Article Content */}
            <main
              className={css({
                paddingRight: "section",
                paddingLeft: "section",
                paddingBottom: "section",
                lineHeight: "body",
                fontSize: "base",
                color: "fg.1",
                "& h1, & h2, & h3": {
                  color: "fg.0",
                  fontWeight: "bold",
                  marginTop: "xl",
                  marginBottom: "md",
                },
                "& h1": { fontSize: "2xl" },
                "& h2": { fontSize: "xl" },
                "& h3": { fontSize: "lg" },
                "& p": {
                  marginBottom: "md",
                },
                "& ul, & ol": {
                  paddingLeft: "lg",
                  marginBottom: "md",
                },
                "& li": {
                  marginBottom: "sm",
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
                  padding: "2xs xs-sm",
                  borderRadius: "xs",
                  fontSize: "sm-lg",
                },
                "& pre": {
                  background: "bg.0",
                  color: "fg.1",
                  padding: "lg",
                  borderRadius: "sm",
                  overflow: "auto",
                  margin: "lg 0",
                },
                "& img": {
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "sm",
                  margin: "md 0",
                  display: "block",
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
