import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CollectedPost } from "../collectPosts.ts";
import { renderSitemap, toSitemapLastmod } from "../renderSitemap.ts";

const buildPost = (overrides: Partial<CollectedPost> = {}): CollectedPost => ({
  id: "20250101120000",
  fileName: "20250101120000.md",
  title: "サンプル",
  excerpt: "抜粋",
  meta: {
    status: "published",
    publishedAt: "2025-01-01T12:00:00+09:00",
    tags: [],
  },
  ...overrides,
});

describe("toSitemapLastmod", () => {
  it("妥当な ISO 8601 文字列を保持する", () => {
    expect(toSitemapLastmod("2025-01-01T12:00:00+09:00")).toBe(
      "2025-01-01T12:00:00+09:00",
    );
  });

  it("不正な日時の場合は例外を投げる", () => {
    expect(() => toSitemapLastmod("invalid")).toThrow(/解釈できません/);
  });
});

describe("renderSitemap", () => {
  const originalSiteUrl = process.env.SITE_URL;

  beforeEach(() => {
    process.env.SITE_URL = "https://example.com/blog";
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.SITE_URL;
    } else {
      process.env.SITE_URL = originalSiteUrl;
    }
  });

  it("sitemap protocol の必須要素を含む XML を生成できる", () => {
    const xml = renderSitemap([buildPost()]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml).toContain("</urlset>");
  });

  it("トップページの <url> エントリを先頭に出力する", () => {
    const xml = renderSitemap([buildPost()]);

    expect(xml).toContain("<loc>https://example.com/blog/</loc>");
    expect(xml).toContain("<priority>1.0</priority>");
  });

  it("各記事を URL エントリとして含む", () => {
    const xml = renderSitemap([buildPost()]);

    expect(xml).toContain(
      "<loc>https://example.com/blog/posts/20250101120000</loc>",
    );
    expect(xml).toContain("<lastmod>2025-01-01T12:00:00+09:00</lastmod>");
    expect(xml).toContain("<changefreq>monthly</changefreq>");
    expect(xml).toContain("<priority>0.7</priority>");
  });

  it("updatedAt があれば lastmod に優先採用される", () => {
    const post = buildPost({
      meta: {
        status: "published",
        publishedAt: "2025-01-01T12:00:00+09:00",
        updatedAt: "2025-03-15T18:30:00+09:00",
        tags: [],
      },
    });

    const xml = renderSitemap([post]);

    expect(xml).toContain("<lastmod>2025-03-15T18:30:00+09:00</lastmod>");
    expect(xml).not.toContain("<lastmod>2025-01-01T12:00:00+09:00</lastmod>");
  });

  it("記事が空でも urlset は生成される", () => {
    const xml = renderSitemap([]);

    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
  });
});
