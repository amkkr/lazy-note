import { describe, expect, it } from "vitest";
import {
  buildSearchEntry,
  sortEntriesByPublishedAtDesc,
} from "../searchIndexBuilder";

describe("buildSearchEntry", () => {
  it("メタが無い既存記事から published として SearchIndexEntry を作る", () => {
    const content = `# 既存記事のタイトル

## 投稿日時
- 2025-01-01 12:00

## 筆者名
- テスト

## 本文
これは本文の冒頭です。検索対象になります。
`;
    const entry = buildSearchEntry(content, "20250101120000.md");
    expect(entry).not.toBeNull();
    if (entry === null) {
      return;
    }
    expect(entry.id).toBe("20250101120000");
    expect(entry.title).toBe("既存記事のタイトル");
    expect(entry.excerpt).toContain("本文の冒頭");
    expect(entry.tags).toEqual([]);
    expect(entry.publishedAt).toBe("2025-01-01T12:00:00+09:00");
  });

  it("draftステータスの記事はnullを返す", () => {
    const content = `# 下書き記事

## メタ
- status: draft
- published_at: 2025-02-01T00:00:00+09:00

## 本文
公開してはいけない情報。
`;
    expect(buildSearchEntry(content, "20250201000000.md")).toBeNull();
  });

  it("archivedステータスの記事もnullを返す", () => {
    const content = `# アーカイブ済み

## メタ
- status: archived
- published_at: 2024-01-01T00:00:00+09:00

## 本文
アーカイブされた本文。
`;
    expect(buildSearchEntry(content, "20240101000000.md")).toBeNull();
  });

  it("publishedかつtagsがあれば配列として展開される", () => {
    const content = `# タグ付き記事

## メタ
- status: published
- published_at: 2025-03-01T00:00:00+09:00
- tags: [typescript, design]

## 本文
タグ付き記事の本文。
`;
    const entry = buildSearchEntry(content, "20250301000000.md");
    expect(entry).not.toBeNull();
    if (entry === null) {
      return;
    }
    expect(entry.tags).toEqual(["typescript", "design"]);
  });
});

describe("sortEntriesByPublishedAtDesc", () => {
  it("publishedAt降順でソートされる", () => {
    const entries = [
      {
        id: "old",
        title: "古い",
        excerpt: "",
        tags: [],
        publishedAt: "2024-01-01T00:00:00+09:00",
      },
      {
        id: "new",
        title: "新しい",
        excerpt: "",
        tags: [],
        publishedAt: "2025-06-01T00:00:00+09:00",
      },
    ];
    const sorted = sortEntriesByPublishedAtDesc(entries);
    expect(sorted[0]?.id).toBe("new");
    expect(sorted[1]?.id).toBe("old");
  });
});
