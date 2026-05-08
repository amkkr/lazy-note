import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * e2e テスト用の post ID fixture (Issue #411 / DA 推奨 7 対応)。
 *
 * これまで spec の各所にハードコードされていた `20260307120000` のような
 * 記事 ID を `datasources/` を読み出して動的に解決する。
 *
 * 設計方針:
 * - `datasources/*.md` のファイル名から timestamp ベースの ID を抜き出し、
 *   降順 sort して先頭 (= 最新) を返す。新しい記事を追加した際に spec の
 *   修正を不要にし、古い記事削除時にも fixture が壊れにくくする。
 * - timestamp 形式 (`^\d+\.md$`) のみを対象にし、images/ などの非記事を弾く。
 * - 記事が 0 件の場合は明示的に throw して、spec が暗黙に skip されない
 *   ようにする (CI gating の確実性を担保)。
 */

/**
 * 現ファイル (`latest-post.ts`) の絶対ディレクトリ。
 *
 * `__dirname` は ESM では未定義のため、`import.meta.url` 経由で導出する。
 */
const fixtureDir = dirname(fileURLToPath(import.meta.url));

/**
 * `datasources/` ディレクトリの絶対パス。fixture ディレクトリ
 * (`e2e/_fixtures`) からプロジェクトルートへ相対的に解決する。
 */
const datasourcesDir = join(fixtureDir, "..", "..", "datasources");

/**
 * `datasources/` 直下から最新記事 (timestamp 降順 1 位) の ID を返す。
 *
 * @returns 最新記事の ID (拡張子 `.md` を除いた文字列)
 * @throws datasources に timestamp 形式の `.md` が 1 件もない場合
 */
export const getLatestPostId = (): string => {
  const files = readdirSync(datasourcesDir).filter((file) =>
    /^\d+\.md$/.test(file),
  );

  if (files.length === 0) {
    throw new Error(
      `No timestamp-formatted .md posts found in datasources/ (${datasourcesDir})`,
    );
  }

  // 降順 sort で先頭 = 最新 timestamp。記事 ID は yyyyMMddHHmmss 形式の文字列
  // ソートで時系列順に並ぶ前提 (本プロジェクトの newPost.ts が timestamp を
  // 連結して命名しているため、辞書順 = 時系列順となる)。
  files.sort().reverse();

  return files[0].replace(".md", "");
};

/**
 * `datasources/` 直下から timestamp 降順で 2 番目の記事 ID を返す。
 *
 * `axe-core` 違反検査などで「複数記事」を対象にする spec が複数あるため、
 * 「2 番目に新しい記事」も fixture として提供する。
 *
 * @returns 2 番目に新しい記事の ID
 * @throws datasources に 2 件以上の `.md` がない場合
 */
export const getSecondLatestPostId = (): string => {
  const files = readdirSync(datasourcesDir).filter((file) =>
    /^\d+\.md$/.test(file),
  );

  if (files.length < 2) {
    throw new Error(
      `At least 2 timestamp-formatted .md posts are required for getSecondLatestPostId (${datasourcesDir})`,
    );
  }

  files.sort().reverse();

  return files[1].replace(".md", "");
};
