import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { extractSummaryFromContent } from "../lib/markdownParser";

/**
 * Biome 厳格化耐性メモ (Issue #652 / PR #623 follow-up)
 *
 * 本ファイルは `maxAllowedComplexity:8` 厳格化条件下でも違反 0 になるよう、
 * ミドルウェア本体を「単一投稿配信 (`servePostDetail`) / 投稿一覧配信
 * (`servePostList`)」の 2 ヘルパーに分割している。再現手順:
 *   1. `biome.jsonc` の `noExcessiveCognitiveComplexity` の `maxAllowedComplexity`
 *      を 8 に下げる
 *   2. `pnpm exec biome lint src/api/posts.ts` で違反 0 を確認
 *   3. `pnpm test:run` で既存テスト全 pass を確認
 *
 * 公開 API シグネチャ (`createPostsMiddleware` の戻り値型) は不変。
 */

/**
 * 個別投稿 (`/api/posts/:id`) を配信するヘルパー。
 *
 * - パストラバーサル攻撃を防止するため、resolve 後のパスが datasources 配下に
 *   収まることを確認する
 * - ファイルが存在しない場合は 404、それ以外の例外でも 404 を返す
 */
const servePostDetail = (
  res: ServerResponse,
  datasourcesPath: string,
  postId: string,
): void => {
  const filePath = path.join(datasourcesPath, `${postId}.md`);

  // パストラバーサル攻撃を防止
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(datasourcesPath))) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(content);
  } catch (_error) {
    res.statusCode = 404;
    res.end("Post not found");
  }
};

/**
 * 投稿一覧 (`/api/posts`) を配信するヘルパー。
 *
 * - datasources 配下から `.md` ファイルを列挙し、メタデータを `extractSummaryFromContent`
 *   で抽出する
 * - 投稿は id (= タイムスタンプ文字列) の降順 (新→古) でソートする
 * - 読み込み失敗時は 500 を返す
 */
const servePostList = (
  res: ServerResponse,
  datasourcesPath: string,
): void => {
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
};

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

    if (postId) {
      servePostDetail(res, datasourcesPath, postId);
      return;
    }
    servePostList(res, datasourcesPath);
  };
};
