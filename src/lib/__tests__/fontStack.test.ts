import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  bodyFontStack,
  fontAssetPaths,
  formatFontStack,
} from "../fontStack.ts";

/**
 * Editorial Citrus 本文タイポグラフィ (Issue #387) のフォント実適用テスト。
 *
 * 受け入れ基準:
 *   (i)  @font-face で Newsreader VF を読み込み、font-display: swap
 *   (ii) <link rel="preload" as="font" type="font/woff2" crossorigin> を index.html に追加
 *   (iii) フォントスタックが Newsreader → Noto Serif JP → Hiragino Mincho ProN
 *        → Yu Mincho → YuMincho → serif の順
 *   (v)  CLS < 0.1 を担保するため size-adjust または fallback metric override を適用
 *
 * 機械的に取得失敗 (woff2 不在) でも静的検証で受け入れ基準が壊れないよう、
 * 文字列スタック・@font-face 宣言・preload 属性を一次正本として固定する。
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../../..");

const readProjectFile = (relativePath: string): string => {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
};

describe("bodyFontStack", () => {
  it("Newsreader を一次指定にしている", () => {
    expect(bodyFontStack[0]).toBe("Newsreader");
  });

  it("和文フォールバックに Hiragino Mincho ProN と Yu Mincho を含む", () => {
    expect(bodyFontStack).toContain("Hiragino Mincho ProN");
    expect(bodyFontStack).toContain("Yu Mincho");
    expect(bodyFontStack).toContain("YuMincho");
  });

  it("Newsreader → Noto Serif JP → Hiragino Mincho ProN → Yu Mincho → YuMincho → serif の順で並ぶ", () => {
    expect([...bodyFontStack]).toEqual([
      "Newsreader",
      "Noto Serif JP",
      "Hiragino Mincho ProN",
      "Yu Mincho",
      "YuMincho",
      "serif",
    ]);
  });

  it("最後のフォールバックが generic family の serif になる", () => {
    expect(bodyFontStack[bodyFontStack.length - 1]).toBe("serif");
  });
});

describe("formatFontStack", () => {
  it("非 generic family をダブルクォートで括る", () => {
    const formatted = formatFontStack(bodyFontStack);
    expect(formatted).toContain('"Newsreader"');
    expect(formatted).toContain('"Hiragino Mincho ProN"');
  });

  it("generic family の serif はクォートせずにそのまま出力する", () => {
    const formatted = formatFontStack(bodyFontStack);
    expect(formatted.endsWith(", serif")).toBe(true);
    expect(formatted).not.toContain('"serif"');
  });

  it("カンマ区切りで family を結合する", () => {
    const formatted = formatFontStack(["A B", "C", "serif"]);
    expect(formatted).toBe('"A B", "C", serif');
  });
});

describe("index.html (preload リンク)", () => {
  const indexHtml = readProjectFile("index.html");

  it("Newsreader VF Latin を preload する link を含む", () => {
    expect(indexHtml).toContain(
      `href="${fontAssetPaths.newsreaderLatin}"`,
    );
    expect(indexHtml).toContain('rel="preload"');
  });

  it("preload link が as=\"font\" を指定している", () => {
    expect(indexHtml).toMatch(/rel="preload"[\s\S]*?as="font"/);
  });

  it("preload link が type=\"font/woff2\" を指定している", () => {
    expect(indexHtml).toMatch(/rel="preload"[\s\S]*?type="font\/woff2"/);
  });

  it("preload link が crossorigin 属性を持つ", () => {
    expect(indexHtml).toMatch(/rel="preload"[\s\S]*?crossorigin/);
  });
});

describe("src/index.css (@font-face と :root font-family)", () => {
  const indexCss = readProjectFile("src/index.css");

  it("Newsreader VF を @font-face で self-host 宣言する", () => {
    expect(indexCss).toMatch(/@font-face\s*{[^}]*font-family:\s*"Newsreader"/);
    expect(indexCss).toContain(fontAssetPaths.newsreaderLatin);
  });

  it("@font-face に font-display: swap を指定する (FOUT 許容)", () => {
    expect(indexCss).toMatch(/font-display:\s*swap/);
  });

  it("@font-face で size-adjust または ascent-override を指定し CLS を吸収する", () => {
    // どちらか (または両方) があれば fallback メトリクスとの差分を吸収できる
    const hasSizeAdjust = /size-adjust:\s*\d+(?:\.\d+)?%/.test(indexCss);
    const hasAscentOverride = /ascent-override:\s*\d+(?:\.\d+)?%/.test(indexCss);
    expect(hasSizeAdjust || hasAscentOverride).toBe(true);
  });

  it("@font-face で可変フォントの weight 範囲 (200..800) を宣言する", () => {
    expect(indexCss).toMatch(/font-weight:\s*200\s+800/);
  });

  it(":root の font-family が Newsreader を一次指定にしている", () => {
    expect(indexCss).toMatch(
      /:root\s*{[^}]*font-family:\s*"Newsreader"[^;]*serif/,
    );
  });

  it(":root の font-family に Hiragino Mincho ProN と Yu Mincho を含む", () => {
    const rootBlockMatch = indexCss.match(/:root\s*{([^}]*)}/);
    expect(rootBlockMatch).not.toBeNull();
    const rootBlock = rootBlockMatch?.[1] ?? "";
    expect(rootBlock).toContain("Hiragino Mincho ProN");
    expect(rootBlock).toContain("Yu Mincho");
  });
});

describe("panda.config.ts (theme.tokens.fonts.serif)", () => {
  const pandaConfig = readProjectFile("panda.config.ts");

  it("serif トークンに Newsreader 一次指定のスタックを定義している", () => {
    // tokens.fonts.serif の value 文字列に Newsreader が一次指定で入っていること
    expect(pandaConfig).toMatch(/serif:\s*{[\s\S]*?Newsreader[\s\S]*?serif/);
  });

  it("serif トークンに和文フォールバック Hiragino Mincho ProN と Yu Mincho を含む", () => {
    const fontsBlockMatch = pandaConfig.match(
      /fonts:\s*{[\s\S]*?serif:\s*{[\s\S]*?value:[\s\S]*?,\s*}/,
    );
    expect(fontsBlockMatch).not.toBeNull();
    const fontsBlock = fontsBlockMatch?.[0] ?? "";
    expect(fontsBlock).toContain("Hiragino Mincho ProN");
    expect(fontsBlock).toContain("Yu Mincho");
  });
});
