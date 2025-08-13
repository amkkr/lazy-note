import type { ViteDevServer } from "vite";
import { createPostsMiddleware } from "./posts";

/**
 * APIミドルウェアをViteサーバーに登録
 * @param server Vite開発サーバーインスタンス
 */
export const registerApiMiddlewares = (server: ViteDevServer) => {
  // 投稿API（一覧と個別取得の両方を処理）
  server.middlewares.use("/api/posts", createPostsMiddleware());
};

export { createPostsMiddleware };
