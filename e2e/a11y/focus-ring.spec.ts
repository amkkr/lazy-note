import { type Page, expect, test } from "@playwright/test";
import { getLatestPostId } from "../_fixtures/latest-post";

/**
 * R-5 (Issue #393) で導入した focus-visible 二重リング (box-shadow) を
 * Playwright で実機検証する (Issue #411)。
 *
 * jsdom では `:focus-visible` 擬似クラスのスタイル計算が完全に再現できず、
 * 単体テストでは存在チェック止まりだったため、実 Chromium で次を検証する:
 *
 * 1. Tab キーでインタラクティブ要素 (button / a / role=switch) にフォーカス
 *    が移動すること (キーボード操作経路で `:focus-visible` が発火する条件)。
 *    Tab 回数を targetSelector 到達まで動的に繰り返す `tabUntilFocused`
 *    ヘルパで `Shift+Tab` → `Tab` race condition を回避する (DA 重大 4 対応)。
 * 2. フォーカス時の `getComputedStyle().boxShadow` が空でなく、
 *    focus.ring 由来の二重リング描画 (`Npx Npx Npx Npx <color>, Npx Npx Npx Npx <color>`)
 *    を構造的 regex で検証する (DA 重大 4 対応)。`split(",").length >= 2`
 *    だけでは color 内のカンマ (`rgb(r, g, b)` / `oklab(l a b / α)`) で
 *    誤判定するため、shadow オフセット 4 値が 2 連で並ぶことを正規表現で
 *    確認する。spread `2px` / `4px` の出現も合わせて検証する。
 *
 * viewport 非依存のため `desktop` プロジェクトでのみ実行 (DA 重大 3 対応)。
 *
 * 安定性配慮:
 * - リンク / カードは `transition: all 0.2s ease` を持つため、box-shadow が
 *   interpolation 中の値 (例: `0.142058px`) を返すことがある。`waitForFunction`
 *   で「spread が 4px に達した」ことを condition にし、transition 完了を待つ。
 */

/**
 * 二重 box-shadow の検証用正規表現。
 *
 * `<x> <y> <blur> <spread> <color>, <x> <y> <blur> <spread> <color>` 形式
 * (color 先頭でも末尾でも可) を構造的に検出する。
 *
 * - color には `rgb(r, g, b)` / `rgba(...)` / `oklab(l a b / α)` /
 *   `oklch(...)` などカンマ / スペースを含む CSS color 関数が来るため、
 *   "丸括弧で閉じる任意文字列" `\w+\([^)]*\)` で吸収する。
 * - spread が 4px (R-5 二重リングの外側) と 2px (内側) を含むことを必須化。
 *   transition 中は `0.142058px` のような中途値が出るため、整数 px 値を要求
 *   することで完全 transition 後の状態を検証する。
 *
 * 例: `oklab(0.86 ...) 0px 0px 0px 2px, oklab(0.15 ...) 0px 0px 0px 4px`
 */
const DUAL_SHADOW_PATTERN =
  /(?:\w+\([^)]*\)\s+)?\d+px\s+\d+px\s+\d+px\s+2px(?:\s+\w+\([^)]*\))?,\s*(?:\w+\([^)]*\)\s+)?\d+px\s+\d+px\s+\d+px\s+4px/;

/**
 * Tab キーで `targetSelector` が `document.activeElement` になるまで
 * 最大 `maxTries` 回繰り返すヘルパ (DA 重大 4 対応)。
 *
 * `Shift+Tab` → `Tab` の固定 2 段階では、ヘッダ追加 / DOM 構造変化で容易に
 * race condition が発生する。Tab を進めて毎回 activeElement を確認する形で
 * 「到達するまで繰り返す」決定的なフォーカス遷移を実現する。
 *
 * 重要: 初回 Tab で `:focus-visible` のキーボード操作ヒューリスティクスを
 * 確実に発火させるため、`document.body` などへの programmatic focus は
 * 行わない。Playwright `keyboard.press('Tab')` 単体で keyboard input event
 * として扱われ、Chromium の :focus-visible heuristic が満たされる。
 *
 * @param page Playwright Page
 * @param targetSelector フォーカスを当てたい要素の CSS セレクタ
 * @param maxTries 最大試行回数 (既定 30)
 * @throws maxTries 内に到達できなかった場合
 */
const tabUntilFocused = async (
  page: Page,
  targetSelector: string,
  maxTries = 30,
): Promise<void> => {
  for (let i = 0; i < maxTries; i++) {
    await page.keyboard.press("Tab");
    const isFocused = await page.evaluate((sel) => {
      const target = document.querySelector(sel);
      return target !== null && document.activeElement === target;
    }, targetSelector);
    if (isFocused) {
      return;
    }
  }

  throw new Error(
    `tabUntilFocused: could not focus ${targetSelector} within ${maxTries} Tab presses`,
  );
};

/**
 * box-shadow が transition 完了後に 4px spread (R-5 二重リング外側) を
 * 含むようになるまで待機する。
 *
 * `transition: all 0.2s ease` 中は `getComputedStyle().boxShadow` が
 * interpolation 中の中途値 (`0.142058px` 等) を返すため、整数 spread が
 * 観測されるまで polling する。
 *
 * @param page Playwright Page
 * @param targetSelector 監視対象セレクタ
 * @param timeout 上限 ms (既定 1500)
 */
const waitForFocusRingApplied = async (
  page: Page,
  targetSelector: string,
  timeout = 1500,
): Promise<void> => {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const cs = window.getComputedStyle(el);
      // 二重リング完了時は spread 4px がいずれかの shadow に含まれる。
      // interpolation 中は `0.x px` 形式となるため、`\b4px\b` をマッチさせる。
      return /\b4px\b/.test(cs.boxShadow);
    },
    targetSelector,
    { timeout },
  );
};

test.describe("a11y: focus ring の box-shadow が描画される", () => {
  // viewport 非依存のため desktop プロジェクトのみで検証する (DA 重大 3 対応)。
  // describe 配下の全 test に共通で適用するため beforeEach で skip 判定する。
  test.beforeEach(async ({ }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "viewport 非依存のため desktop のみ実行 (CI 時間短縮)",
    );
  });

  test("ホームでテーマトグル (role=switch) に Tab で到達して二重リングが出る", async ({
    page,
  }) => {
    await page.goto("/");

    const themeSwitch = page.getByRole("switch");
    await themeSwitch.waitFor({ state: "visible" });

    // Tab で到達するまで繰り返す。`tabUntilFocused` 内で activeElement を
    // 各ステップ確認し、race condition を排除する (DA 重大 4 対応)。
    await tabUntilFocused(page, "[role='switch']");

    // box-shadow の transition (0.2s) 完了を待つ (interpolation 中の中途値
    // `0.142058px` 等を拾うのを防ぐ)。
    await waitForFocusRingApplied(page, "[role='switch']");

    const boxShadow = await themeSwitch.evaluate(
      (el) => window.getComputedStyle(el).boxShadow,
    );

    expect(boxShadow).not.toBe("none");
    expect(boxShadow).not.toBe("");
    // 二重リングの構造的 regex 検証。color 内のカンマで `split(",")` が
    // 誤判定する問題を回避する (DA 重大 4 対応)。spread 2px / 4px の対が
    // 含まれることを必須化することで、interpolation 中の中途値も検出される。
    expect(boxShadow).toMatch(DUAL_SHADOW_PATTERN);
  });

  test("ホームの記事カードリンク (a) に Tab で到達して二重リングが出る", async ({
    page,
  }) => {
    await page.goto("/");

    const firstCardLink = page.locator("a[href^='/posts/']").first();
    await firstCardLink.waitFor({ state: "visible" });

    // 「最初の posts へのリンク」を一意に id 付与してから Tab で到達する。
    // a[href^='/posts/'] は複数マッチするため、Tab 到達確認用に
    // data 属性を一時付与して targetSelector を一意化する。
    await firstCardLink.evaluate((el) => {
      el.setAttribute("data-e2e-focus-target", "first-post");
    });

    await tabUntilFocused(page, "[data-e2e-focus-target='first-post']");
    await waitForFocusRingApplied(page, "[data-e2e-focus-target='first-post']");

    const boxShadow = await firstCardLink.evaluate(
      (el) => window.getComputedStyle(el).boxShadow,
    );

    expect(boxShadow).not.toBe("none");
    expect(boxShadow).not.toBe("");
    expect(boxShadow).toMatch(DUAL_SHADOW_PATTERN);
  });

  test("PostDetail のページネーションリンクに Tab で到達して二重リングが出る", async ({
    page,
  }) => {
    // PostDetail の `← TOPに戻る` リンク (variant=navigation) は focusRingStyles
    // を適用しているため、box-shadow が描画される。
    const postId = getLatestPostId();
    await page.goto(`/posts/${postId}`);

    const backLink = page.getByRole("link", { name: /TOPに戻る/ });
    await backLink.waitFor({ state: "visible" });

    // 同様に data 属性で一意化してから Tab 到達。
    await backLink.evaluate((el) => {
      el.setAttribute("data-e2e-focus-target", "back-link");
    });

    await tabUntilFocused(page, "[data-e2e-focus-target='back-link']");
    await waitForFocusRingApplied(page, "[data-e2e-focus-target='back-link']");

    const boxShadow = await backLink.evaluate(
      (el) => window.getComputedStyle(el).boxShadow,
    );

    expect(boxShadow).not.toBe("none");
    expect(boxShadow).not.toBe("");
    expect(boxShadow).toMatch(DUAL_SHADOW_PATTERN);
  });
});
