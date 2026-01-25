import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { extractSummaryFromContent } from "../lib/markdownParser";

/**
 * 投稿APIミドルウェアを作成
 * - GET /api/posts: 投稿一覧（メタデータ付き）を取得
 * - GET /api/posts/:id: 個別投稿を取得
 * @returns Viteサーバーミドルウェア関数
 */
export const createPostsMiddleware = () => {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== "GET") {
      next();
      return;
    }

    const datasourcesPath = path.join(process.cwd(), "datasources");

    // URLから投稿IDを抽出（/api/posts/20250101 -> 20250101）
    const urlPath = req.url || "";
    const postId = urlPath.replace(/^\//, "").replace(/\.md$/, "");

    // 個別投稿の取得
    if (postId) {
      const filePath = path.join(datasourcesPath, `${postId}.md`);

      try {
        const content = fs.readFileSync(filePath, "utf8");
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(content);
      } catch (_error) {
        res.statusCode = 404;
        res.end("Post not found");
      }
    } else {
      // 投稿一覧の取得（メタデータ付き）
      try {
        const files = fs
          .readdirSync(datasourcesPath)
          .filter((file: string) => file.endsWith(".md"));

        const posts = files.map((file: string) => {
          const timestamp = file.replace(".md", "");
          const filePath = path.join(datasourcesPath, file);
          const content = fs.readFileSync(filePath, "utf8");
          return extractSummaryFromContent(content, timestamp);
        });

        // IDで降順ソート（新しい投稿が先）
        posts.sort((a, b) => b.id.localeCompare(a.id));

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(posts));
      } catch (_error) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            error: "Failed to read datasources directory",
          }),
        );
      }
    }
  };
};
