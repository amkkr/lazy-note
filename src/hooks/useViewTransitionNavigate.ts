import { useCallback } from "react";
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
        navigate(to, options);
      });
    },
    [navigate],
  );
};
