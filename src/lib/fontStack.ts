/**
 * Editorial Citrus 本文フォントスタックの正本 (Issue #387)。
 *
 * 一次フォント: Newsreader VF (OFL 1.1, self-host)。
 * 和文: OS 既定の明朝 (Hiragino Mincho ProN / Yu Mincho) にフォールバック。
 *
 * このモジュールは "正本" として扱い、index.html / index.css との同期を
 * CI (Vitest) で検証する。値を変える場合は必ず以下も同期すること:
 *   - src/index.css の :root font-family と @font-face
 *   - public/fonts/ 以下の woff2 と Newsreader-LICENSE.txt
 *   - index.html の preload link
 *
 * 注: 本 R-1 では Panda の `theme.tokens.fonts` トークンには `serif` を
 * 追加していない (現状 `:root { font-family }` の CSS 直書きのみが本番経路)。
 * Panda 経由の textStyles は R-2 / R-3 で見出し階層と一緒に整備する予定で、
 * その際に Panda token を追加する。
 */

/**
 * 本文フォントスタック (順序通り)。
 *
 * - "Newsreader" は self-host VF (200..800)
 * - "Noto Serif JP" は明示的に self-host しない (合計 KB 削減のため)。
 *   Android / Linux など OS にプリインストールされている環境でのみ
 *   有効になる。Hiragino より上位に置いているのは、macOS では unicode-range
 *   と OS-localized fallback で和文が Hiragino に流れるため
 *   配置順による実害が無く、一方で Android / Linux ユーザーの可読性を上げる
 *   メリットだけ取るためである。
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
 * Italic woff2 は本 Issue では同梱しない (Phase2 で再導入予定)。
 */
export const fontAssetPaths = {
  newsreaderLatin: "/fonts/Newsreader-VF-Latin.woff2",
  newsreaderLatinExt: "/fonts/Newsreader-VF-LatinExt.woff2",
  newsreaderLicense: "/fonts/Newsreader-LICENSE.txt",
} as const;
