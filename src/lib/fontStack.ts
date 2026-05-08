/**
 * Editorial Citrus 本文フォントスタックの正本 (Issue #387)。
 *
 * 一次フォント: Newsreader VF (OFL 1.1, self-host)。
 * 和文: OS 既定の明朝 (Hiragino Mincho ProN / Yu Mincho) にフォールバック。
 *
 * このモジュールは "正本" として扱い、index.html / index.css / panda.config.ts
 * との同期を CI (Vitest) で検証する。値を変える場合は必ず以下も同期すること:
 *   - src/index.css の :root font-family
 *   - panda.config.ts theme.extend.tokens.fonts.serif
 *   - public/fonts/ 以下の woff2 と OFL.txt
 *   - index.html の preload link
 */

/**
 * 本文フォントスタック (順序通り)。
 *
 * - "Newsreader" は self-host VF (200..800)
 * - "Noto Serif JP" は将来 self-host する余地として残す (現時点では bundled しない)
 * - "Hiragino Mincho ProN" は macOS / iOS の既定明朝
 * - "Yu Mincho" / "YuMincho" は Windows / 旧 macOS の既定明朝
 * - 末尾の "serif" は generic family
 */
export const bodyFontStack: readonly string[] = [
  "Newsreader",
  "Noto Serif JP",
  "Hiragino Mincho ProN",
  "Yu Mincho",
  "YuMincho",
  "serif",
] as const;

/**
 * フォントスタックを CSS の `font-family` 値として整形する。
 *
 * - スペースや非 ASCII を含む family 名はダブルクォートで括る
 * - generic family (serif など) はクォートしない
 */
export const formatFontStack = (stack: readonly string[]): string => {
  const genericFamilies = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
    "math",
    "emoji",
    "fangsong",
  ]);

  return stack
    .map((family) => {
      if (genericFamilies.has(family)) {
        return family;
      }
      return `"${family}"`;
    })
    .join(", ");
};

/**
 * 公開フォントアセットへのパス (public/ 直下の絶対パス)。
 *
 * これらは @font-face / preload で参照される。
 */
export const fontAssetPaths = {
  newsreaderLatin: "/fonts/Newsreader-VF-Latin.woff2",
  newsreaderLatinItalic: "/fonts/Newsreader-VF-Latin-Italic.woff2",
  newsreaderLatinExt: "/fonts/Newsreader-VF-LatinExt.woff2",
  newsreaderLatinExtItalic: "/fonts/Newsreader-VF-LatinExt-Italic.woff2",
  oflLicense: "/fonts/OFL.txt",
} as const;
