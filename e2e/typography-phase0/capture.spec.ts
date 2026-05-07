import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Phase 0 タイポグラフィ採点用スクリーンショット撮影
 *
 * 3 viewport (mobile/tablet/desktop) × 3 surface (cream-50/cream-100/sumi-950)
 *  × 3 和文 stack 候補 (hiragino-mincho/hiragino-sans/yu-gothic) = 27 枚
 *
 * 出力先: docs/typography-phase0/screenshots/{viewport}/{surface}/{jp}.png
 *
 * 参照:
 * - docs/rfc/editorial-citrus/03-typography.md
 * - docs/rfc/editorial-citrus/08-roadmap.md (#0b)
 */

type Viewport = {
  readonly name: "mobile" | "tablet" | "desktop";
  readonly width: number;
  readonly height: number;
};

type Surface = "cream-50" | "cream-100" | "sumi-950";

type JpStack = "hiragino-mincho" | "hiragino-sans" | "yu-gothic";

const viewports: Viewport[] = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 900 },
];

const surfaces: Surface[] = ["cream-50", "cream-100", "sumi-950"];

const jpStacks: JpStack[] = ["hiragino-mincho", "hiragino-sans", "yu-gothic"];

const sampleHtmlPath = resolve(here, "sample.html");
const sampleHtmlUrl = pathToFileURL(sampleHtmlPath).href;

const screenshotsRoot = resolve(
  here,
  "..",
  "..",
  "docs",
  "typography-phase0",
  "screenshots",
);

const buildShotPath = (
  vp: Viewport,
  surface: Surface,
  jp: JpStack,
): string =>
  resolve(screenshotsRoot, vp.name, surface, `${jp}.png`);

test.describe("Phase 0 typography sample capture (3vp x 3surface x 3jp = 27 shots)", () => {
  for (const vp of viewports) {
    for (const surface of surfaces) {
      for (const jp of jpStacks) {
        const caseName = `${vp.name} / ${surface} / ${jp} の組版サンプルを撮影できる`;

        test(caseName, async ({ page }) => {
          await page.setViewportSize({
            width: vp.width,
            height: vp.height,
          });

          await page.goto(`${sampleHtmlUrl}?surface=${surface}&jp=${jp}`);

          // クエリパラメータを data 属性に反映 (CSS の attr セレクタで切替)
          await page.evaluate(
            ({ surfaceValue, jpValue }) => {
              const body = document.body;
              body.setAttribute("data-surface", surfaceValue);
              body.setAttribute("data-jp", jpValue);
            },
            { surfaceValue: surface, jpValue: jp },
          );

          // self-host フォントの読み込み完了を待つ
          await page.evaluate(async () => {
            await document.fonts.ready;
          });

          // レイアウトの落ち着き (CLS 抑制) を待つ
          await page.waitForLoadState("networkidle");

          const shotPath = buildShotPath(vp, surface, jp);
          mkdirSync(dirname(shotPath), { recursive: true });

          await page.screenshot({
            path: shotPath,
            fullPage: true,
          });
        });
      }
    }
  }
});
