import { memo } from "react";
import { css } from "../../../styled-system/css";
import type { PostSummary } from "../../lib/markdown";
import { Link } from "../atoms/Link";

// Issue #708: 前後ナビのラベルから矢印「←」「→」を分離し、JSX 側で
// `<span aria-hidden="true">{矢印}</span>` の装飾要素として描画する。
// 旧実装はラベルを JSX 直書きで `← 前の記事` / `次の記事 →` と連結していたが、
// 再評価トリガー3 (同種の「矢印 + テキスト」ラベルが 3 箇所以上発生) の充足に
// 伴い BackToTop / PostDetailPage と方針統一する。矢印を aria-hidden にする
// ことで SR のアクセシブル名から外れ、構造的な i18n / RTL 対応の土台になる
// (実際の `[dir=rtl]` 反転 CSS は RTL 要件発生時まで先送り = YAGNI)。
// 矢印は純粋な glyph のため BackToTop に倣い `ICON` ではなく `ARROW` と命名する。
const PREV_POST_ARROW = "←" as const;
const PREV_POST_LABEL = "前の記事" as const;
const NEXT_POST_ARROW = "→" as const;
const NEXT_POST_LABEL = "次の記事" as const;

interface PostNavigationProps {
  olderPost: PostSummary | null;
  newerPost: PostSummary | null;
}

// 親レイアウト (PostDetailPage) の bg.canvas 上に置かれる前後ナビの区切り線。
// Issue #409 で導入した border 専用 token (border.subtle) に置換 (Issue #419)。
// - 旧実装は bg.surface を使用していたが、light の bg.surface (cream-100) は
//   外側 bg.canvas (cream-50) との差が 1.06:1 で視覚消失していた。
// - border.subtle は WCAG 1.4.11 (Non-text Contrast) の 3:1 を満たす:
//   light: cream-300 × cream-50 (bg.canvas) = 3.49:1
//   dark : sumi-450  × sumi-950 (bg.canvas) = 6.18:1 (Issue #423 で sumi-400 から変更、Calm 思想と整合)
const navStyles = css({
  display: "flex",
  justifyContent: "space-between",
  gap: "md",
  marginTop: "xl",
  paddingTop: "xl",
  borderTop: "1px solid",
  borderColor: "border.subtle",
});

const linkContainerStyles = css({
  flex: "1",
  minWidth: "0",
});

const linkContainerRightStyles = css({
  textAlign: "right",
});

const labelStyles = css({
  display: "block",
  fontSize: "sm",
  // 「前/次の記事」ラベルは記事間の重要な誘導 UI のため fg.secondary を採用 (R-2b 修正)。
  // 当初 fg.muted (補助情報用) を当てていたが、devils-advocate レビュー (Q1) で
  // 「重要な誘導 UI に muted は弱すぎる」と指摘されたため fg.secondary に格上げ。
  // light: cream-50 上 9.59:1 AAA / dark: sumi-950 上 14.84:1 AAA を確保。
  color: "fg.secondary",
  marginBottom: "sm",
});

const titleStyles = css({
  display: "block",
  fontSize: "base",
  fontWeight: "600",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const PostNavigation = memo(
  ({ olderPost, newerPost }: PostNavigationProps) => {
    if (!olderPost && !newerPost) {
      return null;
    }

    return (
      <nav
        className={navStyles}
        aria-label="前後の記事"
        data-token-border="border.subtle"
      >
        <div className={linkContainerStyles}>
          {olderPost && (
            // viewTransition=true で記事 → 記事の遷移時にも Hero morph
            // (前/次記事タイトル → 詳細 H1) が動作する (Issue #397 / 推奨 6)。
            <Link
              to={`/posts/${olderPost.id}`}
              variant="card"
              viewTransition={true}
            >
              <span className={labelStyles}>
                {/* Issue #708: 矢印は aria-hidden な装飾要素として分離。
                    labelStyles は display:block で gap が無いため、矢印と
                    テキストの間隔は明示の半角スペース {" "} で従来の見た目を保つ。 */}
                <span aria-hidden="true">{PREV_POST_ARROW}</span>{" "}
                {PREV_POST_LABEL}
              </span>
              <span className={titleStyles}>{olderPost.title}</span>
            </Link>
          )}
        </div>
        <div className={`${linkContainerStyles} ${linkContainerRightStyles}`}>
          {newerPost && (
            <Link
              to={`/posts/${newerPost.id}`}
              variant="card"
              viewTransition={true}
            >
              <span className={labelStyles}>
                {/* Issue #708: 「次の記事」は末尾に矢印「→」を置く。
                    aria-hidden で SR から隠し、明示の半角スペース {" "} で
                    テキストと矢印の間隔を保つ。 */}
                {NEXT_POST_LABEL}{" "}
                <span aria-hidden="true">{NEXT_POST_ARROW}</span>
              </span>
              <span className={titleStyles}>{newerPost.title}</span>
            </Link>
          )}
        </div>
      </nav>
    );
  },
);

PostNavigation.displayName = "PostNavigation";
