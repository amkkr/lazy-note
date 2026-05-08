import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/common/ScrollToTop";
import IndexPage from "./pages/index";
import PostPage from "./pages/posts/Post";
import "./index.css";

/*
 * View Transitions Hero morph (Issue #397) の前提として、
 * IndexPage / PostPage を eager import に切替。
 *
 * - lazy() + Suspense fallback による動的読込だと、navigate 直後の new DOM が
 *   <Suspense fallback> の状態 (Loading...) で snapshot されてしまい、
 *   `view-transition-name: post-{id}` を持つ H1 が DOM に存在しない →
 *   ブラウザは morph 対象を見つけられず graceful に root cross-fade に degrade する。
 * - eager import により Suspense fallback が出ず、navigate + flushSync 完了
 *   時点で新 H1 が確実に DOM に存在し、Hero morph が成立する。
 * - 反面、初期 main bundle に PostPage 分のコード (markdown parser / DOMPurify
 *   等) が常時含まれる。Editorial Bento で main bundle はすでに大きいため、
 *   増分は許容範囲と判断。code splitting を再導入する場合は、prefetch 戦略
 *   または skeleton 内 hero target 仕込みなど別 PR で対応する。
 */
const App = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/posts/:timestamp" element={<PostPage />} />
      </Routes>
    </>
  );
};

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element not found");
}
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
