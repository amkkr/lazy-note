import { expect, test } from "@playwright/test";

/**
 * ナビゲーション E2E: Footer の入口リンク (Issue #839)
 *
 * `/` の Footer に追加した「サイトの読み方」リンク (`/anchor` への内部遷移) を
 * 起点に、ホームから個人史タイムライン (`/anchor`) へ到達できることを検査する。
 *
 * jsdom 単体テスト (Footer.test.tsx / AnchorPage.test.tsx) が「リンクが存在する」
 * 「heavy を抑制する」といったコンポーネント内部の振る舞いを担保するのに対し、
 * 本 E2E は実ブラウザでの **クリック → ルート遷移 → 到達ページの見出し** という
 * 導線そのもの (= ナビ統合の主目的) が機能することを保証する層を担う。
 */
test.describe("ナビゲーション: Footer の入口リンク (Issue #839)", () => {
  test("ホームから Footer の『サイトの読み方』リンクで /anchor に到達できる", async ({
    page,
  }) => {
    await page.goto("/");

    // Footer (contentinfo landmark) 内の入口リンクを狙い撃ちで取得する。
    const footer = page.getByRole("contentinfo");
    const entryLink = footer.getByRole("link", { name: "サイトの読み方" });
    await expect(entryLink).toBeVisible();
    await expect(entryLink).toHaveAttribute("href", "/anchor");

    await entryLink.click();

    // /anchor へ遷移し、AnchorPage の固定 h1 "Anchor" が描画される。
    await expect(page).toHaveURL(/\/anchor$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Anchor" }),
    ).toBeVisible();
  });
});
