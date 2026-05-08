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
 * 既存 Gruvbox はコードブロックハイライト (Shiki / Prism 等) 用に温存しており、
 * 本文・UI からは段階的に剥離する方針 (02-color-system.md §"既存 Gruvbox の取り扱い")。
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
          // 既存 Gruvbox (コードブロックハイライト専用に温存)
          //
          // 本文・UI トークンは Editorial Citrus に移行済み。
          // Shiki / Prism のコードハイライトは慣れた配色を保つため Gruvbox を維持。
          // 詳細: docs/rfc/editorial-citrus/02-color-system.md §"既存 Gruvbox の取り扱い"
          // ====================================================================
          gruvbox: {
            dark: {
              bg0: { value: "#282828" },
              bg1: { value: "#3c3836" },
              bg2: { value: "#504945" },
              bg3: { value: "#665c54" },
              bg4: { value: "#7c6f64" },
              fg0: { value: "#fbf1c7" },
              fg1: { value: "#ebdbb2" },
              fg2: { value: "#d5c4a1" },
              fg3: { value: "#bdae93" },
              fg4: { value: "#a89984" },
            },
            light: {
              bg0: { value: "#fbf1c7" },
              bg1: { value: "#ebdbb2" },
              bg2: { value: "#d5c4a1" },
              bg3: { value: "#bdae93" },
              bg4: { value: "#a89984" },
              fg0: { value: "#282828" },
              fg1: { value: "#3c3836" },
              fg2: { value: "#504945" },
              fg3: { value: "#665c54" },
              fg4: { value: "#7c6f64" },
            },
          },
          // 既存 Gruvbox 系アクセント (コードハイライト用に温存)
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
          // 紙面組版の標準値 36rem (576px) で 1 行の文字数を読みやすい範囲に制限する。
          prose: { value: "36rem" },
          header: { value: "70px" },
        },
      },
    },
    semanticTokens: {
      colors: {
        // ====================================================================
        // Editorial Citrus セマンティックトークン (Issue #358)
        //
        // 階層は 1 段に留めている (過剰多層化を回避)。
        // 02-color-system.md §"Panda CSS 統合 (概要)" 参照。
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
          // 既存 Gruvbox エイリアス (段階的移行用に温存)
          0: {
            value: {
              _dark: "{colors.gruvbox.dark.bg0}",
              _light: "{colors.gruvbox.light.bg0}",
            },
          },
          1: {
            value: {
              _dark: "{colors.gruvbox.dark.bg1}",
              _light: "{colors.gruvbox.light.bg1}",
            },
          },
          2: {
            value: {
              _dark: "{colors.gruvbox.dark.bg2}",
              _light: "{colors.gruvbox.light.bg2}",
            },
          },
          3: {
            value: {
              _dark: "{colors.gruvbox.dark.bg3}",
              _light: "{colors.gruvbox.light.bg3}",
            },
          },
          4: {
            value: {
              _dark: "{colors.gruvbox.dark.bg4}",
              _light: "{colors.gruvbox.light.bg4}",
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
          // 既存 Gruvbox エイリアス (段階的移行用に温存)
          0: {
            value: {
              _dark: "{colors.gruvbox.dark.fg0}",
              _light: "{colors.gruvbox.light.fg0}",
            },
          },
          1: {
            value: {
              _dark: "{colors.gruvbox.dark.fg1}",
              _light: "{colors.gruvbox.light.fg1}",
            },
          },
          2: {
            value: {
              _dark: "{colors.gruvbox.dark.fg2}",
              _light: "{colors.gruvbox.light.fg2}",
            },
          },
          3: {
            value: {
              _dark: "{colors.gruvbox.dark.fg3}",
              _light: "{colors.gruvbox.light.fg3}",
            },
          },
          4: {
            value: {
              _dark: "{colors.gruvbox.dark.fg4}",
              _light: "{colors.gruvbox.light.fg4}",
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
          link: {
            value: {
              _light: "{colors.indigo.500}",
              _dark: "{colors.indigo.300}",
            },
          },
          focus: {
            value: {
              _light: "{colors.citrus.500}",
              _dark: "{colors.citrus.500}",
            },
          },
          // 既存 Gruvbox 系 accent (段階的移行用に温存)
          blue: {
            value: {
              _dark: "{colors.blue.light}",
              _light: "{colors.blue.dark}",
            },
          },
          "blue-hover": {
            value: {
              _dark: "{colors.aqua.light}",
              _light: "{colors.aqua.dark}",
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
      gradients: {
        hero: {
          value: {
            _dark: "linear-gradient(135deg, #458588 0%, #689d6a 100%)",
            _light: "linear-gradient(135deg, #076678 0%, #79740e 100%)",
          },
        },
        card: {
          value: {
            _dark: "linear-gradient(145deg, #3c3836 0%, #282828 100%)",
            _light: "linear-gradient(145deg, #ebdbb2 0%, #fbf1c7 100%)",
          },
        },
        accent: {
          value: {
            _dark: "linear-gradient(90deg, #fe8019 0%, #d65d0e 100%)",
            _light: "linear-gradient(90deg, #af3a03 0%, #d65d0e 100%)",
          },
        },
        primary: {
          value: {
            _dark: "linear-gradient(135deg, #458588 0%, #689d6a 100%)",
            _light: "linear-gradient(135deg, #076678 0%, #79740e 100%)",
          },
        },
        cardStripe: {
          value: {
            _dark: "linear-gradient(90deg, #458588 0%, #689d6a 100%)",
            _light: "linear-gradient(90deg, #076678 0%, #79740e 100%)",
          },
        },
      },
    },
  },

  // The output directory for your css system
  outdir: "styled-system",
});
