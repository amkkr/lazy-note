/**
 * RSS 2.0 形式のフィード XML を組み立てる純粋関数
 *
 * - 仕様: https://www.rssboard.org/rss-specification
 * - status === "published" のみが渡されてくる前提（フィルタは collectPosts で実施）
 * - link / guid は buildSiteUrl で絶対 URL 化
 * - title / description / pubDate / lastBuildDate を含む
 */

import type { CollectedPost } from "./collectPosts.ts";
import { buildSiteUrl, SITE_META } from "./siteConfig.ts";
import { escapeXml } from "./xmlEscape.ts";

/**
 * ISO 8601 文字列を RFC 822 (RSS が要求する pubDate 形式) に変換する
 *
 * - 入力が不正な日時の場合は例外を throw（呼び出し元で build fail）
 * - 出力例: "Wed, 01 Jan 2025 12:00:00 +0000"
 */
export const toRfc822 = (isoDateTime: string): string => {
  const date = new Date(isoDateTime);
  const time = date.getTime();
  if (!Number.isFinite(time)) {
    throw new Error(`日時として解釈できません: "${isoDateTime}"`);
  }
  return date.toUTCString();
};

/**
 * RSS の <item> タグ 1 件を生成する
 */
const renderItem = (post: CollectedPost): string => {
  const link = buildSiteUrl(`/posts/${post.id}`);
  const pubDate = toRfc822(post.meta.publishedAt);
  return [
    "    <item>",
    `      <title>${escapeXml(post.title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
    `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
    `      <description>${escapeXml(post.excerpt)}</description>`,
    "    </item>",
  ].join("\n");
};

/**
 * RSS 2.0 全体を生成するオプション
 */
export interface RenderFeedOptions {
  /** lastBuildDate に使う基準時刻（テストで固定するため注入可能） */
  readonly now?: Date;
}

/**
 * RSS 2.0 形式の feed.xml 文字列を組み立てる
 *
 * - posts は publishedAt 降順前提
 * - 末尾改行を 1 つだけ付与
 */
export const renderFeed = (
  posts: readonly CollectedPost[],
  options: RenderFeedOptions = {},
): string => {
  const now = options.now ?? new Date();
  const feedUrl = buildSiteUrl("/feed.xml");
  const homeUrl = buildSiteUrl("/");
  const lastBuildDate = now.toUTCString();

  const header = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(SITE_META.title)}</title>`,
    `    <link>${escapeXml(homeUrl)}</link>`,
    `    <description>${escapeXml(SITE_META.description)}</description>`,
    `    <language>${escapeXml(SITE_META.language)}</language>`,
    `    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
  ];

  const itemsXml = posts.map(renderItem);
  const footer = ["  </channel>", "</rss>", ""];

  return [...header, ...itemsXml, ...footer].join("\n");
};
