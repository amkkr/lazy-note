import DOMPurify from "dompurify";
import { useRef } from "react";
import { css } from "../../../styled-system/css";
import { useCodeBlockCopy } from "../../hooks/useCodeBlockCopy";
import { useImageLightbox } from "../../hooks/useImageLightbox";
import type { Post, PostSummary } from "../../lib/markdown";
import { Link } from "../atoms/Link";
import { Heading1 } from "../atoms/Typography";
import { ImageLightbox } from "../common/ImageLightbox";
import { MetaInfo } from "../common/MetaInfo";
import { PostNavigation } from "../common/PostNavigation";
import { TableOfContents } from "../common/TableOfContents";

interface PostDetailPageProps {
  post: Post;
  olderPost: PostSummary | null;
  newerPost: PostSummary | null;
}

export const PostDetailPage = ({
  post,
  olderPost,
  newerPost,
}: PostDetailPageProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  useCodeBlockCopy(contentRef);
  const { isOpen, imageSrc, imageAlt, close } = useImageLightbox(contentRef);
  return (
    <>
      {/* Navigation */}
      <nav
        aria-label="ページナビゲーション"
        className={css({
          background: "bg.surface",
          borderBottom: "1px solid",
          borderColor: "bg.elevated",
          paddingY: "sm-md",
          paddingX: "md",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          md: {
            paddingX: "0",
          },
        })}
      >
        <div
          className={css({
            maxWidth: "content",
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
          background: "bg.canvas",
          minHeight: "100vh",
        })}
      >
        <div
          className={css({
            maxWidth: "article",
            margin: "0 auto",
            padding: "md",
            md: {
              padding: "content",
            },
          })}
        >
          <article
            className={css({
              background: "bg.surface",
              borderRadius: "lg",
              overflow: "hidden",
              boxShadow: "card-hover",
              border: "1px solid",
              borderColor: "bg.elevated",
            })}
          >
            {/* Article Header (R-4 / Issue #392 でグラデヘッダを廃止し
                bg.surface のフラット背景に統一。Calm 思想 - 装飾ノイズの
                徹底削除 - と editorial 思想に沿った変更。) */}
            <header
              className={css({
                background: "bg.surface",
                color: "fg.primary",
                padding: "md",
                md: {
                  padding: "section",
                },
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
                background: "bg.elevated",
              })}
            />

            {/*
             * 目次 (TOC) は本文 prose セレクタの影響を受けないよう
             * contentRef の外に配置する (Issue #391)。
             * - TOC は独自の line-height (1.4) / padding 0 を持ち、本文の
             *   max-width 57.6rem や line-height 1.85 とは別仕様 (RFC 04 §"Sticky TOC")。
             * - contentRef 内に置くと "& ul" セレクタが TOC の <ul> にも割り込み、
             *   レイアウトが破壊されるため物理的に分離する。
             */}
            <div
              className={css({
                paddingRight: "md",
                paddingLeft: "md",
                paddingTop: "md",
                md: {
                  paddingRight: "section",
                  paddingLeft: "section",
                  paddingTop: "section",
                },
              })}
            >
              <TableOfContents toc={post.toc} />
            </div>

            {/* Article Content */}
            <div
              ref={contentRef}
              className={css({
                paddingRight: "md",
                paddingLeft: "md",
                paddingBottom: "md",
                md: {
                  paddingRight: "section",
                  paddingLeft: "section",
                  paddingBottom: "section",
                },
                fontSize: "base",
                color: "fg.primary",
                // Editorial Citrus 本文タイポグラフィ (Issue #391)。
                // - 本文要素 (p / ul / ol / blockquote / dl / figure / table / hr) に
                //   max-width 57.6rem (= 576px、62.5% 補正後) と margin auto を適用し
                //   1 行の文字数を読みやすい範囲 (全角 36-40 字程度) に制限する。
                // - line-height 1.85 で Newsreader + 日本語明朝混植時の行送りを確保。
                // - 見出し (h1-h3) も同 max-width で中央寄せに揃える (左端ずれ防止)。
                // - pre / code は max-width を制約せず、line-height: relaxed を維持
                //   (コード/出力の横スクロール許容、装飾追加なし)。

                // 見出しは本文と同じ max-width で中央寄せにすることで、
                // 段落と見出しの左端が揃い Editorial の段組らしさを保つ。
                "& h1, & h2, & h3": {
                  color: "fg.primary",
                  fontWeight: "bold",
                  maxWidth: "prose",
                  marginRight: "auto",
                  marginLeft: "auto",
                  marginTop: "xl",
                  marginBottom: "md",
                  lineHeight: "snug",
                },
                "& h1": { fontSize: "2xl" },
                "& h2": { fontSize: "xl" },
                "& h3": { fontSize: "lg" },

                // 段落: prose 適用範囲の中核。
                "& p": {
                  maxWidth: "prose",
                  marginRight: "auto",
                  marginLeft: "auto",
                  marginBottom: "md",
                  lineHeight: "prose",
                },

                // リスト類: 箇条書きも本文 measure に揃える。
                "& ul, & ol": {
                  maxWidth: "prose",
                  marginRight: "auto",
                  marginLeft: "auto",
                  paddingLeft: "lg",
                  marginBottom: "md",
                  lineHeight: "prose",
                },
                "& li": {
                  marginBottom: "sm",
                },

                // 引用: prose 同等の measure / 行送り。
                "& blockquote": {
                  maxWidth: "prose",
                  marginRight: "auto",
                  marginLeft: "auto",
                  marginBottom: "md",
                  lineHeight: "prose",
                },

                // 定義リスト (GFM): RFC 04 の本文 measure に統一。
                "& dl": {
                  maxWidth: "prose",
                  marginRight: "auto",
                  marginLeft: "auto",
                  marginBottom: "md",
                  lineHeight: "prose",
                },

                // 画像注釈: figure 単位で中央寄せ measure に統一。
                "& figure": {
                  maxWidth: "prose",
                  marginRight: "auto",
                  marginLeft: "auto",
                  marginBottom: "md",
                },
                "& figcaption": {
                  fontSize: "sm",
                  color: "fg.secondary",
                  textAlign: "center",
                  marginTop: "xs",
                },

                // 区切り線 (GFM <hr>): prose と同じ幅で中央寄せ。
                "& hr": {
                  maxWidth: "prose",
                  marginRight: "auto",
                  marginLeft: "auto",
                  marginTop: "lg",
                  marginBottom: "lg",
                  border: "none",
                  borderTop: "1px solid",
                  borderColor: "bg.elevated",
                },

                // テーブル (GFM): max-width: prose で中央寄せしつつ、
                // 内容が広い場合は overflow-x: auto で横スクロールに退避する。
                // display: block にすることで max-width を効かせる
                // (既定の display: table では width 制約が効かない場合がある)。
                "& table": {
                  display: "block",
                  maxWidth: "prose",
                  marginRight: "auto",
                  marginLeft: "auto",
                  marginBottom: "md",
                  overflowX: "auto",
                  borderCollapse: "collapse",
                  fontSize: "sm-lg",
                  lineHeight: "relaxed",
                },
                "& th, & td": {
                  border: "1px solid",
                  borderColor: "bg.elevated",
                  padding: "xs sm-md",
                  textAlign: "left",
                },
                "& th": {
                  background: "bg.elevated",
                  fontWeight: "bold",
                },

                // リンク: prose の中で出てくるため明示。
                "& a": {
                  color: "accent.link",
                  textDecoration: "underline",
                  "&:hover": {
                    color: "accent.link",
                  },
                },

                // インラインコードの文字色は fg.code (Gruvbox 温存) を使用。
                // 強調色 (旧 orange.light) は本 R-2c で UI 用 token に集約するため、
                // ここはコードハイライトと整合する fg.code に揃える。
                // prose 制約から外す (固定幅を保ち折り返さない)。
                "& code": {
                  background: "bg.codeInline",
                  color: "fg.code",
                  padding: "2xs xs-sm",
                  borderRadius: "xs",
                  fontSize: "sm-lg",
                  lineHeight: "relaxed",
                },

                // コードブロック: max-width 制約を付けない (横スクロール許容)。
                "& pre": {
                  background: "bg.code",
                  color: "fg.code",
                  padding: "lg",
                  borderRadius: "sm",
                  overflow: "auto",
                  margin: "lg 0",
                  lineHeight: "relaxed",
                },

                // 画像: 親要素いっぱいに広げる (figure 内なら prose に従う)。
                "& img": {
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "sm",
                  margin: "md 0",
                  display: "block",
                  cursor: "zoom-in",
                },
              })}
            >
              <div
                // biome-ignore lint/security/noDangerouslySetInnerHtml: MarkdownをHTMLとして表示するために必要。DOMPurifyでサニタイズ済み
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(post.content, {
                    ADD_TAGS: ["button"],
                    ADD_ATTR: ["data-code"],
                  }),
                }}
              />
            </div>
          </article>
          <ImageLightbox
            isOpen={isOpen}
            imageSrc={imageSrc}
            imageAlt={imageAlt}
            onClose={close}
          />
          <PostNavigation olderPost={olderPost} newerPost={newerPost} />
        </div>
      </div>
    </>
  );
};
