import { expect, test } from "@playwright/test";

/**
 * a11y: ARIA 構造回帰検査 (landmark + 見出し階層)
 *
 * `expect(locator).toMatchAriaSnapshot()` で、各ルートの **安定した骨格**
 * (landmark role と見出し階層) が崩れていないことを検査する。jsdom 単体テストの
 * data-* Tripwire (コンポーネント内部構造) と相補的に、**実ブラウザの accessibility
 * tree** 上で landmark / heading の階層が保たれていることを保証する層を担う。
 *
 * 対象 3 ルート (既存 e2e と同じ代表 URL):
 * - `/`              ホーム (HomePage / Editorial Bento)
 * - `/posts/:ts`     記事詳細 (代表 1 件、violations.spec.ts と同じ最新記事)
 * - `/anchor`        個人史タイムライン (AnchorPage)
 *
 * flaky 回避の設計方針:
 * - **動的内容を template に含めない**。記事タイトル / 公開日 / 著者 / 読了時間 /
 *   記事件数 (「記事 16 件」) / Coordinate の経過日数 (「193 日目」= 実行日で変動) /
 *   Markdown 本文 (見出し・段落・リンク) / 節目の日付・ラベルはすべて除外する。
 * - `toMatchAriaSnapshot` は template を **部分一致 (subset)** で照合する
 *   (template に書いた node が tree に存在すれば pass、tree 側の余剰 node は許容)。
 *   この性質を使い、template には「変わらない landmark の枠」と「固定文言の見出し」
 *   だけを列挙する。動的な listitem 群は意図的に省略する。
 * - テーマ切替 switch のアクセシブル名は現在テーマ (ライト/ダーク) で変わるため、
 *   名前を pin せず `switch` role の存在のみを検査する。
 *
 * このテストが捕捉する regression (= 部分一致でも teeth がある):
 * - landmark role の欠落・誤り (banner / main / contentinfo / navigation / region)
 * - 見出しレベルの逆転・変更 (h1 → h2 等)
 * - 固定見出し文言 ("Index" / "Anchor" / "節目一覧" / "各記事の座標") の消失
 * - ナビゲーションリンク ("TOPに戻る") の消失
 */

/**
 * 各ルートの代表 URL。記事詳細は violations.spec.ts の `post-detail-latest`
 * (最新記事) と同一 timestamp を採用し、e2e 全体で代表記事を揃える。
 */
const HOME_PATH = "/";
const POST_PATH = "/posts/20260307120000";
const ANCHOR_PATH = "/anchor";

test.describe("ARIA 構造: ホーム (/)", () => {
  test("banner / main / contentinfo の landmark 骨格を保持できる", async ({
    page,
  }) => {
    await page.goto(HOME_PATH);
    // biome-ignore lint/nursery/noPlaywrightNetworkidle: ARIA 構造スナップショットはフォント/画像の遅延ロードと React のハイドレーション完了後の最終 DOM を対象にする必要がある。特定要素待ちでは構造が安定する前に評価され得るため、ページ全体が静定する networkidle を意図的に使う (web-first assertion では代替不可)
    await page.waitForLoadState("networkidle");

    // banner: ブランドリンク (/ 遷移) とテーマ切替 switch。
    // switch のアクセシブル名はテーマで変わるため role のみ検査する。
    await expect(page.getByRole("banner")).toMatchAriaSnapshot(`
      - banner:
        - link "Lazy Note":
          - /url: /
        - switch
    `);

    // contentinfo: フッターのブランドリンクと著作権表記 (固定文言)。
    await expect(page.getByRole("contentinfo")).toMatchAriaSnapshot(`
      - contentinfo:
        - link "Lazy Note":
          - /url: /
        - text: © 2025 Lazy Note. All rights reserved.
    `);
  });

  test("Featured (h2) と Index (h3) の見出し階層を保持できる", async ({
    page,
  }) => {
    await page.goto(HOME_PATH);
    // biome-ignore lint/nursery/noPlaywrightNetworkidle: ARIA 構造スナップショットはフォント/画像の遅延ロードと React のハイドレーション完了後の最終 DOM を対象にする必要がある。特定要素待ちでは構造が安定する前に評価され得るため、ページ全体が静定する networkidle を意図的に使う (web-first assertion では代替不可)
    await page.waitForLoadState("networkidle");

    // Featured カードは最新記事タイトルを h2 として持つ。タイトル文言・遷移先 URL
    // は動的なので pin せず、article 配下にリンク化された h2 が存在することのみを
    // 検査する (level のみ pin)。`heading` の親が link である構造も含めて照合する。
    await expect(page.getByRole("main").getByRole("article").first())
      .toMatchAriaSnapshot(`
      - article:
        - link:
          - heading [level=2]
    `);

    // Index TOC は固定見出し "Index" を h3 として持つ region。8 記事目以降を列挙する
    // listitem 群は動的なので省略し、region + 固定見出しの存在のみ検査する。
    // Featured の h2 と Index の h3 がともに存在することで、h2 → h3 の階層逆転が
    // 起きていない (= h3 セクションが h2 セクションより上位に来ていない) ことを担保する。
    await expect(page.getByRole("region", { name: "Index" }))
      .toMatchAriaSnapshot(`
      - region "Index":
        - heading "Index" [level=3]
    `);
  });
});

test.describe("ARIA 構造: 記事詳細 (/posts/:timestamp)", () => {
  test("ページナビゲーションと記事見出し (h1) の骨格を保持できる", async ({
    page,
  }) => {
    await page.goto(POST_PATH);
    // biome-ignore lint/nursery/noPlaywrightNetworkidle: ARIA 構造スナップショットはフォント/画像の遅延ロードと React のハイドレーション完了後の最終 DOM を対象にする必要がある。特定要素待ちでは構造が安定する前に評価され得るため、ページ全体が静定する networkidle を意図的に使う (web-first assertion では代替不可)
    await page.waitForLoadState("networkidle");

    // 記事詳細の安定骨格:
    // - 「ページナビゲーション」nav 内の "TOPに戻る" リンク (固定文言 / / 遷移)。
    //   矢印「←」は aria-hidden な装飾 span に分離済み (Issue #708) のため
    //   accessibility tree から除外され、アクセシブル名は "TOPに戻る" になる。
    // - article 直下の記事タイトル h1 (文言は動的なので level のみ検査)
    // Markdown 本文の h2/h3 や段落・リンクは記事ごとに変わるため含めない。
    await expect(page.getByRole("main")).toMatchAriaSnapshot(`
      - main:
        - navigation "ページナビゲーション":
          - link "TOPに戻る":
            - /url: /
        - article:
          - heading [level=1]
    `);
  });

  test("banner / contentinfo の landmark 骨格を保持できる", async ({ page }) => {
    await page.goto(POST_PATH);
    // biome-ignore lint/nursery/noPlaywrightNetworkidle: ARIA 構造スナップショットはフォント/画像の遅延ロードと React のハイドレーション完了後の最終 DOM を対象にする必要がある。特定要素待ちでは構造が安定する前に評価され得るため、ページ全体が静定する networkidle を意図的に使う (web-first assertion では代替不可)
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("banner")).toMatchAriaSnapshot(`
      - banner:
        - link "Lazy Note":
          - /url: /
        - switch
    `);

    await expect(page.getByRole("contentinfo")).toMatchAriaSnapshot(`
      - contentinfo:
        - link "Lazy Note":
          - /url: /
        - text: © 2025 Lazy Note. All rights reserved.
    `);
  });
});

test.describe("ARIA 構造: 個人史タイムライン (/anchor)", () => {
  test("h1 と 2 つの region (h2) の見出し階層を保持できる", async ({ page }) => {
    await page.goto(ANCHOR_PATH);
    // biome-ignore lint/nursery/noPlaywrightNetworkidle: ARIA 構造スナップショットはフォント/画像の遅延ロードと React のハイドレーション完了後の最終 DOM を対象にする必要がある。特定要素待ちでは構造が安定する前に評価され得るため、ページ全体が静定する networkidle を意図的に使う (web-first assertion では代替不可)
    await page.waitForLoadState("networkidle");

    // AnchorPage の安定骨格:
    // - ページ見出し h1 "Anchor" (固定文言)
    // - region "節目一覧" + 見出し h2 "節目一覧" (固定文言)
    // - region "各記事の座標" + 見出し h2 "各記事の座標" (固定文言)
    // 各 region 内の listitem (節目 / 各記事の座標) は内容が動的なので省略する。
    await expect(page.getByRole("main")).toMatchAriaSnapshot(`
      - main:
        - heading "Anchor" [level=1]
        - region "節目一覧":
          - heading "節目一覧" [level=2]
        - region "各記事の座標":
          - heading "各記事の座標" [level=2]
    `);
  });

  test("banner / contentinfo の landmark 骨格を保持できる", async ({ page }) => {
    await page.goto(ANCHOR_PATH);
    // biome-ignore lint/nursery/noPlaywrightNetworkidle: ARIA 構造スナップショットはフォント/画像の遅延ロードと React のハイドレーション完了後の最終 DOM を対象にする必要がある。特定要素待ちでは構造が安定する前に評価され得るため、ページ全体が静定する networkidle を意図的に使う (web-first assertion では代替不可)
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("banner")).toMatchAriaSnapshot(`
      - banner:
        - link "Lazy Note":
          - /url: /
        - switch
    `);

    await expect(page.getByRole("contentinfo")).toMatchAriaSnapshot(`
      - contentinfo:
        - link "Lazy Note":
          - /url: /
        - text: © 2025 Lazy Note. All rights reserved.
    `);
  });
});
