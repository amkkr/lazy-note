import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectPublishedPosts } from "../collectPosts.ts";

/**
 * テスト用に一時的な datasources ディレクトリを作り、複数記事を書き込んだ上で
 * collectPublishedPosts の挙動を検証する。
 */
describe("collectPublishedPosts", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lazy-note-collect-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const writePost = (fileName: string, body: string): void => {
    fs.writeFileSync(path.join(tempDir, fileName), body, "utf8");
  };

  it("メタセクションが無い既存形式の記事を published として取り込める", () => {
    writePost(
      "20250101120000.md",
      [
        "# 既存記事",
        "",
        "## 投稿日時",
        "- 2025-01-01 12:00",
        "",
        "## 本文",
        "本文サンプル",
      ].join("\n"),
    );

    const posts = collectPublishedPosts(tempDir);

    expect(posts).toHaveLength(1);
    expect(posts[0]?.id).toBe("20250101120000");
    expect(posts[0]?.title).toBe("既存記事");
    expect(posts[0]?.meta.status).toBe("published");
  });

  it("draft 記事を結果から除外できる", () => {
    writePost(
      "20250101120000.md",
      [
        "# Draft",
        "",
        "## メタ",
        "- status: draft",
        "",
        "## 本文",
        "草稿",
      ].join("\n"),
    );
    writePost(
      "20250102120000.md",
      [
        "# Published",
        "",
        "## メタ",
        "- status: published",
        "",
        "## 本文",
        "公開",
      ].join("\n"),
    );

    const posts = collectPublishedPosts(tempDir);

    expect(posts).toHaveLength(1);
    expect(posts[0]?.id).toBe("20250102120000");
  });

  it("archived 記事も結果から除外できる", () => {
    writePost(
      "20250101120000.md",
      [
        "# Archived",
        "",
        "## メタ",
        "- status: archived",
        "",
        "## 本文",
        "古い記事",
      ].join("\n"),
    );

    const posts = collectPublishedPosts(tempDir);

    expect(posts).toHaveLength(0);
  });

  it("publishedAt の降順にソートされる", () => {
    writePost(
      "20250101120000.md",
      ["# 古い", "", "## 本文", "古い本文"].join("\n"),
    );
    writePost(
      "20250301120000.md",
      ["# 新しい", "", "## 本文", "新しい本文"].join("\n"),
    );
    writePost(
      "20250201120000.md",
      ["# 中間", "", "## 本文", "中間本文"].join("\n"),
    );

    const posts = collectPublishedPosts(tempDir);

    expect(posts.map((post) => post.id)).toEqual([
      "20250301120000",
      "20250201120000",
      "20250101120000",
    ]);
  });

  it(".md 以外のファイルは無視する", () => {
    writePost("README.txt", "not markdown");
    writePost(
      "20250101120000.md",
      ["# 記事", "", "## 本文", "本文"].join("\n"),
    );

    const posts = collectPublishedPosts(tempDir);

    expect(posts).toHaveLength(1);
    expect(posts[0]?.id).toBe("20250101120000");
  });

  it("メタセクションがパース失敗する場合は例外を伝搬する", () => {
    writePost(
      "20250101120000.md",
      [
        "# パースエラー",
        "",
        "## メタ",
        "- status: published",
        "- foo: bar",
        "",
        "## 本文",
        "本文",
      ].join("\n"),
    );

    expect(() => collectPublishedPosts(tempDir)).toThrow(/UNKNOWN_KEY/);
  });
});
