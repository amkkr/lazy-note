import { defineConfig } from "@pandacss/dev";

/**
 * Editorial Citrus デザインリニューアル (Issue #358) の OKLCH カラートークン。
 *
 * 値の正本: src/lib/colorTokens.ts
 * 仕様書: docs/rfc/editorial-citrus/02-color-system.md
 *
 * ここでは Panda CSS の値が文字列リテラルでなければならない制約により、
 * src/lib/colorTokens.ts と同じ値を直接記述している。値を変える場合は
 * 必ず両方を揃え、scripts/calculateContrast.ts による AAA 実測を通すこと
 * (本文ペアが 7.20:1 を割った時点で merge ブロック)。
 *
 * R-2c (Issue #390) で旧 5 段階トークン (bg.0..bg.4 / fg.0..fg.4) と旧パレット
 * 階層を削除し、UI は OKLCH semantic token (bg.canvas / surface / elevated /
 * fg.primary / secondary / muted / accent.brand / featured / link) に統一。
 * コードブロック背景・前景は `bg.code` / `bg.codeInline` / `bg.codeBorder` /
 * `fg.code` のリテラル hex で固定する (Shiki/Prism との視覚整合のため)。
 */
export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}", "./pages/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

  conditions: {
    extend: {
      light: "[data-theme=light] &",
      dark: "[data-theme=dark] &",
    },
  },

  // Useful for theme customization
  theme: {
    tokens: {
      fontSizes: {
        xs: { value: "1.2em" },
        sm: { value: "1.4em" },
        base: { value: "1.6em" },
        lg: { value: "1.8em" },
        xl: { value: "2em" },
        "2xl": { value: "2.4em" },
        "3xl": { value: "3em" },
        "4xl": { value: "3.6em" },
        "5xl": { value: "4.8em" },
        "6xl": { value: "6em" },
      },
      lineHeights: {
        tight: { value: "1.1" },
        snug: { value: "1.2" },
        normal: { value: "1.3" },
        relaxed: { value: "1.4" },
        loose: { value: "1.6" },
        body: { value: "1.7" },
        // Editorial Citrus 本文タイポグラフィ (Issue #391)。
        // Newsreader VF + 日本語明朝混植時に最適な行送り (RFC 03-typography.md)。
        prose: { value: "1.85" },
      },
    },
    extend: {
      tokens: {
        // ====================================================================
        // 本文フォントスタックは Panda token としては未登録 (Issue #387)。
        // R-1 では :root { font-family } を src/index.css に直接書く方針で、
        // R-2 / R-3 (見出し階層 + textStyles 整備) のタイミングで
        // theme.tokens.fonts.serif を追加する予定。
        // ====================================================================
        colors: {
          // ====================================================================
          // Editorial Citrus OKLCH primitives (Issue #358)
          //
          // - 暖色 light (H=85) と中性 dark (H=220) で温度差を圧縮
          // - 値の正本は src/lib/colorTokens.ts。両者は必ず一致させる。
          // - AAA 7.20:1 を scripts/calculateContrast.ts で実測 (CI で gate)。
          // ====================================================================
          cream: {
            "50": { value: "oklch(0.985 0.013 85)" },
            "100": { value: "oklch(0.965 0.018 85)" },
          },
          bone: {
            "50": { value: "oklch(0.965 0.005 220)" },
            "100": { value: "oklch(0.920 0.005 220)" },
          },
          ink: {
            "primary-on-cream": { value: "oklch(0.205 0.020 85)" },
            "secondary-on-cream": { value: "oklch(0.380 0.018 85)" },
            "900": { value: "oklch(0.150 0.020 85)" },
          },
          sumi: {
            // L=0.620 (RFC 02 の初期値 0.560 から AAA 実測で調整、sumi-950 上で 5.15:1)
            "500": { value: "oklch(0.620 0 0)" },
            "600": { value: "oklch(0.470 0 0)" },
            "700": { value: "oklch(0.380 0 0)" },
            // dark 既定背景。H=220 中性で暖色光下の違和感を回避。
            "950": { value: "oklch(0.180 0.012 220)" },
          },
          // Persimmon = ブランド一次色。CTA / Featured / OG 画像 / 紹介ページで
          // **単色運用** (グラデーション・装飾なし)。本文リンク・focus には使わない。
          // L=0.520 (RFC 02 の初期値 0.580 から AAA 実測で調整、CTA white-on で 5.74:1)
          persimmon: {
            "500": { value: "oklch(0.640 0.180 38)" },
            "600": { value: "oklch(0.520 0.180 38)" },
            "700": { value: "oklch(0.450 0.170 38)" },
          },
          // L=0.430 (RFC 02 の初期値 0.470 から AAA 実測で調整、cream-50 上で 7.82:1)
          indigo: {
            "300": { value: "oklch(0.760 0.110 250)" },
            "500": { value: "oklch(0.430 0.150 250)" },
          },
          // focus 専用色。accent ボタン上では二重リング外側 ink-900 + 内側 citrus-500。
          citrus: {
            "500": { value: "oklch(0.860 0.150 105)" },
          },

          // ====================================================================
          // コードハイライト系アクセント (Shiki/Prism 導入時の参照用に温存)
          //
          // 本文・UI トークンは Editorial Citrus に移行済み。
          // 旧 5 段階パレット (旧 bg0..4 / fg0..4) は R-2c (Issue #390) で削除済み。
          // 詳細: docs/rfc/editorial-citrus/02-color-system.md §"既存 Gruvbox の取り扱い"
          // ====================================================================
          red: {
            light: { value: "#fb4934" },
            dark: { value: "#cc241d" },
          },
          green: {
            light: { value: "#b8bb26" },
            dark: { value: "#98971a" },
          },
          yellow: {
            light: { value: "#fabd2f" },
            dark: { value: "#d79921" },
          },
          blue: {
            light: { value: "#83a598" },
            dark: { value: "#458588" },
          },
          purple: {
            light: { value: "#d3869b" },
            dark: { value: "#b16286" },
          },
          aqua: {
            light: { value: "#8ec07c" },
            dark: { value: "#689d6a" },
          },
          orange: {
            light: { value: "#fe8019" },
            dark: { value: "#d65d0e" },
          },
          gray: {
            light: { value: "#a89984" },
            dark: { value: "#928374" },
          },
        },
        spacing: {
          "2xs": { value: "2px" },
          xs: { value: "4px" },
          "xs-sm": { value: "6px" },
          sm: { value: "8px" },
          "sm-md": { value: "12px" },
          "sm-lg": { value: "14px" },
          md: { value: "16px" },
          lg: { value: "24px" },
          xl: { value: "32px" },
          "2xl": { value: "48px" },
          content: { value: "32px" },
          section: { value: "48px" },
          card: { value: "24px" },
        },
        radii: {
          sm: { value: "4px" },
          md: { value: "8px" },
          lg: { value: "12px" },
          xl: { value: "20px" },
          full: { value: "9999px" },
        },
        sizes: {
          container: { value: "1200px" },
          content: { value: "900px" },
          article: { value: "800px" },
          // Editorial Citrus 本文 measure (Issue #391)。
          // 紙面組版の標準値 36rem (= 576px) を採用し、1 行の文字数を
          // 読みやすい範囲 (全角 36-40 字程度) に制限する。
          //
          // 注意: src/index.css の :root { font-size: 62.5% } により
          // 本プロジェクトの 1rem = 10px となるため、CSS 標準 (1rem = 16px) 前提の
          // RFC 04-layout.md §"本文 36rem" を 576px として実装する場合は
          // 57.6rem を指定する必要がある。値の正本は 576px (= 57.6rem)。
          prose: { value: "57.6rem" },
          header: { value: "70px" },
        },
      },
    },
    semanticTokens: {
      colors: {
        // ====================================================================
        // Editorial Citrus セマンティックトークン (Issue #358 / #388 R-2a)
        //
        // 階層は 1 段に留めている (過剰多層化を回避)。
        // 02-color-system.md §"Panda CSS 統合 (概要)" 参照。
        //
        // R-2a (Issue #388) で追加した token:
        //   - accent.featured (persimmon 系、Featured バッジ・CTA 用)
        //   - focus.ring      (citrus-500、visible focus ring 専用、R-5 で利用)
        //   - bg.code / bg.codeInline / bg.codeBorder / fg.code (旧パレット温存)
        // R-2a (Issue #388) のレビューで削除した token:
        //   - accent.focus    (focus.ring と同値で混乱を招くため、参照 0 件のうちに削除)
        //
        // WCAG AA 4.5:1 contrast (culori 実測):
        //   - bg.canvas × fg.primary   (light): 17.16:1 PASS (AAA)
        //   - bg.canvas × fg.primary   (dark):  16.98:1 PASS (AAA)
        //   - bg.canvas × fg.secondary (light):  9.59:1 PASS (AAA)
        //   - bg.canvas × fg.secondary (dark):  14.84:1 PASS (AAA)
        //   - bg.canvas × fg.muted     (light):  6.54:1 PASS (AA, AAA 未達)
        //     ※ fg.muted は本文として運用しない (補助情報のみ)。本文用途では
        //        sumi-700 へ振り直すか fg.secondary を使うこと。
        //   - bg.canvas × fg.muted     (dark):  14.84:1 PASS (AAA)
        //   - bg.surface × fg.primary  (light): 16.19:1 PASS (AAA)
        //   - bg.canvas × accent.link  (light):  7.82:1 PASS (AAA)
        //   - bg.canvas × accent.link  (dark):   8.79:1 PASS (AAA)
        //   - bg.canvas × accent.featured (light, persimmon-600): 5.74:1 PASS (AA)
        //   - bg.canvas × accent.featured (dark, persimmon-500):  5.17:1 PASS (AA)
        //   - focus.ring × bg.canvas (dark, citrus × sumi-950): 12.43:1 PASS (AAA)
        //   - focus.ring × bg.canvas (light, citrus × cream-50): 1.45:1 FAIL
        //     ※ light テーマで単独使用すると AA 不足。必ず二重リング運用すること。
        //   - focus.ring 二重リング (citrus-500 × ink-900 内側): 13.03:1 PASS (AAA)
        //   - focus.ring 二重リング外側 (ink-900 × persimmon-600): 3.28:1 PASS (UI 装飾 3:1)
        // ====================================================================
        bg: {
          canvas: {
            value: {
              _light: "{colors.cream.50}",
              _dark: "{colors.sumi.950}",
            },
          },
          surface: {
            value: {
              _light: "{colors.cream.100}",
              _dark: "{colors.sumi.700}",
            },
          },
          elevated: {
            value: {
              _light: "{colors.cream.50}",
              _dark: "{colors.sumi.600}",
            },
          },
          // ----------------------------------------------------------------
          // コードブロック専用トークン (R-2a / Issue #388 で追加、R-2c で hex 直接化)
          //
          // **Editorial Citrus でも従来配色を温存。Shiki/Prism との整合性のため。**
          // R-2c (Issue #390) で旧 5 段階 token を削除した際、依存していた
          // `colors.gruvbox.*` も削除したため、ここでは hex リテラルを直接記述する
          // (値の同期: src/lib/colorTokens.ts の codeBlockColors)。
          // 詳細: docs/rfc/editorial-citrus/02-color-system.md §"既存 Gruvbox の取り扱い"
          //
          // 用途別マッピング:
          //   bg.code        : <pre> ブロック背景 (Shiki/Prism のキャンバス)
          //   bg.codeInline  : <code> インライン背景 (本文中の `code`)
          //   bg.codeBorder  : copy ボタン枠など、コードブロック付随 UI のボーダー
          // ----------------------------------------------------------------
          code: {
            value: {
              _light: "#fbf1c7",
              _dark: "#282828",
            },
          },
          codeInline: {
            value: {
              _light: "#d5c4a1",
              _dark: "#504945",
            },
          },
          codeBorder: {
            value: {
              _light: "#bdae93",
              _dark: "#665c54",
            },
          },
        },
        fg: {
          primary: {
            value: {
              _light: "{colors.ink.primary-on-cream}",
              _dark: "{colors.bone.50}",
            },
          },
          secondary: {
            value: {
              _light: "{colors.ink.secondary-on-cream}",
              _dark: "{colors.bone.100}",
            },
          },
          muted: {
            value: {
              _light: "{colors.sumi.600}",
              _dark: "{colors.bone.100}",
            },
          },
          // ----------------------------------------------------------------
          // CTA (accent.brand 背景) 上の文字色 (Issue #408 で追加)
          //
          // Button.tsx (primary variant) / Link.tsx (button variant) /
          // EmptyState.tsx の CTA Link で使用していた primitive 直書き
          // ({_light: "cream.50", _dark: "ink.900"}) を semantic token として
          // 集約する。値の正本は src/lib/colorTokens.ts の semanticColorTokens.fgOnBrand。
          //
          // WCAG コントラスト (scripts/calculateContrast.ts cta/* ペアと同期):
          //   - light (cream-50 × persimmon-600): 5.74:1 PASS (AA)
          //   - dark  (ink-900   × persimmon-500): 5.42:1 PASS (AA)
          //
          // 必ず accent.brand 背景上で使うこと。bg.canvas / surface 上では
          // light の cream-50 が背景に同化するため使用不可。
          // ----------------------------------------------------------------
          onBrand: {
            value: {
              _light: "{colors.cream.50}",
              _dark: "{colors.ink.900}",
            },
          },
          // ----------------------------------------------------------------
          // コードブロック本文の既定文字色 (R-2a / Issue #388 で追加、R-2c で hex 直接化)
          //
          // Shiki/Prism のシンタックスハイライトが適用されない箇所
          // (例: マークアップ未対応のコード片) のフォールバック文字色。
          // 従来配色 (旧 Gruvbox fg1) を hex リテラルで温存し、シンタックスハイライト
          // 全体と整合させる (値の同期: src/lib/colorTokens.ts の codeBlockColors)。
          // ----------------------------------------------------------------
          code: {
            value: {
              _light: "#3c3836",
              _dark: "#ebdbb2",
            },
          },
        },
        accent: {
          // accent / link / focus を 3 軸分離。混線を避けるため、
          // CTA は brand、リンクは link、キーボード可視性は focus を使い分ける。
          brand: {
            value: {
              _light: "{colors.persimmon.600}",
              _dark: "{colors.persimmon.500}",
            },
          },
          // R-2a (Issue #388) で追加。Featured バッジ・主要 CTA で使用。
          // accent.brand と同値だが、用途分離のため別 token として独立。
          // light: persimmon-600 (cream-50 上で 5.74:1 PASS / AA)
          // dark : persimmon-500 (sumi-950 上で 5.17:1 PASS / AA)
          //
          // 使用ガイドライン (詳細は colorTokens.ts JSDoc 参照):
          //   - 背景色: bg.canvas / bg.surface (light) 上で AA pass。
          //     dark の bg.surface (sumi-700) 上は 2.76:1 で AA 不足のため不可。
          //   - 文字色: 14pt 以下の本文に使用禁止 (AAA 未達)。16px+ / bold / 大見出しのみ。
          //   - hover/focus の反転は accent.brand と同期させること。
          featured: {
            value: {
              _light: "{colors.persimmon.600}",
              _dark: "{colors.persimmon.500}",
            },
          },
          link: {
            value: {
              _light: "{colors.indigo.500}",
              _dark: "{colors.indigo.300}",
            },
          },
        },
        // ----------------------------------------------------------------
        // focus.ring (R-2a / Issue #388 で新規追加、R-5 で利用)
        //
        // visible focus ring 専用色。focus は accent ではないため、accent 階層
        // とは別に独立 namespace を切る。
        // (旧 accent.focus は同値で混乱を招くため #388 のレビューで削除済み)
        //
        // 値: citrus-500 (light/dark 共通)
        //   - light の cream-50 上では 1.45:1 のため、accent ボタン上などでは
        //     二重リング (外 ink-900 + 内 citrus-500、内側 13.03:1 AAA) を採用。
        //   - dark の sumi-950 上では 12.43:1 PASS (AAA)。
        //   - 単純な背景上 (light) で AA を確保する場合は外側 ink-900 を併用する想定。
        //
        // 運用ルール (重要):
        //   必ず内側に ink-900 (or sumi-950) を伴う二重リングで使うこと。
        //   light テーマ単独使用は AA 不足 (1.45:1) で違反となる。
        //   R-5 で boxShadow inset/outset の二重指定を共通化する予定。
        // ----------------------------------------------------------------
        focus: {
          ring: {
            value: {
              _light: "{colors.citrus.500}",
              _dark: "{colors.citrus.500}",
            },
          },
        },
        // status は色相を持たず sumi 階調 + テキストラベルで表現する。
        // 色覚多様性 + Editorial の落ち着きを両立 (02-color-system.md §"Status は色相なし")。
        status: {
          draft: {
            value: {
              _light: "{colors.sumi.500}",
              _dark: "{colors.sumi.500}",
            },
          },
          published: {
            value: {
              _light: "{colors.sumi.600}",
              _dark: "{colors.sumi.600}",
            },
          },
          archived: {
            value: {
              _light: "{colors.sumi.700}",
              _dark: "{colors.sumi.700}",
            },
          },
        },
        overlay: {
          value: "rgba(0, 0, 0, 0.8)",
        },
      },
      shadows: {
        card: {
          value: {
            _dark:
              "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
            _light:
              "0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.05)",
          },
        },
        "card-hover": {
          value: {
            _dark:
              "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
            _light:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.06)",
          },
        },
        glow: {
          value: {
            _dark: "0 0 20px rgba(131, 165, 152, 0.4)",
            _light: "0 0 20px rgba(69, 133, 136, 0.3)",
          },
        },
      },
      // ----------------------------------------------------------------
      // gradients は R-4 (Issue #392) で削除。
      //
      // Editorial Citrus / Calm 思想 (装飾ノイズの徹底削除、紙面的な
      // editorial 表現) に基づき、UI 用グラデーションは廃止し、
      // bg.canvas / bg.surface / bg.elevated と accent.brand の単色
      // 運用に統一した。RFC §"Calm" 参照。
      //
      // 旧 token (gradients.hero / card / accent / primary / cardStripe)
      // の参照は 0 件 (R-4 PR で grep 確認済み)。
      //
      // **再導入する場合のルール (重要):**
      //   1. RFC 02 (color-system) を改訂し、Calm 思想との整合を改めて議論
      //      すること。装飾ノイズ削除の方針を覆すには明示的な合意が必要。
      //   2. `gradients.primary` `gradients.hero` `gradients.card`
      //      `gradients.accent` `gradients.cardStripe` のような旧 token 名の
      //      **再利用は禁止**。Calm 文脈に整合する新規 token 名で起票し、
      //      用途を限定すること (例: 紙面的な静かな gradient なら別名で)。
      //   3. CI gate (calculateContrast.ts) で gradient 上に置かれる文字色の
      //      AA / AAA を実測すること。フラット bg と異なり中間値の輝度評価が
      //      必要になる。
      // ----------------------------------------------------------------
    },
  },

  // The output directory for your css system
  outdir: "styled-system",
});
