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
        'xs': { value: '1.2em' },
        'sm': { value: '1.4em' },
        'base': { value: '1.6em' },
        'lg': { value: '1.8em' },
        'xl': { value: '2em' },
        '2xl': { value: '2.4em' },
        '3xl': { value: '3em' },
        '4xl': { value: '3.6em' },
        '5xl': { value: '4.8em' },
        '6xl': { value: '6em' },
      },
    },
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        surface: {
          50: '#ffffff',
          100: '#fafafa',
          200: '#f5f5f5',
          300: '#f0f0f0',
          400: '#dedede',
          500: '#c2c2c2',
          600: '#979797',
          700: '#818181',
          800: '#606060',
          900: '#3c3c3c',
        }
      },
      gradients: {
        hero: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        card: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        accent: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)',
        primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        cardStripe: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
      },
      spacing: {
        'content': '32px',
        'section': '48px',
        'card': '24px',
      },
      sizes: {
        'container': '1200px',
        'article': '800px',
        'header': '70px',
      },
      shadows: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        glow: '0 0 20px rgba(102, 126, 234, 0.4)',
      },
    },
  },

  // The output directory for your css system
  outdir: "styled-system",
});
