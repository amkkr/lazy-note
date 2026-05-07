#!/usr/bin/env node

/**
 * AAA コントラスト実測スクリプト
 *
 * Editorial Citrus デザインリニューアル RFC の死守ポイント 1
 * 「AAA 7:1 を culori 実測で担保」を実現する CLI。
 *
 * 仕様:
 *   - docs/rfc/editorial-citrus/02-color-system.md (AAA 実測ルール)
 *   - docs/rfc/editorial-citrus/07-accessibility-and-performance.md (G2 ハードゲート)
 *
 * Lighthouse のコントラスト値には依存しない (culori 実測のみが根拠)。
 *
 * 出力:
 *   - 標準: 整形された人間向けレポート (AAA / AA / NG)
 *   - --csv: docs/contrast-matrix.csv 用の CSV (surface × fg 全組合せ)
 *
 * 使い方:
 *   pnpm contrast:check                # ペアの AAA / AA 検証 (CI 用)
 *   pnpm contrast:matrix               # docs/contrast-matrix.csv を生成
 *   node scripts/calculateContrast.ts --strict
 *     # マージン僅少 (1.05 倍以内) も fail にする
 */

import { parse, wcagContrast, wcagLuminance } from "culori";
import {
  contrastThresholds,
  oklchPrimitives,
  semanticColorTokens,
} from "../src/lib/colorTokens.ts";

// =============================================================================
// 型定義
// =============================================================================

interface ContrastPair {
  readonly name: string;
  readonly fg: string;
  readonly bg: string;
  /** 本文 7.20 / UI 大文字 4.50 / 装飾 (>= 3.0) */
  readonly minRatio: number;
  /** 用途タグ (本文 / リンク / focus / status / decorative) */
  readonly category: ContrastCategory;
}

type ContrastCategory =
  | "body"
  | "ui-large"
  | "link"
  | "focus"
  | "status"
  | "decorative";

interface ContrastResult {
  readonly pair: ContrastPair;
  readonly ratio: number;
  readonly fgLuminance: number;
  readonly bgLuminance: number;
  /** AAA (>= 7.00) を満たすか */
  readonly aaa: boolean;
  /** AA (>= 4.50) を満たすか */
  readonly aa: boolean;
  /** ペア固有閾値 (minRatio) を満たすか */
  readonly passed: boolean;
  /** マージン僅少 (1.05 倍以内) か */
  readonly marginal: boolean;
}

// =============================================================================
// 検証ペアの定義
// =============================================================================

/**
 * AAA を要求する検証ペア。本文・リンク・focus・status を網羅。
 */
const getContrastPairs = (): readonly ContrastPair[] => {
  return [
    // ---------- 本文 (AAA 7.20:1 を要求) ----------
    {
      name: "body/light: ink-primary-on-cream × cream-50",
      fg: oklchPrimitives.ink.primaryOnCream,
      bg: oklchPrimitives.cream["50"],
      minRatio: contrastThresholds.bodyText,
      category: "body",
    },
    {
      name: "body/light: ink-primary-on-cream × cream-100",
      fg: oklchPrimitives.ink.primaryOnCream,
      bg: oklchPrimitives.cream["100"],
      minRatio: contrastThresholds.bodyText,
      category: "body",
    },
    {
      name: "body/dark: bone-50 × sumi-950",
      fg: oklchPrimitives.bone["50"],
      bg: oklchPrimitives.sumi["950"],
      minRatio: contrastThresholds.bodyText,
      category: "body",
    },
    // ---------- メタ・キャプション (AAA 目標) ----------
    {
      name: "meta/light: ink-secondary-on-cream × cream-50",
      fg: oklchPrimitives.ink.secondaryOnCream,
      bg: oklchPrimitives.cream["50"],
      minRatio: contrastThresholds.bodyText,
      category: "body",
    },
    {
      name: "meta/dark: bone-100 × sumi-950",
      fg: oklchPrimitives.bone["100"],
      bg: oklchPrimitives.sumi["950"],
      minRatio: contrastThresholds.bodyText,
      category: "body",
    },
    // ---------- リンク (AAA を狙う) ----------
    {
      name: "link/light: indigo-500 × cream-50",
      fg: oklchPrimitives.indigo["500"],
      bg: oklchPrimitives.cream["50"],
      minRatio: contrastThresholds.bodyText,
      category: "link",
    },
    {
      name: "link/dark: indigo-300 × sumi-950",
      fg: oklchPrimitives.indigo["300"],
      bg: oklchPrimitives.sumi["950"],
      minRatio: contrastThresholds.bodyText,
      category: "link",
    },
    // ---------- focus 二重リング ----------
    // accent ボタン上で、外側 ink-900 + 内側 citrus-500 の構成。
    // - 外側 ink-900 はボタン背景 (persimmon-600) に対して WCAG 1.4.11 (UI 装飾) の
    //   3:1 を要求 (focus 専用色なので、視認可能ライン)
    // - 内側 citrus-500 は外側 ink-900 に対して AA 4.50:1 を要求 (リング自体の認知)
    // 設計書 02-color-system.md では通常 focus も二重リング (ink-900 + citrus-500)
    // を採用する方針で、citrus-500 を直接 cream-50 上に置かない。
    {
      name: "focus/outer: ink-900 × persimmon-600 (accent ボタン上、UI 装飾 3:1)",
      fg: oklchPrimitives.ink["900"],
      bg: oklchPrimitives.persimmon["600"],
      minRatio: 3.0,
      category: "focus",
    },
    {
      name: "focus/inner: citrus-500 × ink-900 (二重リング内側、AA 4.50)",
      fg: oklchPrimitives.citrus["500"],
      bg: oklchPrimitives.ink["900"],
      minRatio: contrastThresholds.largeText,
      category: "focus",
    },
    {
      name: "focus/dark: citrus-500 × sumi-950 (dark 通常 focus、AA 4.50)",
      fg: oklchPrimitives.citrus["500"],
      bg: oklchPrimitives.sumi["950"],
      minRatio: contrastThresholds.largeText,
      category: "focus",
    },
    // ---------- status (色相なし、sumi 階調) ----------
    {
      name: "status/light: sumi-700 × cream-50",
      fg: oklchPrimitives.sumi["700"],
      bg: oklchPrimitives.cream["50"],
      minRatio: contrastThresholds.bodyText,
      category: "status",
    },
    {
      name: "status/dark: sumi-500 × sumi-950",
      fg: oklchPrimitives.sumi["500"],
      bg: oklchPrimitives.sumi["950"],
      minRatio: contrastThresholds.largeText,
      category: "status",
    },
    // ---------- ブランド色 (CTA テキスト) ----------
    {
      name: "cta/light: cream-50 × persimmon-600",
      fg: oklchPrimitives.cream["50"],
      bg: oklchPrimitives.persimmon["600"],
      minRatio: contrastThresholds.largeText,
      category: "ui-large",
    },
    {
      name: "cta/dark: ink-900 × persimmon-500",
      fg: oklchPrimitives.ink["900"],
      bg: oklchPrimitives.persimmon["500"],
      minRatio: contrastThresholds.largeText,
      category: "ui-large",
    },
  ];
};

// =============================================================================
// 計算ロジック
// =============================================================================

/**
 * OKLCH 文字列から sRGB の WCAG 相対輝度を取得する。
 *
 * culori の `wcagLuminance` が内部で sRGB → linear (gamma 補正) →
 * 0.2126 R + 0.7152 G + 0.0722 B を行う WCAG 2.x 規定の実装。
 * これは Lighthouse の値ではなく WCAG 仕様を直接実装したもの。
 */
const luminance = (oklchString: string): number => {
  const color = parse(oklchString);
  if (!color) {
    throw new Error(`Failed to parse OKLCH: ${oklchString}`);
  }
  return wcagLuminance(color);
};

/**
 * 単一ペアのコントラスト比を WCAG 2.x 仕様で計算する。
 *
 * 実体は culori の `wcagContrast` で、(L1 + 0.05) / (L2 + 0.05)
 * (L1, L2 は明度の高い方・低い方の sRGB 相対輝度)。
 */
const computeContrast = (pair: ContrastPair): ContrastResult => {
  const fgColor = parse(pair.fg);
  const bgColor = parse(pair.bg);
  if (!fgColor || !bgColor) {
    throw new Error(
      `Failed to parse OKLCH pair: fg=${pair.fg} bg=${pair.bg}`,
    );
  }

  const ratio = wcagContrast(fgColor, bgColor);
  const fgLuminance = wcagLuminance(fgColor);
  const bgLuminance = wcagLuminance(bgColor);

  const aaa = ratio >= 7.0;
  const aa = ratio >= 4.5;
  const passed = ratio >= pair.minRatio;
  const marginal =
    pair.minRatio > 0 && ratio / pair.minRatio < contrastThresholds.marginalRatio;

  return { pair, ratio, fgLuminance, bgLuminance, aaa, aa, passed, marginal };
};

// =============================================================================
// CSV (surface × fg 全組合せ)
// =============================================================================

interface NamedColor {
  readonly label: string;
  readonly value: string;
  readonly role: "surface" | "fg";
}

/**
 * 全 surface × fg の組合せ行列を生成する。
 *
 * surface = 背景候補 (cream / sumi / bone / persimmon / ink-900)
 * fg = 前景候補 (ink / bone / sumi / persimmon / indigo / citrus / cream)
 */
const collectMatrixColors = (): {
  readonly surfaces: readonly NamedColor[];
  readonly fgs: readonly NamedColor[];
} => {
  const surfaces: NamedColor[] = [
    { label: "cream-50", value: oklchPrimitives.cream["50"], role: "surface" },
    {
      label: "cream-100",
      value: oklchPrimitives.cream["100"],
      role: "surface",
    },
    { label: "sumi-950", value: oklchPrimitives.sumi["950"], role: "surface" },
    { label: "sumi-700", value: oklchPrimitives.sumi["700"], role: "surface" },
    { label: "sumi-600", value: oklchPrimitives.sumi["600"], role: "surface" },
    {
      label: "persimmon-600",
      value: oklchPrimitives.persimmon["600"],
      role: "surface",
    },
    {
      label: "persimmon-500",
      value: oklchPrimitives.persimmon["500"],
      role: "surface",
    },
    { label: "ink-900", value: oklchPrimitives.ink["900"], role: "surface" },
  ];

  const fgs: NamedColor[] = [
    {
      label: "ink-primary-on-cream",
      value: oklchPrimitives.ink.primaryOnCream,
      role: "fg",
    },
    {
      label: "ink-secondary-on-cream",
      value: oklchPrimitives.ink.secondaryOnCream,
      role: "fg",
    },
    { label: "ink-900", value: oklchPrimitives.ink["900"], role: "fg" },
    { label: "bone-50", value: oklchPrimitives.bone["50"], role: "fg" },
    { label: "bone-100", value: oklchPrimitives.bone["100"], role: "fg" },
    { label: "sumi-500", value: oklchPrimitives.sumi["500"], role: "fg" },
    { label: "sumi-600", value: oklchPrimitives.sumi["600"], role: "fg" },
    { label: "sumi-700", value: oklchPrimitives.sumi["700"], role: "fg" },
    { label: "cream-50", value: oklchPrimitives.cream["50"], role: "fg" },
    { label: "indigo-500", value: oklchPrimitives.indigo["500"], role: "fg" },
    { label: "indigo-300", value: oklchPrimitives.indigo["300"], role: "fg" },
    { label: "citrus-500", value: oklchPrimitives.citrus["500"], role: "fg" },
    {
      label: "persimmon-600",
      value: oklchPrimitives.persimmon["600"],
      role: "fg",
    },
  ];

  return { surfaces, fgs };
};

const verdict = (ratio: number): string => {
  if (ratio >= 7.0) {
    return "AAA";
  }
  if (ratio >= 4.5) {
    return "AA";
  }
  if (ratio >= 3.0) {
    return "AA-large";
  }
  return "FAIL";
};

const renderCsv = (): string => {
  const { surfaces, fgs } = collectMatrixColors();
  const lines: string[] = [
    "surface,fg,surface_oklch,fg_oklch,ratio,verdict,aaa,aa",
  ];

  for (const surface of surfaces) {
    for (const fg of fgs) {
      const fgColor = parse(fg.value);
      const bgColor = parse(surface.value);
      if (!fgColor || !bgColor) {
        continue;
      }
      const ratio = wcagContrast(fgColor, bgColor);
      const aaa = ratio >= 7.0 ? "yes" : "no";
      const aa = ratio >= 4.5 ? "yes" : "no";
      lines.push(
        [
          surface.label,
          fg.label,
          `"${surface.value}"`,
          `"${fg.value}"`,
          ratio.toFixed(2),
          verdict(ratio),
          aaa,
          aa,
        ].join(","),
      );
    }
  }

  return `${lines.join("\n")}\n`;
};

// =============================================================================
// セマンティックトークンの一貫性チェック
// =============================================================================

/**
 * semanticColorTokens の bg.canvas / fg.primary / accent.link の組合せが
 * AAA を満たすかを検証する (light / dark 両方)。
 */
const verifySemanticPairs = (): readonly ContrastResult[] => {
  const semanticPairs: readonly ContrastPair[] = [
    {
      name: "semantic/light: fg.primary × bg.canvas",
      fg: semanticColorTokens.fgPrimary.light,
      bg: semanticColorTokens.bgCanvas.light,
      minRatio: contrastThresholds.bodyText,
      category: "body",
    },
    {
      name: "semantic/dark: fg.primary × bg.canvas",
      fg: semanticColorTokens.fgPrimary.dark,
      bg: semanticColorTokens.bgCanvas.dark,
      minRatio: contrastThresholds.bodyText,
      category: "body",
    },
    {
      name: "semantic/light: fg.secondary × bg.canvas",
      fg: semanticColorTokens.fgSecondary.light,
      bg: semanticColorTokens.bgCanvas.light,
      minRatio: contrastThresholds.bodyText,
      category: "body",
    },
    {
      name: "semantic/dark: fg.secondary × bg.canvas",
      fg: semanticColorTokens.fgSecondary.dark,
      bg: semanticColorTokens.bgCanvas.dark,
      minRatio: contrastThresholds.bodyText,
      category: "body",
    },
    {
      name: "semantic/light: accent.link × bg.canvas",
      fg: semanticColorTokens.accentLink.light,
      bg: semanticColorTokens.bgCanvas.light,
      minRatio: contrastThresholds.bodyText,
      category: "link",
    },
    {
      name: "semantic/dark: accent.link × bg.canvas",
      fg: semanticColorTokens.accentLink.dark,
      bg: semanticColorTokens.bgCanvas.dark,
      minRatio: contrastThresholds.bodyText,
      category: "link",
    },
  ];

  return semanticPairs.map(computeContrast);
};

// =============================================================================
// レポート出力
// =============================================================================

const formatRow = (result: ContrastResult): string => {
  const marker = result.passed ? "OK " : "NG ";
  const verdictTag = result.aaa ? "AAA" : result.aa ? "AA " : "---";
  const marginalTag = result.marginal ? " (margin<5%)" : "";
  const ratioStr = result.ratio.toFixed(2).padStart(5, " ");
  const minStr = result.pair.minRatio.toFixed(2);
  return `  ${marker}[${verdictTag}] ${ratioStr}:1 (>= ${minStr}) ${result.pair.name}${marginalTag}`;
};

const main = (): void => {
  const args = process.argv.slice(2);
  const outputCsv = args.includes("--csv");
  const strict = args.includes("--strict");

  if (outputCsv) {
    process.stdout.write(renderCsv());
    return;
  }

  const pairs = getContrastPairs();
  const results = pairs.map(computeContrast);
  const semanticResults = verifySemanticPairs();

  console.log("== Editorial Citrus AAA コントラスト実測 ==");
  console.log(
    `本文閾値: ${contrastThresholds.bodyText} / 大文字: ${contrastThresholds.largeText}`,
  );
  console.log("");
  console.log("[primitive ペア]");
  for (const result of results) {
    console.log(formatRow(result));
  }
  console.log("");
  console.log("[semantic トークン整合性]");
  for (const result of semanticResults) {
    console.log(formatRow(result));
  }

  const allResults = [...results, ...semanticResults];
  const failed = allResults.filter((r) => !r.passed);
  const marginal = allResults.filter((r) => r.passed && r.marginal);

  console.log("");
  console.log(
    `合計: ${allResults.length} / NG: ${failed.length} / マージン僅少: ${marginal.length}`,
  );

  if (failed.length > 0) {
    console.error("\nNG ペアあり: AAA / AA を満たしていません");
    process.exit(1);
  }

  if (strict && marginal.length > 0) {
    console.error("\n--strict 指定: マージン僅少ペアあり");
    process.exit(1);
  }

  // GitHub Actions 上ではマージン僅少を ::warning:: で出力する
  if (process.env.GITHUB_ACTIONS === "true" && marginal.length > 0) {
    for (const result of marginal) {
      console.log(
        `::warning::マージン僅少 ratio=${result.ratio.toFixed(2)} ${result.pair.name}`,
      );
    }
  }
};

main();
