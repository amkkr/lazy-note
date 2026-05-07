import { describe, expect, it } from "vitest";
import {
  getSearchIndexUrl,
  isSearchIndexEntry,
  normalizeSearchIndex,
} from "../searchIndex";

describe("isSearchIndexEntry", () => {
  it("有効なエントリを判定できる", () => {
    expect(
      isSearchIndexEntry({
        id: "20250101120000",
        title: "タイトル",
        excerpt: "抜粋",
        tags: ["foo", "bar"],
        publishedAt: "2025-01-01T12:00:00+09:00",
      }),
    ).toBe(true);
  });

  it("tagsが配列でない場合はfalseを返す", () => {
    expect(
      isSearchIndexEntry({
        id: "id",
        title: "タイトル",
        excerpt: "抜粋",
        tags: "foo,bar",
        publishedAt: "2025-01-01T12:00:00+09:00",
      }),
    ).toBe(false);
  });

  it("tagsの中にstring以外が混ざっていればfalseを返す", () => {
    expect(
      isSearchIndexEntry({
        id: "id",
        title: "タイトル",
        excerpt: "抜粋",
        tags: ["ok", 42],
        publishedAt: "2025-01-01T12:00:00+09:00",
      }),
    ).toBe(false);
  });

  it("nullやプリミティブを弾く", () => {
    expect(isSearchIndexEntry(null)).toBe(false);
    expect(isSearchIndexEntry("string")).toBe(false);
    expect(isSearchIndexEntry(undefined)).toBe(false);
  });
});

describe("normalizeSearchIndex", () => {
  it("配列でない値を空配列に変換する", () => {
    expect(normalizeSearchIndex(null)).toEqual([]);
    expect(normalizeSearchIndex({ foo: "bar" })).toEqual([]);
  });

  it("型ガードを通らない要素を除外する", () => {
    const result = normalizeSearchIndex([
      {
        id: "ok",
        title: "T",
        excerpt: "E",
        tags: [],
        publishedAt: "2025-01-01T12:00:00+09:00",
      },
      { id: "ng", title: "T", excerpt: "E", tags: "no" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("ok");
  });
});

describe("getSearchIndexUrl", () => {
  it("末尾スラッシュ無しのbaseUrlに対応する", () => {
    expect(getSearchIndexUrl("/lazy-note")).toBe(
      "/lazy-note/search-index.json",
    );
  });

  it("末尾スラッシュ付きのbaseUrlに対応する", () => {
    expect(getSearchIndexUrl("/")).toBe("/search-index.json");
  });
});
