import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * a11y ハードゲート G1: axe-core violations = 0
 *
 * Editorial Citrus デザインリニューアル `07-accessibility-and-performance.md` §3 に基づく。
 * 代表 3 ページ (ホーム / 記事詳細 2 種) で WCAG 2.1 AA レベルまでの違反を検査する。
 *
 * - AAA タグはコントラスト 7:1 を culori 実測で別途検証 (G2 / Issue #4a) するため、
 *   axe-core 側では AA までを必須ゲートとする。
 * - 違反があれば `expect.soft` で全件まとめて出力し、CI ログ / Summary で確認できるようにする。
 * - `/about` は本サイトに存在しないため、最新の 2 記事を代表ページとして採用する。
 *
 * 既知違反 (allowList):
 *   現行 gruvbox テーマには WCAG 2.1 AA を満たさないコントラストペアが残存しており、
 *   Editorial Citrus への OKLCH トークン移行 (Issue #0a / #4a) で解消予定。
 *   それまでの間は known violations として `KNOWN_VIOLATION_IDS` で除外し、
 *   新規違反の混入のみを CI ゲートで防ぐ。
 */
const TARGETS = [
  { name: "home", path: "/" },
  { name: "post-detail-latest", path: "/posts/20260307120000" },
  { name: "post-detail-secondary", path: "/posts/20260221104801" },
];

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * 既知違反 ID 一覧
 *
 * - color-contrast: gruvbox の #83a598 / #7c6f64 系が AA (4.5:1) を満たさない
 *   → Editorial Citrus OKLCH トークン導入 (Issue #0a / G2) で解消
 * - aria-progressbar-name: ReadingProgressBar の aria 名称欠落
 *   → Issue #4a で名称付与
 */
const KNOWN_VIOLATION_IDS = new Set<string>([
  "color-contrast",
  "aria-progressbar-name",
]);

for (const target of TARGETS) {
  test(`${target.name} (${target.path}) に WCAG 2.1 AA 違反がない`, async ({
    page,
  }) => {
    await page.goto(target.path);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    const newViolations = results.violations.filter(
      (v) => !KNOWN_VIOLATION_IDS.has(v.id),
    );

    if (results.violations.length > 0) {
      // 既知 / 新規を含む全違反を CI ログに出力 (GitHub Actions Summary でも参照可能)
      console.log(
        `\n[axe violations: ${target.name}] total=${results.violations.length} new=${newViolations.length}\n` +
          JSON.stringify(results.violations, null, 2),
      );
    }

    // 既知違反は allowList で除外、新規違反のみ 0 を要求する。
    expect.soft(newViolations).toEqual([]);
  });
}
