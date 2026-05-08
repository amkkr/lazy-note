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
    /** Issue #409 で追加。bg.muted (light) の値に使用。cream-50 と cream-100 の中点。 */
    readonly "75": string;
    readonly "100": string;
    /**
     * Issue #409 で追加。border.subtle (light) の値に使用。
     * WCAG 1.4.11 (Non-text Contrast) を bg.canvas / bg.surface 上で満たす。
     */
    readonly "300": string;
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
    /**
     * Issue #409 で追加。border.subtle (dark) の値に使用。
     * WCAG 1.4.11 (Non-text Contrast) を bg.canvas / bg.surface 上で満たす。
     */
    readonly "400": string;
    readonly "500": string;
    readonly "600": string;
    /** Issue #409 で追加。bg.muted (dark) の値に使用。sumi-950 と sumi-700 の中間。 */
    readonly "650": string;
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
    // Issue #409 で追加 (bg.muted light)。cream-50 (0.985) と cream-100 (0.965) の中点。
    "75": "oklch(0.975 0.015 85)",
    "100": "oklch(0.965 0.018 85)",
    // Issue #409 で追加 (border.subtle light)。L=0.620 で
    //   bg.canvas (cream-50) 上 3.49:1 / bg.surface (cream-100) 上 3.29:1。
    //   いずれも WCAG 1.4.11 (Non-text Contrast) 3:1 を満たす。
    //   bg.elevated (light) は cream-50 と同値のため canvas と同じ。
    "300": "oklch(0.620 0.020 85)",
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
    // Issue #409 で追加 (border.subtle dark)。L=0.700 で
    //   bg.canvas (sumi-950) 上 7.05:1 / bg.surface (sumi-700) 上 3.76:1。
    //   bg.elevated (sumi-600) 上は 2.57:1 で 3:1 未達のため、bg.elevated 上の
    //   border 用途には使わない方針 (border.subtle JSDoc 参照)。
    "400": "oklch(0.700 0.012 220)",
    // L=0.620 (RFC 02 の初期値 0.560 から AAA 実測で調整、sumi-950 上で 5.15:1)
    "500": "oklch(0.620 0 0)",
    "600": "oklch(0.470 0 0)",
    // Issue #409 で追加 (bg.muted dark)。L=0.270 = sumi-950 (0.180) と sumi-700
    // (0.380) の中間。bone-50 上 13.59:1 / bone-100 上 11.87:1 で AAA 維持。
    "650": "oklch(0.270 0.012 220)",
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
 * コードブロック専用トークンで参照する hex リテラル subset。
 *
 * Editorial Citrus 移行後もコードブロック (Shiki/Prism 想定) は従来配色を温存
 * する方針のため (02-color-system.md §"既存 Gruvbox の取り扱い")、bg/fg の
 * OKLCH 移行とは独立にこのリテラル値を維持する。
 *
 * R-2c (Issue #390) で旧パレット階層を panda.config.ts から削除したため、
 * panda.config.ts の `bg.code` / `bg.codeInline` / `bg.codeBorder` /
 * `fg.code` は hex リテラルを直接記述している。値を変える場合は両方を揃えること。
 *
 * キー名 (bg0/bg2/bg3/fg1) は元パレットの段階番号を踏襲しているが、現在は
 * UI トークンとは独立した「コードブロック表示用の固定値」として扱う。
 */
export const codeBlockColors = {
  light: {
    bg0: "#fbf1c7",
    bg2: "#d5c4a1",
    bg3: "#bdae93",
    fg1: "#3c3836",
  },
  dark: {
    bg0: "#282828",
    bg2: "#504945",
    bg3: "#665c54",
    fg1: "#ebdbb2",
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
  /**
   * 中間階調背景 (Issue #409 で追加)。
   *
   * R-2c (#390) で旧 5 段階を 3 段階に圧縮した結果、bg.surface と bg.elevated の
   * 中間階調が失われていた。bg.muted は両者の中間明度を担い、注釈ブロック /
   * hover 弱強調 / 補助カードなど「surface よりは前に出るが elevated ほど浮かない」
   * 用途で使用する。
   *
   * **本文配置時のコントラスト (AAA 7.20:1 維持)**:
   * - light: ink-primary × bg.muted = 16.67:1 PASS (AAA)
   * - light: ink-secondary × bg.muted = 9.32:1 PASS (AAA)
   * - dark : bone-50 × bg.muted = 13.59:1 PASS (AAA)
   * - dark : bone-100 × bg.muted = 11.87:1 PASS (AAA)
   *
   * 隣接 surface との差分は 1.06〜1.57:1 で「面の差分」としてのみ機能する。
   * 1.4.11 を満たす区切り線が必要な場合は borderSubtle を併用すること。
   */
  readonly bgMuted: SemanticColorPair;
  /** 本文前景 */
  readonly fgPrimary: SemanticColorPair;
  /** メタ / キャプション */
  readonly fgSecondary: SemanticColorPair;
  /** 注釈・補助 */
  readonly fgMuted: SemanticColorPair;
  /** ブランド色 (CTA) */
  readonly accentBrand: SemanticColorPair;
  /**
   * Featured バッジ・主要 CTA で使用するブランド色 (R-2a / Issue #388 で追加)
   *
   * accentBrand と同値だが、用途分離のため別 token として独立させている。
   * Featured タイル (ホーム 1 箇所) や OG 画像背景に使用する想定。
   *
   * **使用ガイドライン**:
   * - 背景色として使用: bg.canvas / bg.surface 上で OK
   *   - light 5.74:1 (cream-50) / 5.42:1 (cream-100) で AA pass
   *   - dark 5.17:1 (sumi-950) で AA pass
   *   - dark の sumi-700 (bg.surface) 上は 2.76:1 で AA 不足のため不可
   * - 文字色として使用: 14pt 以下の本文には使用禁止 (AA pass / AAA 未達)
   *   - 16px+ または bold で使用、もしくは大きめの見出し用途のみ可
   * - hover/focus 時の反転は accentBrand と同期させること
   *
   * 関連: accentBrand (現状同値、将来分離予定)
   */
  readonly accentFeatured: SemanticColorPair;
  /** リンク誘導 */
  readonly accentLink: SemanticColorPair;
  /**
   * visible focus ring 専用色 (R-2a / Issue #388 で追加、R-5 で利用)
   *
   * focus は accent ではないため、accent 階層から独立させた専用 token。
   * (旧 accentFocus は同値で混乱を招くため #388 のレビューで削除済み)
   *
   * **運用ルール (重要)**:
   *   必ず内側に ink-900 (or sumi-950) を伴う二重リングで使うこと。
   *   light テーマ単独使用は cream-50 上で 1.45:1 となり AA 不足。
   *   R-5 で boxShadow inset/outset の二重指定を共通化する予定。
   *   - dark sumi-950 上: 12.43:1 (AAA) → 単独でも可
   *   - light cream-50 上: 1.45:1 (FAIL) → 二重リング必須
   */
  readonly focusRing: SemanticColorPair;
  /**
   * 控えめな border 専用色 (Issue #409 で追加)。
   *
   * R-2b/R-2c で旧 5 段階を圧縮した結果、border に bg.elevated を流用すると
   * 外側 bg.canvas と同色になり視覚消失していた (light の article border が
   * 1.0:1 で完全消失する問題)。borderSubtle は border 専用色で、WCAG 1.4.11
   * (Non-text Contrast) の 3:1 を bg.canvas / bg.surface / bg.muted 上で満たす。
   *
   * **値**:
   * - light: cream-300 (oklch(0.620 0.020 85))
   *   - bg.canvas (cream-50) 上 3.49:1 PASS (1.4.11)
   *   - bg.surface (cream-100) 上 3.29:1 PASS (1.4.11)
   * - dark : sumi-400 (oklch(0.700 0.012 220))
   *   - bg.canvas (sumi-950) 上 7.05:1 PASS (1.4.11)
   *   - bg.surface (sumi-700) 上 3.76:1 PASS (1.4.11)
   *
   * **適用ガイドライン**:
   * - article カード (bg.surface) 周りや内部 hr / table / divider など、
   *   視覚的区切り線を弱く出したい用途で使用する。
   * - bg.elevated (dark: sumi-600) 上では 2.57:1 で 3:1 未達。bg.elevated
   *   表面の border が必要な場合は引き続き bg.elevated 反転利用 (Button
   *   secondary / BackToTop など、Issue #409 では置換対象外) を継続する。
   * - text color として転用しないこと (border 専用 token)。
   */
  readonly borderSubtle: SemanticColorPair;
  /**
   * コードブロック背景 (`<pre>`)。Editorial Citrus でも従来配色を温存する。
   * 02-color-system.md §"既存 Gruvbox の取り扱い"。
   */
  readonly bgCode: SemanticColorPair;
  /**
   * インラインコード背景 (`<code>`)。コードブロック中間階調 (旧 bg2)。
   */
  readonly bgCodeInline: SemanticColorPair;
  /**
   * コピーボタン枠など、コードブロック付随 UI のボーダー色 (旧 bg3)。
   */
  readonly bgCodeBorder: SemanticColorPair;
  /**
   * コード本文の既定文字色。シンタックスハイライト未適用箇所のフォールバック
   * (旧 fg1)。
   */
  readonly fgCode: SemanticColorPair;
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
  bgMuted: {
    light: oklchPrimitives.cream["75"],
    dark: oklchPrimitives.sumi["650"],
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
  accentFeatured: {
    light: oklchPrimitives.persimmon["600"],
    dark: oklchPrimitives.persimmon["500"],
  },
  accentLink: {
    light: oklchPrimitives.indigo["500"],
    dark: oklchPrimitives.indigo["300"],
  },
  focusRing: {
    light: oklchPrimitives.citrus["500"],
    dark: oklchPrimitives.citrus["500"],
  },
  borderSubtle: {
    light: oklchPrimitives.cream["300"],
    dark: oklchPrimitives.sumi["400"],
  },
  bgCode: {
    light: codeBlockColors.light.bg0,
    dark: codeBlockColors.dark.bg0,
  },
  bgCodeInline: {
    light: codeBlockColors.light.bg2,
    dark: codeBlockColors.dark.bg2,
  },
  bgCodeBorder: {
    light: codeBlockColors.light.bg3,
    dark: codeBlockColors.dark.bg3,
  },
  fgCode: {
    light: codeBlockColors.light.fg1,
    dark: codeBlockColors.dark.fg1,
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
