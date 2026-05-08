/**
 * View Transitions API ラッパー (Issue #397 / Hero morph)
 *
 * 「ページ遷移」を「記事に入っていく感覚」に変えるための SPA 内 View Transition。
 * 主に Editorial Bento の Featured / Bento カードのタイトルを記事詳細の H1 に
 * morph させる用途で使用する。
 *
 * 設計方針:
 * - ブラウザが View Transitions API 未対応の場合は callback を即時実行 (Safari
 *   17.0 以前など)。これにより graceful degrade で記事遷移自体は問題なく動作する。
 * - prefers-reduced-motion: reduce が指定されている場合も VT を無効化し、
 *   即時実行に切り替える。視覚モーション過敏のユーザを保護。
 * - SSR / 非ブラウザ環境 (Vitest jsdom 等) でも document が undefined の可能性を
 *   考慮し、typeof document でガード。
 * - View Transitions API の TS 型は標準ライブラリにまだ収録されていないため、
 *   呼び出し時に biome-ignore で any アクセスを限定的に許可する。
 *
 * 使い方:
 *   startViewTransition(() => {
 *     navigate("/posts/123");
 *   });
 */

/**
 * View Transition を開始する関数の型。
 *
 * - callback: ナビゲーションや DOM 更新など、VT 中に実行する処理。
 *             非同期 (Promise) の場合は resolve まで VT が継続する。
 */
type StartViewTransitionFn = (callback: () => void | Promise<void>) => void;

/**
 * `document.startViewTransition` が利用可能か判定する。
 *
 * - SSR / Node 環境では document が undefined のため false を返す。
 * - Safari 17 以前など View Transitions API 未対応ブラウザでは
 *   "startViewTransition" プロパティが document に存在せず false を返す。
 *
 * @returns API が呼び出し可能な環境であれば true
 */
const isViewTransitionSupported = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }
  return "startViewTransition" in document;
};

/**
 * `prefers-reduced-motion: reduce` が指定されているか判定する。
 *
 * - SSR / Node 環境では window が undefined のため false を返す。
 * - matchMedia 自体が存在しない (古いブラウザ等) 場合も false を返す
 *   (アニメーション続行扱い: 視覚的に moderate motion のため)。
 *
 * @returns ユーザがモーション低減を要求している場合 true
 */
const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * SPA 内 View Transition を開始する。
 *
 * - View Transitions API 未対応 / prefers-reduced-motion: reduce の場合は
 *   callback を即時実行 (graceful degrade)。これにより呼び出し側は分岐を
 *   気にせず常にこの関数を経由できる。
 * - 連続発火時は最新の transition が優先される (View Transitions API の標準
 *   挙動でブラウザ側が先行 transition を skip する。本ラッパーで追加処理は不要)。
 * - 二重発火による中断時のフラッシュを避けるため、callback はそのまま委譲する
 *   (ラッパー側で skip / queue は実装しない)。
 *
 * @param callback VT 中に実行する処理 (DOM 更新やナビゲートなど)
 */
export const startViewTransition: StartViewTransitionFn = (callback) => {
  if (!isViewTransitionSupported()) {
    callback();
    return;
  }

  if (prefersReducedMotion()) {
    callback();
    return;
  }

  // View Transitions API の型は TS 標準ライブラリ (lib.dom.d.ts) に未収録のため、
  // ここでのみ biome-ignore で any アクセスを許可する。プロダクションコードでの
  // any 使用は本ファイルの本箇所に限定し、他には拡散させない。
  // biome-ignore lint/suspicious/noExplicitAny: View Transitions API の型は TS 標準ライブラリに未収録
  (document as any).startViewTransition(callback);
};

/**
 * `view-transition-name` を生成するヘルパー。
 *
 * 記事 ID から Featured / Bento / Detail 共通の name を返すため、付与側と
 * 受け取り側で同じ規則で生成できる。記事 ID が UUID-like / timestamp などの
 * 場合でも CSS ident として使える形式 ("post-" prefix + 数値/文字列) に統一する。
 *
 * 注意: view-transition-name は CSS の ident-token (識別子) なので、ID に
 * 数値や記号が含まれる場合は CSS でもそのまま受け入れられる範囲に絞る。
 * 本プロジェクトの記事 ID は timestamp (例: 20240101) なので "post-20240101"
 * のような形となり、CSS 規則に違反しない。
 *
 * @param postId 記事の ID (PostSummary.id)
 * @returns view-transition-name に使う文字列
 */
export const buildPostHeroTransitionName = (postId: string): string => {
  return `post-${postId}`;
};
