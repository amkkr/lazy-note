import { type CSSProperties, useRef } from "react";
import { css } from "../../../styled-system/css";
import { useCodeBlockCopy } from "../../hooks/useCodeBlockCopy";
import { useImageLightbox } from "../../hooks/useImageLightbox";
import { inferPublishedAt, type Milestone } from "../../lib/anchors";
import type { Post, PostSummary } from "../../lib/markdown";
import { sanitizePostHtml } from "../../lib/sanitize";
import { buildPostHeroTransitionName } from "../../lib/viewTransition";
import { Link } from "../atoms/Link";
import { Heading1 } from "../atoms/Typography";
import { Coordinate } from "../common/Coordinate";
import { ImageLightbox } from "../common/ImageLightbox";
import { MetaInfo } from "../common/MetaInfo";
import { PostNavigation } from "../common/PostNavigation";
import { TableOfContents } from "../common/TableOfContents";

interface PostDetailPageProps {
  post: Post;
  olderPost: PostSummary | null;
  newerPost: PostSummary | null;
  /**
   * Coordinate (Issue #491 / Anchor の3つの顔のひとつ「座標」) 用節目データ。
   *
   * 親 (`pages/posts/Post.tsx`) で `datasources/milestones.json` を JSON
   * import して渡す。本コンポーネントは `inferPublishedAt(post.id)` で
   * publishedAt を逆算し、Coordinate に渡す純粋な中継を行う。
   *
   * 既定 (省略) では空配列扱いで Coordinate は描画されない (= 既存テスト互換)。
   */
  milestones?: readonly Milestone[];
  /**
   * Coordinate の表示 OFF フラグ (撤退可能性 / epic #487)。
   *
   * Anchor 企画は「いつでも黙らせられる」設計要件。Resurface と同じ命名
   * (`show*` 親側変数 + 子側 `show` prop) で揃える。既定 true。
   */
  showCoordinate?: boolean;
}

export const PostDetailPage = ({
  post,
  olderPost,
  newerPost,
  milestones,
  showCoordinate = true,
}: PostDetailPageProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  useCodeBlockCopy(contentRef);
  const { isOpen, imageSrc, imageAlt, close } = useImageLightbox(contentRef);

  // Hero morph (Issue #397): 記事詳細の H1 に `view-transition-name: post-{id}`
  // を付与する。HomePage 側の Featured / Bento / Index タイトルと同じ name に
  // することで、SPA 遷移時にブラウザが H1 へ morph する。VT 未対応 / reduced
  // motion 時はこの style があってもアニメーションは発火しない (CSS 側の
  // メディアクエリで disable される)。
  const heroNameStyle: CSSProperties = {
    viewTransitionName: buildPostHeroTransitionName(String(post.id)),
  };

  // Coordinate (Issue #491): post.id (= ファイル名 YYYYMMDDhhmmss) から
  // publishedAt を ISO 8601 (JST +09:00) として逆算する。タイムスタンプ形式に
  // 適合しない id (例: テスト用 "test-post") の場合は null となり、Coordinate
  // は何も描画しない (= 撤退可能性の一形態として無害な早期 return が成立する)。
  const publishedAt = inferPublishedAt(post.id);
  return (
    <>
      {/* Navigation */}
      <nav
        aria-label="ページナビゲーション"
        data-token-border="border.subtle"
        className={css({
          background: "bg.surface",
          borderBottom: "1px solid",
          // Issue #409: border 専用 token に置換 (R-2b の bg.elevated 反転は
          // light で外側 bg.canvas と同色化する制約があったため、1.4.11 3:1 を
          // 確保できる border.subtle に統一)。
          borderColor: "border.subtle",
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
          {/*
           * article の border (Issue #409 で border.subtle に置換):
           * - 親 wrapper bg.canvas (light: cream-50) 上に article bg.surface
           *   (light: cream-100) を乗せている。
           * - 旧実装は border に bg.elevated を流用していたが、light では
           *   bg.canvas (cream-50) と bg.elevated (cream-50) が同値で 1.0:1 の
           *   完全消失となっていた。
           * - border.subtle は border 専用色で、light は cream-300、dark は
           *   sumi-450 (Issue #423 で sumi-400 から変更)。1.4.11 (Non-text
           *   Contrast) の 3:1 を bg.canvas / bg.surface 上で満たす
           *   (light: 3.29-3.49:1 / dark: 3.29-6.18:1)。
           */}
          <article
            data-token-border="border.subtle"
            className={css({
              background: "bg.surface",
              borderRadius: "lg",
              overflow: "hidden",
              boxShadow: "card-hover",
              border: "1px solid",
              borderColor: "border.subtle",
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
                style={heroNameStyle}
              >
                {post.title || "無題の記事"}
              </Heading1>

              <MetaInfo
                createdAt={post.createdAt}
                author={post.author}
                variant="header"
              />
              {/*
               * Coordinate (Issue #491 / Anchor の3つの顔のひとつ「座標」):
               * MetaInfo (公開日 / 著者) の直下に「{label} から N 日目」を
               * 静かに一行で添える。publishedAt 推定不可・座標 0 件・
               * milestones 空・showCoordinate=false のいずれかで何も描画
               * しない (Coordinate 内部で early return)。
               */}
              {publishedAt !== null && (
                <Coordinate
                  publishedAt={publishedAt}
                  milestones={milestones ?? []}
                  show={showCoordinate}
                />
              )}
            </header>

            {/* Divider
             *
             * Issue #458: 旧実装は bg.elevated を background に流用していたが、
             * light テーマでは bg.surface (cream-100) と bg.elevated (cream-50)
             * の差が 1.06:1 と薄く、視覚的にほぼ消失していた。
             * border.subtle (border 専用色) で borderTop を引くことで、
             * bg.surface 上に 3.29:1 (light) / 3.29:1 (dark) のコントラストを
             * 確保し WCAG 1.4.11 (3:1) を満たす static divider にする。
             * 関連: article 全体の border / nav の borderBottom と同一 token。
             */}
            {/* Issue #477: divider は border.subtle token を borderTop に参照する
             * だけのため、PR #474 (Issue #422) で導入された `data-divider` ではなく
             * 他の border 参照箇所と同じ `data-token-border` 命名に統一する
             * (token 参照属性の命名一本化)。
             */}
            <div
              data-token-border="border.subtle"
              className={css({
                borderTop: "1px solid",
                borderColor: "border.subtle",
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
            {/*
             * Issue #391: 本文要素 (p / h1-h3 / ul / ol / blockquote / dl /
             * figure / table / hr) に prose レイアウト制約 (max-width prose +
             * margin auto + line-height prose、table は overflow-x auto) を
             * 適用する本文コンテナ。
             *
             * Issue #480: Tripwire テストは旧来この div の className に Panda が
             * 生成する arbitrary selector (`[&_p]:max-w_prose` 等) が含まれるか
             * を `toContain` で検証していたが、`hash: true` で class 名が hash
             * 化されると破綻する。PR #474 の Option A に倣い、本文コンテナで
             * あることを `data-prose-scope` 意味属性で宣言し、テストは
             * `toHaveAttribute` で検証する。
             */}
            <div
              ref={contentRef}
              data-prose-scope="article-content"
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
                // Issue #409 で border 専用 token (border.subtle) に置換。
                // bg.surface 上に置かれるため 3.29:1 (light) / 3.29:1 (dark) で 1.4.11 PASS。
                "& hr": {
                  maxWidth: "prose",
                  marginRight: "auto",
                  marginLeft: "auto",
                  marginTop: "lg",
                  marginBottom: "lg",
                  border: "none",
                  borderTop: "1px solid",
                  borderColor: "border.subtle",
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
                // Issue #409: th/td の罫線も border.subtle に置換。
                // td 部分 (bg.surface 上) は 1.4.11 PASS。th 部分は背景 bg.elevated
                // 上で 3:1 未達となるが、これは th 自身の "面の差" として表現する
                // 仕様で旧実装 (bg.elevated 同値で 1.0:1) より状態悪化はしない。
                "& th, & td": {
                  border: "1px solid",
                  borderColor: "border.subtle",
                  padding: "xs sm-md",
                  textAlign: "left",
                },
                "& th": {
                  background: "bg.elevated",
                  fontWeight: "bold",
                },

                // リンク: 本文インラインリンクは常時 underline (R-5 / Issue #393 AC (ii))。
                // - WCAG 1.4.1 (Use of Color) 補強。色覚多様性配慮で色だけに依存しない。
                // - Header / Footer / カード等のナビは下線なし (Link variant 側で制御)。
                // - hover 時は色相を保ったまま下線の太さ感を強調する (text-underline-offset)。
                "& a": {
                  color: "accent.link",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
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
                // biome-ignore lint/security/noDangerouslySetInnerHtml: MarkdownをHTMLとして表示するために必要。sanitizePostHtml (DOMPurify) でサニタイズ済み
                dangerouslySetInnerHTML={{
                  __html: sanitizePostHtml(post.content),
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
