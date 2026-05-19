import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";

/**
 * Biome 厳格化耐性メモ (Issue #652 / PR #623 follow-up)
 *
 * 本ファイルは `maxAllowedComplexity:8` 厳格化条件下でも違反 0 になるよう、
 * ミドルウェア本体を「正規化 (`resolveImageRequest`) → 配信 (`serveImageFile`)」
 * の 2 ヘルパーに分割している。再現手順:
 *   1. `biome.jsonc` の `noExcessiveCognitiveComplexity` の `maxAllowedComplexity`
 *      を 8 に下げる
 *   2. `pnpm exec biome lint src/api/images.ts` で違反 0 を確認
 *   3. `pnpm test:run` で既存テスト全 pass を確認
 *
 * 公開 API シグネチャ (`createImagesMiddleware` の戻り値型) は不変。
 */

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
 * 画像配信リクエストの解析結果。
 *
 * - `kind: "passthrough"` は次のミドルウェアへ委譲することを示す
 *   (GET 以外 / URL が空 / 画像拡張子でない、いずれかの理由でこの module 管轄外)
 * - `kind: "forbidden"` はパストラバーサル疑い (403 を返す)
 * - `kind: "serve"` は配信対象として確定したファイルの絶対パスと拡張子
 */
type ImageRequestResolution =
  | { readonly kind: "passthrough" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "serve"; readonly filePath: string; readonly ext: string };

/**
 * リクエストを解析し、画像配信ミドルウェアの分岐先 (passthrough / forbidden / serve)
 * を決定する純粋ヘルパー。
 *
 * ミドルウェア本体から条件分岐の cognitive complexity を引き剥がすために抽出。
 *
 * @param req - HTTP リクエスト (method / url のみを参照)
 * @returns 分岐先を示す ImageRequestResolution
 */
const resolveImageRequest = (
  req: IncomingMessage,
): ImageRequestResolution => {
  if (req.method !== "GET") {
    return { kind: "passthrough" };
  }

  const urlPath = req.url || "";
  const filename = urlPath.replace(/^\//, "");
  if (!filename) {
    return { kind: "passthrough" };
  }

  const ext = path.extname(filename).toLowerCase();
  if (!IMAGE_EXTENSIONS.includes(ext)) {
    return { kind: "passthrough" };
  }

  const imagesPath = path.join(process.cwd(), "datasources", "images");
  const filePath = path.join(imagesPath, filename);

  // パストラバーサル攻撃を防止
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(imagesPath))) {
    return { kind: "forbidden" };
  }

  return { kind: "serve", filePath, ext };
};

/**
 * 解決済みのファイルパスから画像を読み込み、レスポンスを返すヘルパー。
 *
 * ENOENT 等で読み込みに失敗した場合は 404 を返す (理由文字列は固定)。
 */
const serveImageFile = (
  res: ServerResponse,
  filePath: string,
  ext: string,
): void => {
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

/**
 * 画像配信ミドルウェアを作成
 * - GET /datasources/images/:filename: 画像ファイルを取得
 * @returns Viteサーバーミドルウェア関数
 */
export const createImagesMiddleware = () => {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const resolution = resolveImageRequest(req);
    if (resolution.kind === "passthrough") {
      next();
      return;
    }
    if (resolution.kind === "forbidden") {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }
    serveImageFile(res, resolution.filePath, resolution.ext);
  };
};

export { IMAGE_EXTENSIONS };
