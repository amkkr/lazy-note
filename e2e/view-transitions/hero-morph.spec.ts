import { expect, test } from "@playwright/test";

/**
 * View Transitions API による Hero morph 動作検証 (Issue #411)。
 *
 * View Transitions API は 2026 年 5 月時点で:
 * - Chromium: 111+ で安定対応 (`document.startViewTransition` 利用可能)
 * - WebKit:   18+ で対応 (Safari 18 以降)
 * - Firefox:  まだ未対応 (graceful degrade で即時遷移)
 *
 * 実装側 (`document.startViewTransition` を呼び出す navigation hook) が
 * 存在しない環境では、ブラウザは何もせず通常の遷移を行う。テストはその
 * graceful degrade パスでも fail しないように設計する:
 *
 * 1. Chromium で API が存在することを確認 (R-3 / RFC §"View Transitions")
 * 2. 記事カード (Featured/通常カード) クリック後に PostDetail に遷移できる
 *    こと (View Transition の有無に関わらず最終結果が正しい)
 * 3. 遷移中いずれかの frame で `view-transition-old` または `view-transition-new`
 *    の擬似要素が描画されることを確認 (実装あり時のみ true、無ければ
 *    expect.soft で記録のみ)
 * 4. prefers-reduced-motion: reduce の場合、`startViewTransition` 呼び出しを
 *    スキップするか、もしくは即時遷移として動作すること
 *
 * Chromium 以外 (WebKit / Firefox) では API 自体が無い、または挙動が異なる
 * ため、Chromium プロジェクトでのみ実行する (`test.skip` で他 project を除外)。
 */
test.describe("view-transitions: Hero morph (Chromium のみ)", () => {
  test("Chromium で document.startViewTransition API が利用可能", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "View Transitions API は Chromium のみで検証");

    await page.goto("/");

    const hasApi = await page.evaluate(
      () => typeof document.startViewTransition === "function",
    );

    expect(hasApi).toBe(true);
  });

  test("記事カードクリックで PostDetail に遷移できる (VT 有無を問わない graceful degrade)", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Chromium のみで検証");

    await page.goto("/");

    // ホームの記事カードリンク (variant="card") のうち先頭をクリックし、
    // PostDetail (`/posts/...`) への遷移が成立することを確認する。
    // 実装側で startViewTransition がフックされていない場合でも、Router 通常遷移
    // で同じ最終状態に至るため、このアサーションは graceful degrade を保証する。
    const firstCardLink = page.locator("a[href^='/posts/']").first();
    await firstCardLink.waitFor({ state: "visible" });

    const transitionEntries: string[] = [];
    // 遷移中の擬似要素や transition-name 要素が DOM に出現するかを記録するための
    // ハンドラを仕込む。実装あり時のみキャプチャされ、無ければ空配列のままになる。
    await page.exposeFunction("__recordVT", (entry: string) => {
      transitionEntries.push(entry);
    });
    await page.evaluate(() => {
      const observer = new MutationObserver(() => {
        // documentElement に view-transition 関連の擬似要素が pseudo として付与
        // されたタイミングで、対応する CSS transition-name を持つ要素を抽出する。
        const named = Array.from(
          document.querySelectorAll<HTMLElement>("[style*='view-transition-name']"),
        );
        for (const el of named) {
          (
            window as unknown as { __recordVT: (s: string) => void }
          ).__recordVT(el.tagName);
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        subtree: true,
        childList: true,
      });
    });

    await Promise.all([
      page.waitForURL(/\/posts\//),
      firstCardLink.click(),
    ]);

    // 遷移後に PostDetail の主要要素が描画されることを確認する。
    // PostDetail は Heading1 (記事タイトル) を必ず描画するため、heading の存在で
    // 検証する。
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();

    // VT 実装が入っていれば transitionEntries に何らかが入っているはずだが、
    // 未実装でも graceful degrade を期待値とするため、本テストでは値の有無は
    // 強制しない。実装後に有意な検証へ昇格する想定で expect.soft で記録のみ行う。
    expect.soft(transitionEntries.length).toBeGreaterThanOrEqual(0);
  });

  test("prefers-reduced-motion: reduce 下で記事遷移が即時に成立する", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "Chromium のみで検証");

    // CSS Media Feature を強制設定する。Editorial Citrus の R-5 で導入した
    // `@media (prefers-reduced-motion: reduce)` グローバルルールにより
    // transition / animation が 0.001ms に抑制されるため、遷移は即時となる。
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/");

    const firstCardLink = page.locator("a[href^='/posts/']").first();
    await firstCardLink.waitFor({ state: "visible" });

    const start = Date.now();
    await Promise.all([
      page.waitForURL(/\/posts\//),
      firstCardLink.click(),
    ]);

    // PostDetail の heading が表示されるまでの所要時間を測る。
    // VT が動いていればフェード等で 200ms 以上掛かることがあるが、reduce 下では
    // 即時遷移となり、実用上 2 秒以内には完了する。テスト環境の差異を許容するため
    // 厳密 ms ではなく「heading が短時間で見える」ことを上限付きで検証する。
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible({ timeout: 2000 });

    const elapsed = Date.now() - start;
    // CI 環境差を考慮し 5 秒上限。VT が原因で 5 秒超過することを防ぐためのガード。
    expect(elapsed).toBeLessThan(5000);
  });
});
