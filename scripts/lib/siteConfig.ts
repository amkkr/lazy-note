/**
 * 配信基盤 (RSS / sitemap) の共通サイト設定
 *
 * - 公開先 URL は環境変数 `SITE_URL` で上書き可能
 * - 既定は GitHub Pages の URL（vite.config.ts の base "/lazy-note/" と整合）
 * - 末尾スラッシュは buildSiteUrl で正規化するため、設定値は末尾スラッシュ無しで保持
 */

const DEFAULT_SITE_URL = "https://amkkr.github.io/lazy-note";

/**
 * サイト URL の origin + base を取得する
 *
 * - 末尾スラッシュは必ず除去して返す（パス連結時の二重スラッシュを防ぐ）
 * - 不正な値が入った場合（プロトコル無し等）は例外を throw する
 */
export const getSiteUrl = (): string => {
  const raw = (process.env.SITE_URL ?? DEFAULT_SITE_URL).trim();
  if (raw.length === 0) {
    throw new Error("SITE_URL が空文字列です");
  }
  try {
    // URL コンストラクタで妥当性検証（不正な URL は throw）
    new URL(raw);
  } catch {
    throw new Error(`SITE_URL が不正です: "${raw}"`);
  }
  return raw.replace(/\/+$/, "");
};

/**
 * パスを連結して絶対 URL を構築する
 *
 * - path は先頭スラッシュ有無を許容
 * - URL コンストラクタ経由で path traversal や不正文字を正規化
 */
export const buildSiteUrl = (path: string): string => {
  const base = `${getSiteUrl()}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  return new URL(normalizedPath, base).toString();
};

/**
 * チャンネル / フィード共通のメタ情報
 */
export const SITE_META = {
  title: "Lazy Note",
  description: "急がない記録、急がせない言葉。",
  language: "ja",
} as const;
