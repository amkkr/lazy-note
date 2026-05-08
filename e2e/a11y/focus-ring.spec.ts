import { expect, test } from "@playwright/test";

/**
 * R-5 (Issue #393) で導入した focus-visible 二重リング (box-shadow) を
 * Playwright で実機検証する (Issue #411)。
 *
 * jsdom では `:focus-visible` 擬似クラスのスタイル計算が完全に再現できず、
 * 単体テストでは存在チェック止まりだったため、実 Chromium で次を検証する:
 *
 * 1. Tab キーでインタラクティブ要素 (button / a / role=switch) にフォーカス
 *    が移動すること (キーボード操作経路で `:focus-visible` が発火する条件)
 * 2. フォーカス時の `getComputedStyle().boxShadow` が空でなく、
 *    focus.ring 由来の二重リング描画を確認できること
 *    (panda の var(--colors-focus-ring) と外側 ink-900/cream-50 が rgb 値で
 *    出力される)
 *
 * 注: jsdom では box-shadow を空文字に解決するブラウザ実装差があり、
 * Playwright (Chromium) では `rgb(...) 0px 0px 0px Npx, ...` の形で取得できる。
 */
test.describe("a11y: focus ring の box-shadow が描画される", () => {
  test("ホームでテーマトグル (role=switch) に Tab フォーカスして二重リングが出る", async ({
    page,
  }) => {
    await page.goto("/");

    const themeSwitch = page.getByRole("switch");
    await themeSwitch.waitFor({ state: "visible" });

    // ThemeToggle に直接 focus() を当てると `:focus-visible` が発火しない
    // ブラウザがあるため、キーボード経路でフォーカスを与える。
    // (Headless Chromium では :focus-visible はキーボード入力後の focus に
    //  限定して true になる)
    await themeSwitch.focus();
    // キーボード由来であることを示すため Tab で再フォーカスして確実に :focus-visible に揺らす。
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");

    // box-shadow が空でないこと、かつ 2 段以上のリング (カンマ区切り) を含むことを確認。
    const boxShadow = await themeSwitch.evaluate(
      (el) => window.getComputedStyle(el).boxShadow,
    );

    expect(boxShadow).not.toBe("none");
    expect(boxShadow).not.toBe("");
    // 二重リングは `rgb(...) 0px 0px 0px 2px, rgb(...) 0px 0px 0px 4px`
    // のように 2 つの shadow をカンマで連結して描画される。
    expect(boxShadow.split(",").length).toBeGreaterThanOrEqual(2);
  });

  test("ホームの記事カードリンク (a) に Tab フォーカスして二重リングが出る", async ({
    page,
  }) => {
    await page.goto("/");

    const firstCardLink = page.locator("a[href^='/posts/']").first();
    await firstCardLink.waitFor({ state: "visible" });

    await firstCardLink.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");

    // フォーカスが当たるまで Tab を進める (ヘッダ要素の先頭から数えて
    // カードリンクに到達するまでの回数はコンテンツ次第なので、focus state を
    // 直接アサートしてループを回避する)。
    await firstCardLink.focus();

    const boxShadow = await firstCardLink.evaluate(
      (el) => window.getComputedStyle(el).boxShadow,
    );

    expect(boxShadow).not.toBe("none");
    expect(boxShadow).not.toBe("");
    expect(boxShadow.split(",").length).toBeGreaterThanOrEqual(2);
  });

  test("PostDetail のページネーションリンクに Tab フォーカスして二重リングが出る", async ({
    page,
  }) => {
    // PostDetail の `← TOPに戻る` リンク (variant=navigation) は focusRingStyles
    // を適用しているため、box-shadow が描画される。
    await page.goto("/posts/20260307120000");

    const backLink = page.getByRole("link", { name: /TOPに戻る/ });
    await backLink.waitFor({ state: "visible" });

    await backLink.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await backLink.focus();

    const boxShadow = await backLink.evaluate(
      (el) => window.getComputedStyle(el).boxShadow,
    );

    expect(boxShadow).not.toBe("none");
    expect(boxShadow).not.toBe("");
    expect(boxShadow.split(",").length).toBeGreaterThanOrEqual(2);
  });
});
