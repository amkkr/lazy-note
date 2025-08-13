import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

/**
 * 投稿一覧を取得するミドルウェアを作成
 * @returns Viteサーバーミドルウェア関数
 */
export const createPostsMiddleware = () => {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method === "GET") {
      const datasourcesPath = path.join(process.cwd(), "datasources");

      try {
        const files = fs
          .readdirSync(datasourcesPath)
          .filter((file: string) => file.endsWith(".md"))
          .map((file: string) => file.replace(".md", ""));

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(files));
      } catch (_error) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            error: "Failed to read datasources directory",
          }),
        );
      }
    } else {
      next();
    }
  };
};
