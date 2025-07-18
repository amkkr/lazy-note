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
          primary: {
            50: { value: "#f0f9ff" },
            100: { value: "#e0f2fe" },
            200: { value: "#bae6fd" },
            300: { value: "#7dd3fc" },
            400: { value: "#38bdf8" },
            500: { value: "#0ea5e9" },
            600: { value: "#0284c7" },
            700: { value: "#0369a1" },
            800: { value: "#075985" },
            900: { value: "#0c4a6e" },
          },
          secondary: {
            50: { value: "#fafaf9" },
            100: { value: "#f5f5f4" },
            200: { value: "#e7e5e4" },
            300: { value: "#d6d3d1" },
            400: { value: "#a8a29e" },
            500: { value: "#78716c" },
            600: { value: "#57534e" },
            700: { value: "#44403c" },
            800: { value: "#292524" },
            900: { value: "#1c1917" },
          },
          accent: {
            50: { value: "#fff7ed" },
            100: { value: "#ffedd5" },
            200: { value: "#fed7aa" },
            300: { value: "#fdba74" },
            400: { value: "#fb923c" },
            500: { value: "#f97316" },
            600: { value: "#ea580c" },
            700: { value: "#c2410c" },
            800: { value: "#9a3412" },
            900: { value: "#7c2d12" },
          },
          surface: {
            50: { value: "#ffffff" },
            100: { value: "#fafafa" },
            200: { value: "#f5f5f5" },
            300: { value: "#f0f0f0" },
            400: { value: "#dedede" },
            500: { value: "#c2c2c2" },
            600: { value: "#979797" },
            700: { value: "#818181" },
            800: { value: "#606060" },
            900: { value: "#3c3c3c" },
          },
        },
        gradients: {
          hero: { value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
          card: { value: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)" },
          accent: { value: "linear-gradient(90deg, #f97316 0%, #ea580c 100%)" },
          primary: {
            value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          },
          cardStripe: {
            value: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
          },
        },
        spacing: {
          content: { value: "32px" },
          section: { value: "48px" },
          card: { value: "24px" },
        },
        sizes: {
          container: { value: "1200px" },
          article: { value: "800px" },
          header: { value: "70px" },
        },
        shadows: {
          card: {
            value:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          },
          "card-hover": {
            value:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          },
          glow: { value: "0 0 20px rgba(102, 126, 234, 0.4)" },
        },
      },
    },
  },

  // The output directory for your css system
  outdir: "styled-system",
});
