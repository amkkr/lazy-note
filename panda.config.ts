import { defineConfig } from "@pandacss/dev";

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
      },
    },
    extend: {
      tokens: {
        colors: {
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
          header: { value: "70px" },
        },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
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
