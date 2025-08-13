import { createPostsMiddleware } from "./posts";
import { createDatasourcesMiddleware } from "./datasources";
import type { ViteDevServer } from "vite";

/**
 * APIミドルウェアをViteサーバーに登録
 * @param server Vite開発サーバーインスタンス
 */
export const registerApiMiddlewares = (server: ViteDevServer) => {
  // 投稿一覧API
  server.middlewares.use("/api/posts", createPostsMiddleware());

  // データソースファイル取得API
  server.middlewares.use("/datasources", createDatasourcesMiddleware());
};

export { createPostsMiddleware, createDatasourcesMiddleware };