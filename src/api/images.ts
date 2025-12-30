import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/**
 * 画像配信ミドルウェアを作成
 * - GET /datasources/images/:filename: 画像ファイルを取得
 * @returns Viteサーバーミドルウェア関数
 */
export const createImagesMiddleware = () => {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method !== "GET") {
      next();
      return;
    }

    const urlPath = req.url || "";
    const filename = urlPath.replace(/^\//, "");

    if (!filename) {
      next();
      return;
    }

    const ext = path.extname(filename).toLowerCase();
    if (!IMAGE_EXTENSIONS.includes(ext)) {
      next();
      return;
    }

    const imagesPath = path.join(process.cwd(), "datasources", "images");
    const filePath = path.join(imagesPath, filename);

    // パストラバーサル攻撃を防止
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(imagesPath))) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    try {
      const content = fs.readFileSync(filePath);
      const mimeType = MIME_TYPES[ext] || "application/octet-stream";
      res.setHeader("Content-Type", mimeType);
      res.end(content);
    } catch (_error) {
      res.statusCode = 404;
      res.end("Image not found");
    }
  };
};

export { IMAGE_EXTENSIONS };
