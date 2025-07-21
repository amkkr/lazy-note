import React from "react";
import { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";

const IndexPage = lazy(() => import("./pages/index"));
const PostDetailPage = lazy(() => import("./pages/posts/[timestamp]"));

const App = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/posts/:timestamp" element={<PostDetailPage />} />
      </Routes>
    </Suspense>
  );
};

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element not found");
}
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
