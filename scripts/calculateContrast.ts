#!/usr/bin/env node

/**
 * AAA コントラスト実測スクリプト (スケルトン)
 *
 * Editorial Citrus デザインリニューアル RFC の死守ポイント 1
 * 「AAA 7:1 を culori 実測で担保」を実現するための CLI。
 *
 * 仕様詳細:
 * - docs/rfc/editorial-citrus/02-color-system.md (AAA 実測ルール)
 * - docs/rfc/editorial-citrus/07-accessibility-and-performance.md (G2 ハードゲート)
 *
 * 注意: 本ファイルは Issue #0a で本実装を完成させるためのスケルトンです。
 * 現時点では実行しても何も検証しません。
 *
 * TODO(#0a): culori を依存に追加し、OKLCH → sRGB 変換を実装する
 *   - import { converter, formatRgb, wcagContrast } from "culori";
 *
 * TODO(#0a): panda.config.ts の theme.tokens.colors / semanticTokens.colors を
 *   ロードし、主要ペアを網羅する (本文 / メタ / リンク / focus / status)
 *   - 本文 ペア: cream-50 × ink-primary-on-cream
 *   - 本文 ペア: sumi-950 × bone-50
 *   - リンク (light): cream-50 × indigo-500
 *   - リンク (dark):  sumi-950 × indigo-300
 *   - focus accent 上: persimmon-600 × citrus-500 (二重リング前提)
 *   - status: cream-50 × sumi-700, sumi-950 × sumi-500 等
 *
 * TODO(#0a): 閾値を要求する
 *   - 本文ペア: ratio >= 7.20 (AAA + 1〜2% マージン)
 *   - UI 大文字 (>= 18pt or >= 14pt bold): ratio >= 4.50
 *   - 未満は process.exit(1) で CI を fail させる
 *
 * TODO(#0a): 1.05 倍以内のマージン僅少ペアは PR コメントで warn する
 *   - GitHub Actions の出力で `::warning::` を付与
 *
 * TODO(#0a): Lighthouse の値に頼らないことを明示する README コメントを追加
 *
 * 使い方 (本実装後の想定):
 *   pnpm contrast:check
 *   pnpm contrast:check --strict   # マージン僅少も fail にする
 */

interface ContrastPair {
  readonly name: string;
  readonly fg: string; // OKLCH 文字列 (例: "oklch(0.205 0.020 85)")
  readonly bg: string;
  readonly minRatio: number; // 本文 7.20 / UI 4.50 等
}

/**
 * 主要なコントラストペアを返す。
 * TODO(#0a): panda.config.ts から動的に読み出す形に置き換える。
 */
const getContrastPairs = (): readonly ContrastPair[] => {
  // TODO(#0a): 仮の空配列。実装時に置き換え。
  return [];
};

/**
 * 単一ペアのコントラスト比を計算する。
 * TODO(#0a): culori の wcagContrast を使って実装する。
 */
const computeContrast = (_pair: ContrastPair): number => {
  // TODO(#0a): culori で OKLCH → sRGB 変換 → WCAG ratio を計算して返す
  return 0;
};

const main = (): void => {
  const pairs = getContrastPairs();

  if (pairs.length === 0) {
    console.warn(
      "[contrast:check] スケルトン状態のため検証ペアが空です。Issue #0a で実装してください。",
    );
    return;
  }

  // TODO(#0a): 各ペアを評価し、不合格があれば process.exit(1)
  for (const pair of pairs) {
    const ratio = computeContrast(pair);
    const passed = ratio >= pair.minRatio;
    const marker = passed ? "OK" : "NG";
    console.log(
      `${marker} ${pair.name}: ratio=${ratio.toFixed(2)} (require >= ${pair.minRatio})`,
    );
  }
};

main();
