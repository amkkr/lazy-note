import { promises as fs } from "node:fs";
import path from "node:path";
import { parse, wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import {
  codeBlockColors,
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
    expect(semanticColorTokens.bgCanvas.light).toBe(
      oklchPrimitives.cream["50"],
    );
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

  it("accentFeatured と accentBrand は現状同値 (将来分離予定の Tripwire)", () => {
    // Featured と Brand は将来的に分離する設計だが、R-2a 時点では同値。
    // 値が乖離した時点でこのテストが落ちて、意図的な変更かレビューで確認できる。
    expect(semanticColorTokens.accentFeatured).toEqual(
      semanticColorTokens.accentBrand,
    );
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

  it("focusRing は light テーマで bgCanvas に単独適用すると AA を満たさない (二重リング運用前提)", () => {
    // citrus-500 (focusRing) を light テーマの cream-50 (bgCanvas) 上に直接置くと
    // 1.45:1 となり 1.4.11 (UI 装飾 3:1) すら満たさない。
    // R-5 (フォーカス可視性強化) では必ず内側に ink-900 を伴う二重リング (boxShadow
    // inset/outset の二重指定) で運用すること。本テストは開発者が単独運用に
    // 走らないようにする Tripwire (negative test)。
    const r = ratio(
      semanticColorTokens.focusRing.light,
      semanticColorTokens.bgCanvas.light,
    );
    expect(r).toBeLessThan(contrastThresholds.largeText);
  });
});

describe("コードブロック token (旧パレット温存の Tripwire)", () => {
  // Editorial Citrus 移行後もコードブロックは従来配色を温存する方針
  // (RFC 02 §既存 Gruvbox の取り扱い)。
  // 値が誤って OKLCH 系に置き換わると Shiki/Prism 想定のハイライトと衝突するため、
  // リテラル値がコードブロック標準色と一致することを CI で固定する。
  it("bgCode (light) がコードブロック light bg0 (#fbf1c7) を指している", () => {
    expect(semanticColorTokens.bgCode.light).toBe(codeBlockColors.light.bg0);
    expect(semanticColorTokens.bgCode.light).toBe("#fbf1c7");
  });

  it("bgCode (dark) がコードブロック dark bg0 (#282828) を指している", () => {
    expect(semanticColorTokens.bgCode.dark).toBe(codeBlockColors.dark.bg0);
    expect(semanticColorTokens.bgCode.dark).toBe("#282828");
  });

  it("bgCodeInline (light) がコードブロック light bg2 (#d5c4a1) を指している", () => {
    expect(semanticColorTokens.bgCodeInline.light).toBe(
      codeBlockColors.light.bg2,
    );
    expect(semanticColorTokens.bgCodeInline.light).toBe("#d5c4a1");
  });

  it("bgCodeInline (dark) がコードブロック dark bg2 (#504945) を指している", () => {
    expect(semanticColorTokens.bgCodeInline.dark).toBe(
      codeBlockColors.dark.bg2,
    );
    expect(semanticColorTokens.bgCodeInline.dark).toBe("#504945");
  });

  it("bgCodeBorder (light) がコードブロック light bg3 (#bdae93) を指している", () => {
    expect(semanticColorTokens.bgCodeBorder.light).toBe(
      codeBlockColors.light.bg3,
    );
    expect(semanticColorTokens.bgCodeBorder.light).toBe("#bdae93");
  });

  it("bgCodeBorder (dark) がコードブロック dark bg3 (#665c54) を指している", () => {
    expect(semanticColorTokens.bgCodeBorder.dark).toBe(
      codeBlockColors.dark.bg3,
    );
    expect(semanticColorTokens.bgCodeBorder.dark).toBe("#665c54");
  });

  it("fgCode (light) がコードブロック light fg1 (#3c3836) を指している", () => {
    expect(semanticColorTokens.fgCode.light).toBe(codeBlockColors.light.fg1);
    expect(semanticColorTokens.fgCode.light).toBe("#3c3836");
  });

  it("fgCode (dark) がコードブロック dark fg1 (#ebdbb2) を指している", () => {
    expect(semanticColorTokens.fgCode.dark).toBe(codeBlockColors.dark.fg1);
    expect(semanticColorTokens.fgCode.dark).toBe("#ebdbb2");
  });
});

describe("panda.config.ts と colorTokens.ts の hex 同期 Tripwire", () => {
  // panda.config.ts と src/lib/colorTokens.ts の codeBlockColors 系 hex 値が
  // 同期しているか検証。Panda CSS の制約 (theme.tokens.colors の値が文字列リテラル
  // 必須) で R-2c (Issue #390) では旧パレット階層を panda.config.ts から削除した結果、
  // bg.code / bg.codeInline / bg.codeBorder / fg.code は両ファイルで hex リテラルを
  // 二重管理する形になっている。
  // panda.config.ts 側だけ書き換わっても CI で検出できないため、本 Tripwire で
  // ソース文字列上の hex 出現を検証して乖離を CI で検出する。
  // (より厳密な AST パースは過剰のため、文字列 contains で十分な精度とする。)
  it("panda.config.ts 中に codeBlockColors の light hex が全て出現する", async () => {
    const pandaSource = await fs.readFile(
      path.resolve(__dirname, "../../../panda.config.ts"),
      "utf-8",
    );

    expect(pandaSource).toContain(codeBlockColors.light.bg0); // #fbf1c7 (bg.code)
    expect(pandaSource).toContain(codeBlockColors.light.bg2); // #d5c4a1 (bg.codeInline)
    expect(pandaSource).toContain(codeBlockColors.light.bg3); // #bdae93 (bg.codeBorder)
    expect(pandaSource).toContain(codeBlockColors.light.fg1); // #3c3836 (fg.code)
  });

  it("panda.config.ts 中に codeBlockColors の dark hex が全て出現する", async () => {
    const pandaSource = await fs.readFile(
      path.resolve(__dirname, "../../../panda.config.ts"),
      "utf-8",
    );

    expect(pandaSource).toContain(codeBlockColors.dark.bg0); // #282828 (bg.code)
    expect(pandaSource).toContain(codeBlockColors.dark.bg2); // #504945 (bg.codeInline)
    expect(pandaSource).toContain(codeBlockColors.dark.bg3); // #665c54 (bg.codeBorder)
    expect(pandaSource).toContain(codeBlockColors.dark.fg1); // #ebdbb2 (fg.code)
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
