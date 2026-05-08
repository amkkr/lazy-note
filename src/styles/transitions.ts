import { css } from "../../styled-system/css";

/**
 * R-5 (Issue #393) で WCAG 2.3.3 (Animation from Interactions) と
 * 2.2.2 (Pause, Stop, Hide) に対応するため、ユーザーの
 * `prefers-reduced-motion: reduce` 設定時には transition と transform を
 * 無効化する。
 *
 * - Panda CSS の `_motionReduce` 条件 (CSS @media (prefers-reduced-motion: reduce))
 *   を介して transition / transform を `none` に上書きする。
 * - フェードインの最終状態 (opacity 1) は維持するため、enter/enterTo の
 *   表示状態は壊さず、初期 enterFrom の transform / opacity を打ち消すことで
 *   「動かないが正しい最終状態」になるよう設計している。
 */

/** ページ表示時のフェードイン: enter */
export const fadeInEnter = css({
  transition: "all 0.3s ease",
  _motionReduce: {
    transition: "none",
  },
});

/** ページ表示時のフェードイン: enterFrom（初期状態） */
export const fadeInEnterFrom = css({
  opacity: 0,
  transform: "translateY(8px)",
  _motionReduce: {
    // reduce 時は初期状態でも最終状態と同じ位置に置き、
    // CLS や瞬間的な位置ジャンプ感を出さない。
    opacity: 1,
    transform: "translateY(0)",
  },
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
