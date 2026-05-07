/**
 * sitemap.xml を組み立てる純粋関数
 *
 * - 仕様: https://www.sitemaps.org/protocol.html
 * - status === "published" のみが渡されてくる前提
 * - lastmod は updatedAt が無ければ publishedAt を使用
 * - トップページ (/) も urlset に含める
 */

import type { CollectedPost } from "./collectPosts.ts";
import { buildSiteUrl } from "./siteConfig.ts";
import { escapeXml } from "./xmlEscape.ts";

/**
 * ISO 8601 文字列を sitemap の lastmod が許容する W3C Datetime に正規化する
 *
 * - sitemap は ISO 8601 をそのまま受け付けるが、表記揺れを避けるため `YYYY-MM-DDTHH:MM:SS+HH:MM` の形に整える
 * - 入力が不正な場合は例外を throw
 */
export const toSitemapLastmod = (isoDateTime: string): string => {
  const date = new Date(isoDateTime);
  const time = date.getTime();
  if (!Number.isFinite(time)) {
    throw new Error(`日時として解釈できません: "${isoDateTime}"`);
  }
  return isoDateTime;
};

/**
 * 1 件の <url> ブロックを生成する
 */
const renderUrlEntry = (
  loc: string,
  lastmod: string,
  changefreq: "weekly" | "monthly" | "yearly",
  priority: string,
): string => {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
};

/**
 * sitemap.xml を組み立てる
 *
 * - posts は publishedAt 降順前提
 * - トップページは weekly / 1.0、各記事は monthly / 0.7
 */
export const renderSitemap = (posts: readonly CollectedPost[]): string => {
  const homeUrl = buildSiteUrl("/");
  const homeLastmod = toSitemapLastmod(
    posts[0]?.meta.updatedAt ??
      posts[0]?.meta.publishedAt ??
      new Date().toISOString(),
  );

  const header = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    renderUrlEntry(homeUrl, homeLastmod, "weekly", "1.0"),
  ];

  const postEntries = posts.map((post) => {
    const loc = buildSiteUrl(`/posts/${post.id}`);
    const lastmod = toSitemapLastmod(
      post.meta.updatedAt ?? post.meta.publishedAt,
    );
    return renderUrlEntry(loc, lastmod, "monthly", "0.7");
  });

  const footer = ["</urlset>", ""];

  return [...header, ...postEntries, ...footer].join("\n");
};
