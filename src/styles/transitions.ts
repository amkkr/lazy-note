import { css } from "../../styled-system/css";

/** ページ表示時のフェードイン: enter */
export const fadeInEnter = css({ transition: "all 0.3s ease" });

/** ページ表示時のフェードイン: enterFrom（初期状態） */
export const fadeInEnterFrom = css({
  opacity: 0,
  transform: "translateY(8px)",
});

/** ページ表示時のフェードイン: enterTo（最終状態） */
export const fadeInEnterTo = css({ opacity: 1, transform: "translateY(0)" });

/**
 * View Transitions API (Hero morph) 用の `view-transition-name` を
 * 記事 ID から生成するヘルパー (Issue #397)。
 *
 * Featured / Bento / IndexRow の各タイトルと、記事詳細の H1 に同じ name を
 * 付与することで、SPA 遷移時にブラウザが該当要素を morph する。
 *
 * 実体は `src/lib/viewTransition.ts` で定義された `buildPostHeroTransitionName`
 * を再エクスポート (atoms 側からは `styles/transitions` を経由してスタイル関連
 * ユーティリティとして取得できるよう統一)。
 *
 * 関連 CSS は `src/index.css` の `::view-transition-old(root)` /
 * `::view-transition-new(root)` ルールおよび `prefers-reduced-motion` 対応で
 * 定義されている。Panda CSS の css() は `@view-transition` / `::view-transition-*`
 * 疑似要素を直接扱えないため、生 CSS で定義する形に集約している。
 */
export { buildPostHeroTransitionName } from "../lib/viewTransition";
