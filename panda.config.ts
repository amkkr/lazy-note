import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}", "./pages/**/*.{js,jsx,ts,tsx}"],

  // Files to exclude
  exclude: [],

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
    },
    extend: {
      tokens: {
        colors: {
          // Gruvbox dark color palette
          bg: {
            0: { value: "#282828" }, // bg0
            1: { value: "#3c3836" }, // bg1
            2: { value: "#504945" }, // bg2
            3: { value: "#665c54" }, // bg3
            4: { value: "#7c6f64" }, // bg4
          },
          fg: {
            0: { value: "#fbf1c7" }, // fg0
            1: { value: "#ebdbb2" }, // fg1
            2: { value: "#d5c4a1" }, // fg2
            3: { value: "#bdae93" }, // fg3
            4: { value: "#a89984" }, // fg4
          },
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
        gradients: {
          hero: { value: "linear-gradient(135deg, #458588 0%, #689d6a 100%)" },
          card: { value: "linear-gradient(145deg, #3c3836 0%, #282828 100%)" },
          accent: { value: "linear-gradient(90deg, #fe8019 0%, #d65d0e 100%)" },
          primary: {
            value: "linear-gradient(135deg, #458588 0%, #689d6a 100%)",
          },
          cardStripe: {
            value: "linear-gradient(90deg, #458588 0%, #689d6a 100%)",
          },
        },
        spacing: {
          xs: { value: "4px" },
          "xs-sm": { value: "6px" },
          sm: { value: "8px" },
          "sm-md": { value: "12px" },
          md: { value: "16px" },
          lg: { value: "24px" },
          xl: { value: "32px" },
          "2xl": { value: "48px" },
          content: { value: "32px" },
          section: { value: "48px" },
          card: { value: "24px" },
        },
        sizes: {
          container: { value: "1200px" },
          content: { value: "900px" },
          article: { value: "800px" },
          header: { value: "70px" },
        },
        shadows: {
          card: {
            value:
              "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)",
          },
          "card-hover": {
            value:
              "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
          },
          glow: { value: "0 0 20px rgba(131, 165, 152, 0.4)" },
        },
      },
    },
  },

  // The output directory for your css system
  outdir: "styled-system",
});
