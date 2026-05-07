# 07. アクセシビリティとパフォーマンス

## 設計方針

- アクセシビリティは **「読み物としての質」** を担保する基礎条件と位置づける
- 「達成すれば良い」ではなく **「ハードゲート (失敗 = merge 不可)」** と「モニタリング (継続観測)」を分離
- AAA 7:1 は **culori 実測** で保証 (Lighthouse の値に依存しない、死守ポイント)
- 計測値は **Issue 単位の AC に紐付け**、CI で機械的に検証

## ハードゲート (G1〜G5)

| ID | ゲート                                  | 計測手段                              | 閾値                              | 失敗時挙動            |
| -- | --------------------------------------- | ------------------------------------- | --------------------------------- | --------------------- |
| G1 | **axe-core violations**                 | `@axe-core/playwright`                | violations = **0**                | merge ブロック        |
| G2 | **コントラスト AAA 実測**               | `scripts/calculateContrast.ts` (culori) | 本文 ≥ **7.20:1**、UI 大文字 ≥ 4.50:1 | merge ブロック    |
| G3 | **INP (Interaction to Next Paint)**     | Playwright + `web-vitals`             | < **150 ms** (95 percentile)      | merge ブロック        |
| G4 | **CLS (Cumulative Layout Shift)**       | Playwright + `web-vitals`             | < **0.05**                        | merge ブロック        |
| G5 | **Visual Regression diff**              | Playwright VR snapshot                | < **0.1%**                        | merge ブロック        |

> G1〜G5 はすべて GitHub Actions の必須ステータスに登録します。

## モニタリング (M1〜M3)

| ID | 観測項目                                  | 計測手段                            | 目標                  | 失敗時挙動                  |
| -- | ----------------------------------------- | ----------------------------------- | --------------------- | --------------------------- |
| M1 | Lighthouse a11y スコア                    | Lighthouse CI (lab)                 | **≥ 95**              | warning コメント (block しない) |
| M2 | Lighthouse perf スコア                    | Lighthouse CI (lab)                 | **≥ 90**              | warning コメント            |
| M3 | PSI field (CrUX 由来 LCP / INP / CLS p75) | PageSpeed Insights API (定期実行)   | LCP < 2.5s / INP < 200ms / CLS < 0.1 | 自動 Issue (Ext-9) |

> M1 / M2 を「ゲートにしない」のは、Lighthouse の値に揺らぎがあり PR 単位での block には不適だからです。代わりに culori 実測 (G2) と web-vitals (G3 / G4) でゲート化します。

## GitHub Actions (擬似コード)

```yaml
# .github/workflows/quality.yml (Issue #4a / #4b でフル実装)
name: Quality Gates
on: [pull_request]

jobs:
  a11y-and-vr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm i --frozen-lockfile
      - run: pnpm build
      - name: Run axe + VR (G1, G5)
        run: pnpm test:e2e:axe-and-vr
      - name: Contrast AAA real measurement (G2)
        run: pnpm contrast:check
      - name: Web Vitals (G3, G4)
        run: pnpm test:e2e:vitals
      - name: Lighthouse (M1, M2 — non-blocking)
        run: pnpm lhci autorun
        continue-on-error: true
```

## Playwright + axe-core 実装スケッチ

```ts
// e2e/axe.spec.ts (Issue #4a)
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const targets = [
  { name: "home", path: "/" },
  { name: "post-detail", path: "/posts/20260307120000" },
  { name: "404", path: "/this-route-does-not-exist" },
];

for (const t of targets) {
  test(`a11y: ${t.name} に WCAG 2.2 AA / AAA 違反がない`, async ({ page }) => {
    await page.goto(t.path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
```

## コントラスト実測スクリプト (scripts/calculateContrast.ts)

スケルトンは本コミットで配置 (TODO コメントのみ、実装は Issue #1 / #0a の Phase 0 で行う)。

```ts
// scripts/calculateContrast.ts (本コミットでスケルトン配置)
//
// TODO(#0a): culori で OKLCH → sRGB 変換し WCAG コントラスト比を実測する
// TODO(#0a): tokens.colors の主要ペア (本文 / メタ / リンク / focus) を網羅
// TODO(#0a): 本文 ≥ 7.20, UI 大文字 ≥ 4.50 を要求し、未満は exit 1
// TODO(#0a): 1.05 倍以内のマージン僅少ペアは PR コメントで warn
```

## フォントローディング戦略 (再掲)

- preload は Newsreader VF wght axis 1 本のみ
- `font-display: swap` + `size-adjust` + `ascent-override` / `descent-override` で **CLS を抑制**
- 詳細は `03-typography.md`

## SR (スクリーンリーダ) 検証チェックリスト

リリース前 / 主要変更時の **手動チェック必須**。

### VoiceOver + Safari (macOS)

- [ ] ホームの Featured / Bento / Index がランドマークと共に正しく読み上げ
- [ ] 記事詳細でドロップキャップが **重複読み上げされない** (aria-hidden + 隠し span 戦略)
- [ ] TOC 項目を VO + 矢印キーで巡回でき、現在位置が分かる
- [ ] 404 ページで「ページが見つかりません」が `<h1>` として読み上げ

### NVDA + Firefox (Windows)

- [ ] 同上 4 項目
- [ ] focus visible が常に視認できる (citrus-500 の outline)
- [ ] skip-to-content リンクが Tab で最初に到達できる

## キーボード操作

- 全 interactive 要素は Tab で到達可能、ESC でモーダル閉じ
- focus trap は **モーダル開閉時のみ**。常時トラップは作らない (PWA 化されない限り)
- ドロップキャップは focusable にしない (装飾扱い)

## 動的コンテンツの a11y

- 検索 (Ext-3) は ARIA Live Region で結果数を SR に伝える
- TOC のスクロールスパイは aria-current="location"

## パフォーマンス予算 (Issue #4b)

| 指標                          | 予算                             |
| ----------------------------- | -------------------------------- |
| 初回 HTML サイズ              | < **40 KB** (gzip)               |
| First Party JS 合計 (gzip)    | < **120 KB**                     |
| Font 合計 (woff2)             | < **150 KB** (Newsreader + Mono) |
| Critical CSS                  | < **20 KB** (inline)             |
| LCP (lab、desktop)            | < **2.0 s**                      |
| LCP (lab、mid-tier mobile)    | < **2.8 s**                      |

## prefers-reduced-* 対応

- `prefers-reduced-motion: reduce` → モーション全停止 / 減衰 (`05-motion-and-delight.md`)
- `prefers-reduced-transparency: reduce` → grain / blur 非表示
- `prefers-color-scheme: dark` → dark テーマに自動切替 (Ext-5 で UI トグル追加)

## カラーモード切替時の Flash 防止

- HTML head に inline script で `localStorage` を即時読み出し → `<html data-theme>` 属性を付与
- React mount 前に確定するため FOUC が起きない
- 詳細実装は Ext-5

## 実装ロードマップとの紐付け

- G1 / G5 → Issue **#4a**
- G2 → Issue **#0a**
- G3 / G4 / 予算 → Issue **#4b**
- grain / reduced 系 → Issue **#4c**
