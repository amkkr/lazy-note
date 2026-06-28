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
      oklchPrimitives.cream["75"],
      oklchPrimitives.cream["100"],
      oklchPrimitives.cream["300"],
      oklchPrimitives.bone["50"],
      oklchPrimitives.bone["100"],
      oklchPrimitives.ink.primaryOnCream,
      oklchPrimitives.ink.secondaryOnCream,
      oklchPrimitives.ink["900"],
      oklchPrimitives.sumi["400"],
      oklchPrimitives.sumi["450"],
      oklchPrimitives.sumi["500"],
      oklchPrimitives.sumi["600"],
      oklchPrimitives.sumi["650"],
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

  it("semanticColorTokens.accentLink × bgSurface (light) が WCAG AA 4.5:1 以上である", () => {
    // Issue #839: Footer のナビリンク (accent.link) は bg.surface 上に置かれ、
    // 全ページの Footer 入口リンクとして導入された。Footer.tsx のコメントが
    // ハードコードで主張する AA 充足 (light 実測 ~7.38:1) を Tripwire で固定する。
    // 通常テキスト (navigation Link = fontSize sm) 用途のため AA 閾値 4.5:1。
    const r = ratio(
      semanticColorTokens.accentLink.light,
      semanticColorTokens.bgSurface.light,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("semanticColorTokens.accentLink × bgSurface (dark) が WCAG AA 4.5:1 以上である", () => {
    // Issue #839: dark は実測 ~4.69:1 と AA (4.5:1) ギリギリのため、閾値割れを
    // 将来検知できるよう実測値ベースで AA を固定する (Footer ナビリンクの回帰防御)。
    const r = ratio(
      semanticColorTokens.accentLink.dark,
      semanticColorTokens.bgSurface.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
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
    const r = ratio(
      semanticColorTokens.focusRing.light,
      oklchPrimitives.ink["900"],
    );
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

describe("Issue #409: bg.muted / border.subtle 階層 token", () => {
  it("bgMuted は light で cream-75 (中間階調) を指している", () => {
    expect(semanticColorTokens.bgMuted.light).toBe(oklchPrimitives.cream["75"]);
  });

  it("bgMuted は dark で sumi-650 (中間階調) を指している", () => {
    expect(semanticColorTokens.bgMuted.dark).toBe(oklchPrimitives.sumi["650"]);
  });

  it("borderSubtle は light で cream-300 (border 専用色) を指している", () => {
    expect(semanticColorTokens.borderSubtle.light).toBe(
      oklchPrimitives.cream["300"],
    );
  });

  it("borderSubtle は dark で sumi-450 (Calm 思想整合の border 専用色) を指している", () => {
    // Issue #423: 旧 sumi-400 (L=0.700, 7.05:1) は本文と同等の主張強度のため
    // Calm 思想と相反していた。sumi-450 (L=0.665, 6.18:1) に変更して弱 divider
    // を実現しつつ、light cream-300 と bg.surface 上で同じ 3.29:1 となるよう
    // 視覚的対称性を確保した。
    expect(semanticColorTokens.borderSubtle.dark).toBe(
      oklchPrimitives.sumi["450"],
    );
  });

  it("borderSubtle × bg.canvas (light) が WCAG 1.4.11 の 3:1 を満たす", () => {
    const r = ratio(
      semanticColorTokens.borderSubtle.light,
      semanticColorTokens.bgCanvas.light,
    );
    expect(r).toBeGreaterThanOrEqual(3.0);
  });

  it("borderSubtle × bg.surface (light) が WCAG 1.4.11 の 3:1 を満たす", () => {
    const r = ratio(
      semanticColorTokens.borderSubtle.light,
      semanticColorTokens.bgSurface.light,
    );
    expect(r).toBeGreaterThanOrEqual(3.0);
  });

  it("borderSubtle × bg.muted (light) が WCAG 1.4.11 の 3:1 を満たす", () => {
    const r = ratio(
      semanticColorTokens.borderSubtle.light,
      semanticColorTokens.bgMuted.light,
    );
    expect(r).toBeGreaterThanOrEqual(3.0);
  });

  it("borderSubtle × bg.canvas (dark) が WCAG 1.4.11 の 3:1 を満たす", () => {
    const r = ratio(
      semanticColorTokens.borderSubtle.dark,
      semanticColorTokens.bgCanvas.dark,
    );
    expect(r).toBeGreaterThanOrEqual(3.0);
  });

  it("borderSubtle × bg.surface (dark) が WCAG 1.4.11 の 3:1 を満たす", () => {
    const r = ratio(
      semanticColorTokens.borderSubtle.dark,
      semanticColorTokens.bgSurface.dark,
    );
    expect(r).toBeGreaterThanOrEqual(3.0);
  });

  it("borderSubtle × bg.muted (dark) が WCAG 1.4.11 の 3:1 を満たす", () => {
    const r = ratio(
      semanticColorTokens.borderSubtle.dark,
      semanticColorTokens.bgMuted.dark,
    );
    expect(r).toBeGreaterThanOrEqual(3.0);
  });

  it("bg.muted (light) 上の本文 fgPrimary が AAA 7.20:1 以上である", () => {
    // bg.muted を注釈ブロック等の背景として使う際の本文コントラストを保証する。
    const r = ratio(
      semanticColorTokens.fgPrimary.light,
      semanticColorTokens.bgMuted.light,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("bg.muted (dark) 上の本文 fgPrimary が AAA 7.20:1 以上である", () => {
    const r = ratio(
      semanticColorTokens.fgPrimary.dark,
      semanticColorTokens.bgMuted.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.bodyText);
  });

  it("borderSubtle は dark の bg.elevated (sumi-600) 上では 3:1 未達 (運用 Tripwire)", () => {
    // bg.elevated 上の border 用途には borderSubtle を使用しない方針 (R-2b の
    // bg.elevated 反転利用を継続)。値を変更したらこの Tripwire が落ちて
    // 設計判断の確認が促される。
    const r = ratio(
      semanticColorTokens.borderSubtle.dark,
      semanticColorTokens.bgElevated.dark,
    );
    expect(r).toBeLessThan(3.0);
  });

  it("focus.ring × bg.muted (light) は AA 単独不成立 (二重リング運用前提)", () => {
    // focus.ring (citrus-500) を light テーマの bg.muted (cream-75) 上に直接置くと
    // 約 1.41:1 となり、1.4.11 (UI 装飾 3:1) も満たさない。bg.muted を hover 背景や
    // 注釈ブロック内のリンク背景に使った場合、light で focus が消失する。
    // bg.muted 上の focus は二重リング前提 (内側 ink-900 + 外側 focus.ring or その逆)
    // で運用すること。本テストは bg.muted 上の単独運用に走らないようにする Tripwire
    // (negative test)。値が改善 (3:1 以上) した場合は意図的な変更かレビューで確認する。
    const r = ratio(
      semanticColorTokens.focusRing.light,
      semanticColorTokens.bgMuted.light,
    );
    expect(r).toBeLessThan(3.0);
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

describe("Issue #537: fg.muted 補助情報の WCAG 1.4.3 AA (4.5:1) 検証", () => {
  // Issue #491 (Coordinate) / Issue #492 (Resurface) の DA レビュー軽微指摘
  // (Issue #537) への対応。Coordinate は `fg.muted` を bg.surface 上に置く前提で
  // 「WCAG 1.4.3 AA (4.5:1) を満たす」と JSDoc に書かれているが、数値検証が
  // 未追加だった。本 describe で fg.muted を補助情報文字色として使うパターン
  // (Coordinate / Resurface の見出し等) を全 bg 階層について Tripwire 化する。
  //
  // ─────────────────────────────────────────────────────────────────────────
  // 設計判断: 上限ガード (AAA 超過の最大値) は採用しない (Issue #645)
  // ─────────────────────────────────────────────────────────────────────────
  // Tripwire の assert は **AA 下限 (4.5:1) のみ** を要求する。dark の fg.muted ×
  // bg.canvas (14.84:1) / fg.muted × bg.muted (11.87:1) は AAA を大幅に超過するが、
  // これに対する上限 assertion (例: `r <= 18.0` 等の上限ガード) は意図的に追加しない。
  //
  // 採用案: A (上限ガード不採用、JSDoc で baseline を documented snapshot として明記)
  // 不採用案:
  //   - B (上限 18:1 等の数値ガード): 「より高コントラストにする改善」を阻むため不採用。
  //     アクセシビリティの方向性 (= 高い方が良い) に逆行する hard assertion は CI の
  //     役割として不適切。color token の改善 (例: bone-100 → bone-50 への引き上げ等)
  //     が技術的に望ましい場合に、無関係な Tripwire fail で改善 PR がブロックされる。
  //   - C 完全採用 (snapshot 値そのものを fixture 化): 値の微変動 (OKLCH パース誤差、
  //     色空間ライブラリ更新等) でも fail するため過剰検出になる。
  //
  // 採用 = A + C のハイブリッド: hard な test assertion は AA 下限のみ。
  // baseline 実測値は本 JSDoc にコメント snapshot として残し、色設計変更時に
  // 「数値が大幅に変化したか」をレビュー観点として手動確認できる足場にする。
  //
  // ─────────────────────────────────────────────────────────────────────────
  // baseline 実測値 (2026-05-18 時点、`pnpm contrast:check` および
  // colorTokens.ts + culori `wcagContrast()` で実測)
  // ─────────────────────────────────────────────────────────────────────────
  //   light:
  //     - fg.muted × bg.canvas   (sumi-600 × cream-50)  =  6.54:1  (AA pass / AAA 未達)
  //     - fg.muted × bg.surface  (sumi-600 × cream-100) =  6.17:1  (AA pass / AAA 未達)
  //     - fg.muted × bg.muted    (sumi-600 × cream-75)  =  6.35:1  (AA pass / AAA 未達)
  //     - fg.muted × bg.elevated (sumi-600 × cream-50)  =  6.54:1  (AA pass / AAA 未達)
  //       ※ light の bg.elevated は cream-50 = bg.canvas と同値のため数値も同じ
  //   dark:
  //     - fg.muted × bg.canvas   (bone-100 × sumi-950)  = 14.84:1  (AAA 大幅超過)
  //     - fg.muted × bg.surface  (bone-100 × sumi-700)  =  7.91:1  (AAA pass)
  //     - fg.muted × bg.muted    (bone-100 × sumi-650)  = 11.87:1  (AAA 大幅超過)
  //     - fg.muted × bg.elevated (bone-100 × sumi-600)  =  5.39:1  (AA pass / AAA 未達、6 ペア中最低)
  //       ※ dark の bg.elevated (sumi-600) は FeaturedCard.tsx / CardSkeleton.tsx /
  //          ArticleSkeleton.tsx で使用中。現状 fg.muted を直接これらカード上に置く
  //          コンポーネントは無いが、将来配置される場合の baseline 観測点として記録。
  //
  // 色設計変更時のレビュー観点 (= この describe を触る PR の reviewer 向け):
  //   1. 上記 baseline 値から **経験的目安として ±30% 以上の変化** があれば、token
  //      (fg.muted, bg.*) の意味変更が伴っているはずなので、Issue の議論 / RFC との
  //      整合を確認する (「±30%」は Issue #645 で initial value として導入した経験的
  //      目安であり、規格根拠を持つ閾値ではない。運用しながら値域は調整する想定)。
  //   2. 経験則と独立した **絶対値ベースのトリガー** として、以下が観測されたら必ず
  //      個別に意図を確認する (WCAG 規格と直結する hard line):
  //        - dark の最低 baseline (現状 5.39:1 = bg.elevated 上) が AA 下限 (4.5:1) を
  //          下回ったら、補助情報用途として WCAG 1.4.3 を割り込むため要再設計。
  //        - dark の最高 baseline (現状 14.84:1) が更に上昇した場合は、bone-100 の
  //          token 役割 (補助情報) を逸脱して本文寄りになっていないか確認。
  //   3. dark 側が AA 下限 (4.5:1) 近傍まで低下する変更は、「補助情報専用」用途を
  //      逸脱していないか (本文用途への転用の兆候がないか) を確認する。
  //   4. light 側が AAA (7.0:1) を満たすほど上昇した場合は、fg.secondary との
  //      役割重複がないか (fg.muted の存在理由が薄れていないか) を確認する。
  //   5. baseline 値そのもの (上記コメント) も同じ PR で実測値に更新すること。
  //
  // **注意**: 上記 5 つのレビュー観点 (特に観点 5 = baseline 更新義務) は **CI で
  // 機械的に強制できない**。本コメントは Tripwire テスト fixture ではなく純然たる
  // JSDoc コメントであり、token 値が変わっても本ファイルのコメントは自動更新されず、
  // テストも fail しない。**reviewer の目視確認が唯一の防御線** である。
  // baseline と実測値の乖離を確認する際は、reviewer が手元で `pnpm contrast:check`
  // を実行し、本コメントの値と差分があれば PR 内で実測値への更新を要求すること
  // (bg.elevated × fg.muted は現状 `contrast:check` スクリプトの出力対象に含まれて
  // いないため、必要に応じて culori `wcagContrast()` で直接検算する)。
  //
  // 留意点 (実測値の事実):
  //   - light の fg.muted (sumi-600) は **AA pass / AAA 未達** (bg.surface 上 6.17:1)。
  //     fg.muted は本文ではなく「補助情報のみ」用途に限定するルール (panda.config.ts
  //     §accent ガイドライン参照)。本文として転用する場合は fg.secondary に振り直す。
  //   - dark の fg.muted (bone-100) は全 bg 階層で AA 以上 (bg.surface 上 7.91:1 で AAA)。
  //     最低値は bg.elevated (sumi-600) 上の 5.39:1 で、AAA 未達ながら AA pass。

  it("fg.muted × bg.surface (light) が WCAG 1.4.3 AA 4.5:1 を満たす", () => {
    // Coordinate / Resurface 見出しが想定する主要配置。
    // 実測 6.17:1: AA pass / AAA (7.0:1) 未達。
    const r = ratio(
      semanticColorTokens.fgMuted.light,
      semanticColorTokens.bgSurface.light,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("fg.muted × bg.surface (dark) が WCAG 1.4.3 AA 4.5:1 を満たす", () => {
    // 実測 7.91:1: AAA pass。
    const r = ratio(
      semanticColorTokens.fgMuted.dark,
      semanticColorTokens.bgSurface.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("fg.muted × bg.canvas (light) が WCAG 1.4.3 AA 4.5:1 を満たす", () => {
    // Coordinate を bg.canvas 直上に置くページ (記事詳細 MetaInfo 近傍など) の保険。
    // 実測 6.54:1: AA pass / AAA 未達。
    const r = ratio(
      semanticColorTokens.fgMuted.light,
      semanticColorTokens.bgCanvas.light,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("fg.muted × bg.canvas (dark) が WCAG 1.4.3 AA 4.5:1 を満たす", () => {
    // 実測 14.84:1: AAA pass。
    const r = ratio(
      semanticColorTokens.fgMuted.dark,
      semanticColorTokens.bgCanvas.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("fg.muted × bg.muted (light) が WCAG 1.4.3 AA 4.5:1 を満たす", () => {
    // 注釈ブロック内に fg.muted の補助情報を置く場合の保険 (Issue #409 で
    // bg.muted を新設したため検証対象に加える)。実測 6.35:1: AA pass / AAA 未達。
    const r = ratio(
      semanticColorTokens.fgMuted.light,
      semanticColorTokens.bgMuted.light,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("fg.muted × bg.muted (dark) が WCAG 1.4.3 AA 4.5:1 を満たす", () => {
    // 実測 11.87:1: AAA pass。
    const r = ratio(
      semanticColorTokens.fgMuted.dark,
      semanticColorTokens.bgMuted.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("fg.muted × bg.elevated (light) が WCAG 1.4.3 AA 4.5:1 を満たす", () => {
    // light の bg.elevated は cream-50 = bg.canvas と同値のため数値も同じ。
    // 実測 6.54:1: AA pass / AAA 未達。FeaturedCard 等が将来 light でも
    // bg.elevated を使い、その上に fg.muted の補助情報を載せた場合の保険。
    const r = ratio(
      semanticColorTokens.fgMuted.light,
      semanticColorTokens.bgElevated.light,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  it("fg.muted × bg.elevated (dark) が WCAG 1.4.3 AA 4.5:1 を満たす", () => {
    // FeaturedCard.tsx / CardSkeleton.tsx / ArticleSkeleton.tsx で bg.elevated
    // (sumi-600) を使用。将来 fg.muted がこれらカード上に置かれた場合の baseline。
    // 実測 5.39:1: AA pass / AAA 未達 (6 ペア中最低)。
    // この値が AA 下限 (4.5:1) を下回ったら sumi-600 / bone-100 の再設計が必要。
    const r = ratio(
      semanticColorTokens.fgMuted.dark,
      semanticColorTokens.bgElevated.dark,
    );
    expect(r).toBeGreaterThanOrEqual(contrastThresholds.largeText);
  });

  // 補助情報専用 (AAA 未達 token の意図的選択) の運用意図は、
  // panda.config.ts §"fg.muted は本文として運用しない (補助情報のみ)" と
  // Coordinate.tsx の JSDoc (色は fg.muted / 補助情報専用で本文転用は不可) で
  // ドキュメント化している。値が将来改善されて AAA を満たした場合でも、それは
  // 純粋な改善変更であり Tripwire でブロックすべきではないため、本 describe では
  // 「AAA を満たさない」ことを assert する negative test は持たない。
  //
  // 同様の理由で dark 側の AAA 大幅超過 (14.84:1 等) に対する上限 assertion も
  // 追加していない (Issue #645 で確定した設計判断、本 describe 冒頭 JSDoc 参照)。
});
