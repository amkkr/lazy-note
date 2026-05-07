import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { CollectedPost } from "../collectPosts.ts";
import { renderFeed, toRfc822 } from "../renderFeed.ts";

const buildPost = (overrides: Partial<CollectedPost> = {}): CollectedPost => ({
  id: "20250101120000",
  fileName: "20250101120000.md",
  title: "サンプル記事",
  excerpt: "これは抜粋です",
  meta: {
    status: "published",
    publishedAt: "2025-01-01T12:00:00+09:00",
    tags: [],
  },
  ...overrides,
});

describe("toRfc822", () => {
  it("ISO 8601 文字列を RFC 822 形式に変換できる", () => {
    expect(toRfc822("2025-01-01T12:00:00+09:00")).toBe(
      "Wed, 01 Jan 2025 03:00:00 GMT",
    );
  });

  it("不正な日時の場合は例外を投げる", () => {
    expect(() => toRfc822("not-a-date")).toThrow(/解釈できません/);
  });
});

describe("renderFeed", () => {
  const originalSiteUrl = process.env.SITE_URL;
  const fixedNow = new Date("2025-05-01T00:00:00Z");

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

  it("RSS 2.0 の必須要素を持つ XML を生成できる", () => {
    const xml = renderFeed([buildPost()], { now: fixedNow });

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<title>Lazy Note</title>");
    expect(xml).toContain("<language>ja</language>");
    expect(xml).toContain(
      "<description>急がない記録、急がせない言葉。</description>",
    );
    expect(xml).toContain("<lastBuildDate>Thu, 01 May 2025 00:00:00 GMT</lastBuildDate>");
    expect(xml).toContain(
      '<atom:link href="https://example.com/blog/feed.xml" rel="self" type="application/rss+xml" />',
    );
  });

  it("各記事を <item> として含む", () => {
    const xml = renderFeed([buildPost()], { now: fixedNow });

    expect(xml).toContain("<item>");
    expect(xml).toContain("<title>サンプル記事</title>");
    expect(xml).toContain(
      "<link>https://example.com/blog/posts/20250101120000</link>",
    );
    expect(xml).toContain(
      '<guid isPermaLink="true">https://example.com/blog/posts/20250101120000</guid>',
    );
    expect(xml).toContain("<pubDate>Wed, 01 Jan 2025 03:00:00 GMT</pubDate>");
    expect(xml).toContain("<description>これは抜粋です</description>");
  });

  it("XML 予約文字を含むタイトル / 抜粋をエスケープできる", () => {
    const xml = renderFeed(
      [
        buildPost({
          title: "Tom & <Jerry>",
          excerpt: `It's "great" & dangerous`,
        }),
      ],
      { now: fixedNow },
    );

    expect(xml).toContain("<title>Tom &amp; &lt;Jerry&gt;</title>");
    expect(xml).toContain(
      "<description>It&apos;s &quot;great&quot; &amp; dangerous</description>",
    );
  });

  it("空のフィードでも channel 要素は維持される", () => {
    const xml = renderFeed([], { now: fixedNow });

    expect(xml).toContain("<channel>");
    expect(xml).toContain("</channel>");
    expect(xml).not.toContain("<item>");
  });

  it("末尾改行が 1 つだけ付与される", () => {
    const xml = renderFeed([], { now: fixedNow });

    expect(xml.endsWith("\n")).toBe(true);
    expect(xml.endsWith("\n\n")).toBe(false);
  });
});
