import { expect, test } from "@playwright/test";

/**
 * smoke E2E
 *
 * Editorial Citrus デザインリニューアル (#0a) における Playwright 基盤導入。
 * `/` を開いて主要要素 (heading) が描画されることだけを最低限確認する。
 * 詳細な a11y / VR 検証は後続 Issue (#4a) で追加する。
 */
test.describe("smoke: ホーム", () => {
  test("ルートを開くと heading が表示される", async ({ page }) => {
    await page.goto("/");

    const heading = page.getByRole("heading").first();

    await expect(heading).toBeVisible();
  });
});
