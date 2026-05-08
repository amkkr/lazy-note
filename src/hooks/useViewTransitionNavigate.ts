import { useCallback } from "react";
import { flushSync } from "react-dom";
import { type NavigateOptions, type To, useNavigate } from "react-router-dom";
import { startViewTransition } from "../lib/viewTransition";

/**
 * View Transition 付きの `navigate` 関数を返す型。
 *
 * - 第 1 引数 to: 遷移先 (path / location object)
 * - 第 2 引数 options: react-router-dom の `useNavigate` と同じ NavigateOptions
 */
type ViewTransitionNavigate = (to: To, options?: NavigateOptions) => void;

/**
 * SPA 内ナビゲートを `document.startViewTransition` でラップした
 * `navigate` 関数を返すフック。
 *
 * 設計方針:
 * - react-router-dom v7 には `viewTransition?: boolean` オプションが組み込まれて
 *   いるが、prefers-reduced-motion 検出と未対応ブラウザの graceful degrade を
 *   一元管理するために本フック経由に統一する (Issue #397 の AC iv / v)。
 * - VT API 未対応 / reduced-motion の場合は通常の navigate にフォールバック
 *   (`startViewTransition` ラッパー側で callback を即時実行する)。
 * - 連続クリック時は VT API のブラウザ実装側で先行 transition が skip されるため、
 *   本フックでは追加の throttling は行わない (フラッシュなしで安定する)。
 *
 * flushSync の必要性 (DA 致命 2 対応):
 * - React 19 + React Router の navigate は通常非同期で reconcile される。
 * - View Transitions API は callback 完了直後に「新 DOM」の snapshot を取るため、
 *   非同期 reconcile では callback 完了時点で新 DOM (post-{id} の
 *   view-transition-name 要素) がまだ未描画 → morph 不成立となる。
 * - flushSync で navigate に伴う setState を同期 reconcile し、callback 完了
 *   時点で新 DOM が描画されている状態を保証する。
 *
 * 使い方:
 *   const navigate = useViewTransitionNavigate();
 *   const handleClick = (e) => {
 *     e.preventDefault();
 *     navigate(`/posts/${post.id}`);
 *   };
 */
export const useViewTransitionNavigate = (): ViewTransitionNavigate => {
  const navigate = useNavigate();

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      startViewTransition(() => {
        flushSync(() => {
          navigate(to, options);
        });
      });
    },
    [navigate],
  );
};
