#!/usr/bin/env node

/**
 * クライアント側全文検索のインデックスを生成するスクリプト
 *
 * - `datasources/*.md` を走査
 * - `## メタ` セクションが存在する場合は `parseMetaSection` でパースし、
 *   `status: "published"` の記事のみインデックスに含める
 * - `## メタ` が無い場合は既定値 (`status: "published"`) として扱う (C1 互換)
 * - id / title / excerpt / tags / publishedAt を含む JSON を出力
 * - 出力先: `public/search-index.json`（dev / prod 双方で `<base>/search-index.json` として配信される）
 * - サイズ < 100KB を超える場合はエラーで停止
 *
 * 設計書: docs/rfc/editorial-citrus/08-roadmap.md (Ext-3)
 */
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildSearchEntry,
  type SearchIndexEntry,
  sortEntriesByPublishedAtDesc,
} from "../src/lib/searchIndexBuilder.ts";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);

/**
 * インデックス出力先（プロジェクトルートからの相対）
 */
const OUTPUT_REL_PATH = "public/search-index.json";

/**
 * インデックスサイズの上限 (バイト)。Ext-3 AC: < 100KB
 */
const MAX_INDEX_BYTES = 100 * 1024;

/**
 * datasources/ 配下の Markdown を走査し、SearchIndexEntry 配列を構築する
 */
const buildIndex = (datasourcesDir: string): SearchIndexEntry[] => {
  const files = readdirSync(datasourcesDir).filter((file) =>
    file.endsWith(".md"),
  );
  const entries: SearchIndexEntry[] = [];
  for (const file of files) {
    const filePath = join(datasourcesDir, file);
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      continue;
    }
    const content = readFileSync(filePath, "utf8");
    const entry = buildSearchEntry(content, file);
    if (entry !== null) {
      entries.push(entry);
    }
  }
  return sortEntriesByPublishedAtDesc(entries);
};

const main = (): void => {
  const projectRoot = join(currentDir, "..");
  const datasourcesDir = join(projectRoot, "datasources");
  const outputPath = join(projectRoot, OUTPUT_REL_PATH);

  const entries = buildIndex(datasourcesDir);
  const json = JSON.stringify(entries);
  const sizeBytes = Buffer.byteLength(json, "utf8");

  if (sizeBytes > MAX_INDEX_BYTES) {
    console.error(
      `[search-index] ERROR: インデックスサイズ ${sizeBytes} bytes が上限 ${MAX_INDEX_BYTES} bytes を超えました`,
    );
    console.error(
      "対策: excerpt の最大文字数を削るか、本文を含めない構成に切り替えてください",
    );
    process.exit(1);
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, json, "utf8");

  const sizeKb = (sizeBytes / 1024).toFixed(2);
  console.log(`[search-index] 生成完了: ${entries.length} 件 / ${sizeKb} KB`);
  console.log(`[search-index] 出力先: ${outputPath}`);
};

main();
