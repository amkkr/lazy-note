import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

/**
 * データソースファイルを取得するミドルウェアを作成
 * @returns Viteサーバーミドルウェア関数
 */
export const createDatasourcesMiddleware = () => {
  return (req: IncomingMessage, res: ServerResponse, _next: () => void) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }

    const filePath = path.join(process.cwd(), "datasources", req.url);

    try {
      const content = fs.readFileSync(filePath, "utf8");
      res.setHeader("Content-Type", "text/plain");
      res.end(content);
    } catch (_error) {
      res.statusCode = 404;
      res.end("File not found");
    }
  };
};
