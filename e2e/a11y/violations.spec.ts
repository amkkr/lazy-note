import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * a11y ハードゲート G1: axe-core violations = 0
 *
 * Editorial Citrus デザインリニューアル `07-accessibility-and-performance.md` §3 に基づく。
 * 代表 4 ページ (ホーム / 記事詳細 2 種 / 個人史タイムライン /anchor) で
 * WCAG 2.1 AA レベルまでの違反を検査する。
 *
 * - AAA タグはコントラスト 7:1 を culori 実測で別途検証 (G2 / Issue #4a) するため、
 *   axe-core 側では AA までを必須ゲートとする。
 * - 違反があれば `expect.soft` で全件まとめて出力し、CI ログ / Summary で確認できるようにする。
 * - `/about` は本サイトに存在しないため、最新の 2 記事を代表ページとして採用する。
 *
 * 既知違反 (allowList):
 *   現状 allow-list は空。Editorial Citrus OKLCH トークン移行 (Issue #0a / #4a / Phase2 リニューアル)
 *   完了に伴い、過去に登録していた `aria-progressbar-name` (Issue #446 / PR #451) と
 *   `color-contrast` (Issue #455) は本質解消済みのため削除した。
 *   将来、新たな代表ページ追加 (例: code block 含む記事) などで仕様上不可避な違反が出た場合のみ、
 *   理由を明記して再登録すること。
 */
const TARGETS = [
  { name: "home", path: "/" },
  { name: "post-detail-latest", path: "/posts/20260624143000" },
  { name: "post-detail-secondary", path: "/posts/20260307120000" },
  // /anchor は Footer の「サイトの読み方」入口でナビ統合された読者導線
  // (Issue #839)。読者面のためデフォルトで heavy を抑制した状態の DOM を
  // axe で検査する (Footer の navigation Link / accent.link コントラスト含む)。
  { name: "anchor", path: "/anchor" },
];

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const target of TARGETS) {
  test(`${target.name} (${target.path}) に WCAG 2.1 AA 違反がない`, async ({
    page,
  }) => {
    await page.goto(target.path);
    // biome-ignore lint/nursery/noPlaywrightNetworkidle: axe による全ページ a11y スキャンは、フォント/画像の遅延ロードや React のハイドレーション完了後の最終 DOM を対象にする必要がある。特定要素待ちでは「全リソース読み込み後に初めて現れる違反」を取りこぼすため、ページ全体が静定する networkidle を意図的に使う (web-first assertion では代替不可)
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    if (results.violations.length > 0) {
      // 違反を CI ログに出力 (GitHub Actions Summary でも参照可能)
      console.log(
        `\n[axe violations: ${target.name}] total=${results.violations.length}\n` +
          JSON.stringify(results.violations, null, 2),
      );

      // CI で Summary に取り込めるよう、違反一覧を JSON ファイルに出力する。
      const outPath = join(
        "playwright-report",
        "axe",
        `${target.name}.json`,
      );
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(
        outPath,
        JSON.stringify(
          {
            target,
            total: results.violations.length,
            violations: results.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              help: v.help,
              helpUrl: v.helpUrl,
              tags: v.tags,
              nodeCount: v.nodes.length,
            })),
          },
          null,
          2,
        ),
      );
    }

    // allow-list は空のため、新規 / 既知を問わず全違反 0 を要求する。
    expect.soft(results.violations).toEqual([]);
  });
}
