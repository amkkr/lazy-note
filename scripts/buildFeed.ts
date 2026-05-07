#!/usr/bin/env node

/**
 * RSS 2.0 形式の feed.xml を `dist/feed.xml` に出力する CLI
 *
 * 設計: docs/rfc/editorial-citrus/08-roadmap.md (Ext-2)
 *
 * - `datasources/*.md` を全件読み、`status === "published"` のみを含む
 * - サイト URL は `SITE_URL` 環境変数で上書き可能
 * - 出力先は dist/feed.xml で固定（ビルド成果物に同梱）
 *
 * 使い方:
 *   node scripts/buildFeed.ts
 *   pnpm build:feed
 */

import fs from "node:fs";
import path from "node:path";
import { collectPublishedPosts } from "./lib/collectPosts.ts";
import { renderFeed } from "./lib/renderFeed.ts";

const OUTPUT_DIR = path.resolve(process.cwd(), "dist");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "feed.xml");

const main = (): void => {
  const posts = collectPublishedPosts();
  const xml = renderFeed(posts);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, xml, "utf8");

  console.log(
    `✅ feed.xml を生成しました: ${OUTPUT_FILE} (${posts.length} 記事)`,
  );
};

try {
  main();
} catch (error) {
  console.error("❌ feed.xml の生成中にエラーが発生しました:");
  console.error((error as Error).message);
  process.exit(1);
}
