import { css } from "../../../styled-system/css";
import { Link } from "../atoms/Link";
import { BrandName } from "../common/BrandName";

/**
 * `/anchor` (個人史座標ページ) への入口リンク文言 / 遷移先 (Issue #839)。
 *
 * 「サイトの読み方」= 読者を個人史タイムライン (`/anchor`) へ静かに誘導する
 * Calm な導線。ナビ統合により `/anchor` は「運営者向けの補助ページ」から
 * 「読者導線」へ性質が変わる (詳細は docs/ANCHOR.md #545 節)。
 *
 * - アクセシブル名 (= リンクテキスト) は Pulse 思想の禁則語彙
 *   (`src/test/forbiddenVocab.ts`) に該当してはならず、`Footer.test.tsx` で
 *   非該当を担保する。
 * - `Link` atom の `variant="navigation"` (下線なし・`accent.link`) を使う。
 *   `accent.link` は Footer の `bg.surface` 上で WCAG 1.4.3 AA を満たす
 *   (light 7.38:1 AAA / dark 4.69:1 AA。検証は scripts/calculateContrast.ts)。
 */
const ANCHOR_NAV_LABEL = "サイトの読み方";
const ANCHOR_PATH = "/anchor";

export const Footer = () => {
  return (
    <footer
      className={css({
        background: "bg.surface",
        color: "fg.secondary",
        padding: "md",
        minHeight: "header",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        md: {
          padding: "content",
        },
      })}
    >
      <div
        className={css({
          fontSize: "sm",
          fontWeight: "600",
          marginBottom: "xs",
          color: "fg.secondary",
        })}
      >
        <BrandName variant="footer" />
      </div>
      {/*
       * /anchor への入口リンク (Issue #839)。BrandName 近傍に補助情報トーンで
       * 自然に置き、読者を個人史タイムラインへ誘導する。navigation variant の
       * 下線なし・accent.link で「主導線ではない補助ナビ」の控えめさを保つ。
       */}
      <div
        className={css({
          marginBottom: "xs",
        })}
      >
        <Link to={ANCHOR_PATH} variant="navigation">
          {ANCHOR_NAV_LABEL}
        </Link>
      </div>
      {/*
       * 著作権表記は補助情報のため fg.muted を採用。Footer の bg.surface 上に
       * 置かれる前提で WCAG 1.4.3 AA (4.5:1) を満たす (実測 light 6.17:1 /
       * dark 7.91:1。light は AAA 7:1 未達のため補助情報専用で本文転用は不可。
       * 検証は colorTokens.test.ts §"Issue #537")。
       */}
      <div
        className={css({
          color: "fg.muted",
          fontSize: "xs",
        })}
      >
        © 2025 Lazy Note. All rights reserved.
      </div>
    </footer>
  );
};
