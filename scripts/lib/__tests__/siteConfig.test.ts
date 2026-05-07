import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSiteUrl, getSiteUrl, SITE_META } from "../siteConfig.ts";

describe("siteConfig", () => {
  const originalSiteUrl = process.env.SITE_URL;

  beforeEach(() => {
    delete process.env.SITE_URL;
  });

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.SITE_URL;
    } else {
      process.env.SITE_URL = originalSiteUrl;
    }
  });

  describe("getSiteUrl", () => {
    it("環境変数未設定時に既定の GitHub Pages URL を返す", () => {
      expect(getSiteUrl()).toBe("https://amkkr.github.io/lazy-note");
    });

    it("環境変数で URL を上書きできる", () => {
      process.env.SITE_URL = "https://example.com/blog";
      expect(getSiteUrl()).toBe("https://example.com/blog");
    });

    it("末尾スラッシュを除去できる", () => {
      process.env.SITE_URL = "https://example.com/blog/";
      expect(getSiteUrl()).toBe("https://example.com/blog");
    });

    it("空文字列が指定された場合は例外を投げる", () => {
      process.env.SITE_URL = "   ";
      expect(() => getSiteUrl()).toThrow(/SITE_URL/);
    });

    it("不正な URL の場合は例外を投げる", () => {
      process.env.SITE_URL = "not-a-valid-url";
      expect(() => getSiteUrl()).toThrow(/SITE_URL/);
    });
  });

  describe("buildSiteUrl", () => {
    it("先頭スラッシュ有無に依らず同じ絶対 URL を返す", () => {
      expect(buildSiteUrl("/posts/abc")).toBe(
        "https://amkkr.github.io/lazy-note/posts/abc",
      );
      expect(buildSiteUrl("posts/abc")).toBe(
        "https://amkkr.github.io/lazy-note/posts/abc",
      );
    });

    it("二重スラッシュが発生しない", () => {
      process.env.SITE_URL = "https://example.com/blog/";
      expect(buildSiteUrl("/feed.xml")).toBe("https://example.com/blog/feed.xml");
    });
  });

  describe("SITE_META", () => {
    it("Lazy Note のチャンネル情報を持つ", () => {
      expect(SITE_META.title).toBe("Lazy Note");
      expect(SITE_META.language).toBe("ja");
      expect(SITE_META.description).toBe("急がない記録、急がせない言葉。");
    });
  });
});
