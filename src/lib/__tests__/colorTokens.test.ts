import { parse, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import {
  contrastThresholds,
  oklchPrimitives,
  semanticColorTokens,
} from "../colorTokens.ts";

/**
 * Editorial Citrus デザインリニューアル (Issue #358) のカラートークンテスト。
 *
 * 仕様: docs/rfc/editorial-citrus/02-color-system.md
 *
 * 目的:
 *   1. 本文ペアが AAA + マージン (>= 7.20:1) を満たすことを CI で要求する
 *   2. リンク・focus・status の各ペアが用途別の閾値を満たす
 *   3. semantic トークン (light/dark) と primitives の対応関係が崩れていないこと
 *
 * Lighthouse のコントラスト計算には依存せず、culori の OKLCH → sRGB → WCAG 比
 * で実測する (RFC §"AAA 実測ルール" の死守ポイント 1)。
 */

/**
 * 2 つの OKLCH 文字列の WCAG 2.x コントラスト比を返す。
 *
 * culori の `wcagContrast` は (L1 + 0.05) / (L2 + 0.05) (L1 ≥ L2) を実装しており、
 * sRGB → linear (gamma 補正) → 0.2126R + 0.7152G + 0.0722B の WCAG 規定通り。
 */
const ratio = (fg: string, bg: string): number => {
  const fgColor = parse(fg);
  const bgColor = parse(bg);
  if (!fgColor || !bgColor) {
    throw new Error(`OKLCH の parse に失敗: fg=${fg} bg=${bg}`);
  }
  return wcagContrast(fgColor, bgColor);
};

describe("oklchPrimitives", () => {
  it("OKLCH 形式の文字列として culori で parse できる", () => {
    const allValues = [
      oklchPrimitives.cream["50"],
      oklchPrimitives.cream["100"],
      oklchPrimitives.bone["50"],
      oklchPrimitives.bone["100"],
      oklchPrimitives.ink.primaryOnCream,
      oklchPrimitives.ink.secondaryOnCream,
      oklchPrimitives.ink["900"],
      oklchPrimitives.sumi["500"],
      oklchPrimitives.sumi["600"],
      oklchPrimitives.sumi["700"],
      oklchPrimitives.sumi["950"],
      oklchPrimitives.persimmon["500"],
      oklchPrimitives.persimmon["600"],
      oklchPrimitives.persimmon["700"],
      oklchPrimitives.indigo["300"],
      oklchPrimitives.indigo["500"],
      oklchPrimitives.citrus["500"],
    ];

    for (const value of allValues) {
      const parsed = parse(value);
      expect(parsed?.mode).toBe("oklch");
    }
  });

  it("dark 既定背景 sumi-950 の hue が 220 (中性) に設定されている", () => {
    // 暖色 light との温度差圧縮のため、dark は H=220 中性で固定 (RFC 02 §温度設計)
    const parsed = parse(oklchPrimitives.sumi["950"]);
    expect(parsed?.mode).toBe("oklch");
    if (parsed?.mode === "oklch") {
      expect(parsed.h).toBe(220);
    }
  });

  it("light 暖色背景 cream-50 の hue が 85 に設定されている", () => {
    const parsed = parse(oklchPrimitives.cream["50"]);
    expect(parsed?.mode).toBe("oklch");
    if (parsed?.mode === "oklch") {
      expect(parsed.h).toBe(85);
    }
  });
});

describe("本文コントラスト (AAA + 1〜2% マージン、>= 7.20:1)", () => {
  it("light 本文 ink-primary-on-cream × cream-50 が 7.20:1 以上である", () => {
    const r = ratio(
      oklchPrimitives.ink.primaryOnCream,
      oklchPrimitives.cream["50"],
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("light 本文 ink-primary-on-cream × cream-100 (沈み込み背景) が 7.20:1 以上である", () => {
    const r = ratio(
      oklchPrimitives.ink.primaryOnCream,
      oklchPrimitives.cream["100"],
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("dark 本文 bone-50 × sumi-950 が 7.20:1 以上である", () => {
    const r = ratio(oklchPrimitives.bone["50"], oklchPrimitives.sumi["950"]);
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("light メタ ink-secondary-on-cream × cream-50 が 7.20:1 以上である", () => {
    const r = ratio(
      oklchPrimitives.ink.secondaryOnCream,
      oklchPrimitives.cream["50"],
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("dark メタ bone-100 × sumi-950 が 7.20:1 以上である", () => {
    const r = ratio(oklchPrimitives.bone["100"], oklchPrimitives.sumi["950"]);
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });
});

describe("リンクコントラスト (AAA + マージン、>= 7.20:1)", () => {
  it("light リンク indigo-500 × cream-50 が 7.20:1 以上である", () => {
    const r = ratio(oklchPrimitives.indigo["500"], oklchPrimitives.cream["50"]);
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("dark リンク indigo-300 × sumi-950 が 7.20:1 以上である", () => {
    const r = ratio(oklchPrimitives.indigo["300"], oklchPrimitives.sumi["950"]);
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });
});

describe("focus 二重リング (accent ボタン上、外 ink-900 + 内 citrus-500)", () => {
  it("外側 ink-900 × persimmon-600 が UI 装飾の 3:1 以上を満たす", () => {
    // WCAG 1.4.11 (Non-text Contrast) の UI コンポーネント装飾要素として 3:1
    const r = ratio(
      oklchPrimitives.ink["900"],
      oklchPrimitives.persimmon["600"],
    );
    expect(r).toBeGreaterThanOrEqual(3.0);
  });

  it("内側 citrus-500 × ink-900 が AA 4.50:1 以上である", () => {
    const r = ratio(oklchPrimitives.citrus["500"], oklchPrimitives.ink["900"]);
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("dark テーマの focus citrus-500 × sumi-950 が AA 4.50:1 以上である", () => {
    const r = ratio(oklchPrimitives.citrus["500"], oklchPrimitives.sumi["950"]);
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });
});

describe("status (色相なし、sumi 階調)", () => {
  it("light status sumi-700 × cream-50 が AAA 7.20:1 以上である", () => {
    const r = ratio(oklchPrimitives.sumi["700"], oklchPrimitives.cream["50"]);
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("dark status sumi-500 × sumi-950 が AA 4.50:1 以上である", () => {
    const r = ratio(oklchPrimitives.sumi["500"], oklchPrimitives.sumi["950"]);
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });
});

describe("CTA ボタン (Persimmon 単色)", () => {
  it("light CTA cream-50 on persimmon-600 が AA 4.50:1 以上である", () => {
    const r = ratio(
      oklchPrimitives.cream["50"],
      oklchPrimitives.persimmon["600"],
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("dark CTA ink-900 on persimmon-500 が AA 4.50:1 以上である", () => {
    const r = ratio(
      oklchPrimitives.ink["900"],
      oklchPrimitives.persimmon["500"],
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });
});

describe("semantic トークン (light/dark の本文ペア)", () => {
  it("semanticColorTokens.fgPrimary × bgCanvas (light) が AAA 7.20:1 以上である", () => {
    const r = ratio(
      semanticColorTokens.fgPrimary.light,
      semanticColorTokens.bgCanvas.light,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("semanticColorTokens.fgPrimary × bgCanvas (dark) が AAA 7.20:1 以上である", () => {
    const r = ratio(
      semanticColorTokens.fgPrimary.dark,
      semanticColorTokens.bgCanvas.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("semanticColorTokens.fgSecondary × bgCanvas (light) が AAA 7.20:1 以上である", () => {
    const r = ratio(
      semanticColorTokens.fgSecondary.light,
      semanticColorTokens.bgCanvas.light,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("semanticColorTokens.fgSecondary × bgCanvas (dark) が AAA 7.20:1 以上である", () => {
    const r = ratio(
      semanticColorTokens.fgSecondary.dark,
      semanticColorTokens.bgCanvas.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("semanticColorTokens.accentLink × bgCanvas (light) が AAA 7.20:1 以上である", () => {
    const r = ratio(
      semanticColorTokens.accentLink.light,
      semanticColorTokens.bgCanvas.light,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("semanticColorTokens.accentLink × bgCanvas (dark) が AAA 7.20:1 以上である", () => {
    const r = ratio(
      semanticColorTokens.accentLink.dark,
      semanticColorTokens.bgCanvas.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("light bgCanvas が cream-50 (primitives) を指している", () => {
    expect(semanticColorTokens.bgCanvas.light).toBe(oklchPrimitives.cream["50"]);
  });

  it("dark bgCanvas が sumi-950 (primitives) を指している", () => {
    expect(semanticColorTokens.bgCanvas.dark).toBe(oklchPrimitives.sumi["950"]);
  });
});

describe("R-2a (Issue #388) で追加した semantic token", () => {
  it("accentFeatured は light で persimmon-600 を指している", () => {
    expect(semanticColorTokens.accentFeatured.light).toBe(
      oklchPrimitives.persimmon["600"],
    );
  });

  it("accentFeatured は dark で persimmon-500 を指している", () => {
    expect(semanticColorTokens.accentFeatured.dark).toBe(
      oklchPrimitives.persimmon["500"],
    );
  });

  it("accentFeatured × bg.canvas (light) が WCAG AA 4.5:1 以上である", () => {
    const r = ratio(
      semanticColorTokens.accentFeatured.light,
      semanticColorTokens.bgCanvas.light,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("accentFeatured × bg.canvas (dark) が WCAG AA 4.5:1 以上である", () => {
    const r = ratio(
      semanticColorTokens.accentFeatured.dark,
      semanticColorTokens.bgCanvas.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("focusRing は light/dark とも citrus-500 を指している", () => {
    // 単一背景上の AA は light では非対応 (cream-50 上で 1.45:1)。
    // 二重リング (外 ink-900 + 内 citrus-500) で運用する想定。
    expect(semanticColorTokens.focusRing.light).toBe(
      oklchPrimitives.citrus["500"],
    );
    expect(semanticColorTokens.focusRing.dark).toBe(
      oklchPrimitives.citrus["500"],
    );
  });

  it("focusRing × sumi-950 (dark 通常背景) が AA 4.5:1 以上である", () => {
    const r = ratio(
      semanticColorTokens.focusRing.dark,
      semanticColorTokens.bgCanvas.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("focusRing × ink-900 (二重リング内側) が AA 4.5:1 以上である", () => {
    // 二重リング: 外側 ink-900 + 内側 citrus-500 (focusRing)。
    // 内側は外側と AA 4.5:1 以上のコントラストでリングそのものを認知できる必要がある。
    const r = ratio(semanticColorTokens.focusRing.light, oklchPrimitives.ink["900"]);
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });
});

describe("マージン僅少警告ライン", () => {
  it("本文ペアが 1.05 倍マージン (>= 7.56:1) を確保している", () => {
    // 7.20 * 1.05 = 7.56 を全本文ペアが超えていることを確認 (運用目標)
    const bodyPairs: ReadonlyArray<readonly [string, string]> = [
      [oklchPrimitives.ink.primaryOnCream, oklchPrimitives.cream["50"]],
      [oklchPrimitives.ink.primaryOnCream, oklchPrimitives.cream["100"]],
      [oklchPrimitives.bone["50"], oklchPrimitives.sumi["950"]],
      [oklchPrimitives.indigo["500"], oklchPrimitives.cream["50"]],
      [oklchPrimitives.indigo["300"], oklchPrimitives.sumi["950"]],
    ];

    const marginalLine =
      contrastThresholds.bodyText * contrastThresholds.marginalRatio;

    for (const [fg, bg] of bodyPairs) {
      const r = ratio(fg, bg);
      expect(r).toBeGreaterThanOrEqual(marginalLine);
    }
  });
});
