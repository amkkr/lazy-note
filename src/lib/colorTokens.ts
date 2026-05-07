/**
 * Editorial Citrus デザインリニューアルの OKLCH カラートークン (単一ソース of truth)
 *
 * 仕様: docs/rfc/editorial-citrus/02-color-system.md
 *
 * このファイルは以下から参照される単一ソースである:
 *   - panda.config.ts (theme.tokens.colors の値はこのファイルとリテラル一致させる)
 *   - scripts/calculateContrast.ts (AAA 実測スクリプト)
 *   - src/lib/__tests__/colorTokens.test.ts (本文 7.20:1 を CI で要求)
 *
 * 値の調整時は上記 3 箇所すべてを揃えること。`colorTokens.test.ts` が
 * 7.20:1 を割った場合は `02-color-system.md` の更新を伴うこと。
 */

/**
 * OKLCH カラー primitives。値は CSS の `oklch(L C H)` 形式で保持する。
 *
 * - L (Lightness): 0〜1 の知覚的明度
 * - C (Chroma): 0〜0.4 程度の色味の強さ
 * - H (Hue): 0〜360 の色相角
 */
export interface OklchPrimitives {
  readonly cream: {
    readonly "50": string;
    readonly "100": string;
  };
  readonly bone: {
    readonly "50": string;
    readonly "100": string;
  };
  readonly ink: {
    readonly primaryOnCream: string;
    readonly secondaryOnCream: string;
    readonly "900": string;
  };
  readonly sumi: {
    readonly "500": string;
    readonly "600": string;
    readonly "700": string;
    readonly "950": string;
  };
  readonly persimmon: {
    readonly "500": string;
    readonly "600": string;
    readonly "700": string;
  };
  readonly indigo: {
    readonly "300": string;
    readonly "500": string;
  };
  readonly citrus: {
    readonly "500": string;
  };
}

/**
 * Editorial Citrus の OKLCH primitives。
 *
 * Persimmon は **ブランド一次色** (CTA / Featured / OG 画像 / 紹介ページ単色)。
 * 本文リンクや focus には使わない。詳細は 02-color-system.md §"Persimmon の使用範囲"。
 *
 * dark の sumi-950 / bone は H=220 (中性)。light の cream / ink は H=85 (暖色)。
 * 暖色ダークは室内光下で違和感が出るため不採用 (Devil's Advocate ラウンド 2)。
 */
export const oklchPrimitives: OklchPrimitives = {
  cream: {
    "50": "oklch(0.985 0.013 85)",
    "100": "oklch(0.965 0.018 85)",
  },
  bone: {
    "50": "oklch(0.965 0.005 220)",
    "100": "oklch(0.920 0.005 220)",
  },
  ink: {
    primaryOnCream: "oklch(0.205 0.020 85)",
    secondaryOnCream: "oklch(0.380 0.018 85)",
    "900": "oklch(0.150 0.020 85)",
  },
  sumi: {
    // L=0.620 (RFC 02 の初期値 0.560 から AAA 実測で調整、sumi-950 上で 5.15:1)
    "500": "oklch(0.620 0 0)",
    "600": "oklch(0.470 0 0)",
    "700": "oklch(0.380 0 0)",
    "950": "oklch(0.180 0.012 220)",
  },
  // ブランド一次色 (Persimmon)。OG 画像 / 紹介ページで単色運用。
  // 本文リンク・focus には使用しない。3 軸分離 (accent/link/focus) を死守。
  // L=0.520 (RFC 02 の初期値 0.580 から AAA 実測で調整、CTA white-on で 5.74:1)
  persimmon: {
    "500": "oklch(0.640 0.180 38)",
    "600": "oklch(0.520 0.180 38)",
    "700": "oklch(0.450 0.170 38)",
  },
  // L=0.430 (RFC 02 の初期値 0.470 から AAA 実測で調整、cream-50 上で 7.82:1)
  indigo: {
    "300": "oklch(0.760 0.110 250)",
    "500": "oklch(0.430 0.150 250)",
  },
  // focus 専用色。accent ボタン上では二重リング外側 ink-900 + 内側 citrus-500。
  citrus: {
    "500": "oklch(0.860 0.150 105)",
  },
} as const;

/**
 * セマンティックトークン (light / dark の 2 値マッピング)。
 *
 * トークン階層は意図的に 1 段に留めている (過剰多層化を回避)。
 * 02-color-system.md §"Panda CSS 統合 (概要)" の方針に従う。
 */
export interface SemanticColorPair {
  readonly light: string;
  readonly dark: string;
}

export interface SemanticColorTokens {
  /** 本体背景 */
  readonly bgCanvas: SemanticColorPair;
  /** カード / 沈み込み背景 */
  readonly bgSurface: SemanticColorPair;
  /** 浮き上がる要素 (モーダル / トースト) */
  readonly bgElevated: SemanticColorPair;
  /** 本文前景 */
  readonly fgPrimary: SemanticColorPair;
  /** メタ / キャプション */
  readonly fgSecondary: SemanticColorPair;
  /** 注釈・補助 */
  readonly fgMuted: SemanticColorPair;
  /** ブランド色 (CTA / Featured) */
  readonly accentBrand: SemanticColorPair;
  /** リンク誘導 */
  readonly accentLink: SemanticColorPair;
  /** focus キーボード可視性 */
  readonly accentFocus: SemanticColorPair;
}

export const semanticColorTokens: SemanticColorTokens = {
  bgCanvas: {
    light: oklchPrimitives.cream["50"],
    dark: oklchPrimitives.sumi["950"],
  },
  bgSurface: {
    light: oklchPrimitives.cream["100"],
    dark: oklchPrimitives.sumi["700"],
  },
  bgElevated: {
    light: oklchPrimitives.cream["50"],
    dark: oklchPrimitives.sumi["600"],
  },
  fgPrimary: {
    light: oklchPrimitives.ink.primaryOnCream,
    dark: oklchPrimitives.bone["50"],
  },
  fgSecondary: {
    light: oklchPrimitives.ink.secondaryOnCream,
    dark: oklchPrimitives.bone["100"],
  },
  fgMuted: {
    light: oklchPrimitives.sumi["600"],
    dark: oklchPrimitives.bone["100"],
  },
  accentBrand: {
    light: oklchPrimitives.persimmon["600"],
    dark: oklchPrimitives.persimmon["500"],
  },
  accentLink: {
    light: oklchPrimitives.indigo["500"],
    dark: oklchPrimitives.indigo["300"],
  },
  accentFocus: {
    light: oklchPrimitives.citrus["500"],
    dark: oklchPrimitives.citrus["500"],
  },
} as const;

/**
 * AAA 実測の閾値定数。
 *
 * - 本文 7.20:1 = AAA 7.00 + 1〜2% マージン (運用目標)
 * - UI 大文字 4.50:1 = AA 4.50 (18pt+ または 14pt bold)
 */
export const contrastThresholds = {
  /** 本文 (small text) AAA + マージン */
  bodyText: 7.2,
  /** UI 大文字 (>= 18pt or >= 14pt bold) AA */
  largeText: 4.5,
  /** マージン僅少警告 (この比率以内なら warn) */
  marginalRatio: 1.05,
} as const;
