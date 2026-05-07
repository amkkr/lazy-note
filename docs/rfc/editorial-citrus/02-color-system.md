# 02. カラーシステム

## 設計方針

- **OKLCH を一次表現** に採用 (人間の知覚に近い明度・彩度)
- light テーマは **暖色寄り (H ≈ 85)**、dark テーマは **中性 (H = 220)** で色温度差を圧縮
- accent / link / focus を **3 軸分離** することで、CTA・誘導・キーボード可視性を独立に最適化
- status (draft / published / archived 等) は **色相を使わず** sumi 階調 + テキストラベルで表現
- 本文コントラストは **AAA 7.20:1 を運用目標** とし、`scripts/calculateContrast.ts` で実測 (1〜2% マージン)
- 既存 Gruvbox カラーは **コードハイライト用** に温存

## Primitives (OKLCH)

> 値は最終確定ではなく、Phase 0 と #0a Issue で実測の上で 1〜2% 範囲内で調整する余地を持ちます。

### Cream / Bone (背景)

| トークン        | OKLCH                       | 用途                              |
| --------------- | --------------------------- | --------------------------------- |
| `cream-50`      | `oklch(0.985 0.013 85)`     | light 既定背景                    |
| `cream-100`     | `oklch(0.965 0.018 85)`     | light カード / 沈み込み背景       |
| `bone-50`       | `oklch(0.965 0.005 220)`    | dark テーマ前景 (本文)            |
| `bone-100`      | `oklch(0.920 0.005 220)`    | dark セカンダリテキスト           |

### Ink / Sumi (前景・dark 背景)

| トークン                  | OKLCH                       | 用途                                      |
| ------------------------- | --------------------------- | ----------------------------------------- |
| `ink-primary-on-cream`    | `oklch(0.205 0.020 85)`     | light 本文 (cream-50 上で 7.20:1 を狙う)  |
| `ink-secondary-on-cream`  | `oklch(0.380 0.018 85)`     | light メタ / キャプション                 |
| `ink-900`                 | `oklch(0.150 0.020 85)`     | focus 二重リング外側                      |
| `sumi-500`                | `oklch(0.560 0 0)`          | status (中)                               |
| `sumi-600`                | `oklch(0.470 0 0)`          | status (やや強)                           |
| `sumi-700`                | `oklch(0.380 0 0)`          | status (強)                               |
| `sumi-950`                | `oklch(0.180 0.012 220)`    | **dark 既定背景** (中性、暖色光と温度差)  |

### アクセント・誘導・可視性

| トークン         | OKLCH                       | 用途                                                                                          |
| ---------------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| `persimmon-600`  | `oklch(0.580 0.180 38)`     | **アクセント** (CTA、Featured バッジ、OG 画像背景、紹介ページのブランド単色)                  |
| `indigo-500`     | `oklch(0.470 0.150 250)`    | light テーマ link                                                                             |
| `indigo-300`     | `oklch(0.760 0.110 250)`    | dark テーマ link                                                                              |
| `citrus-500`     | `oklch(0.860 0.150 105)`    | **focus 専用色**。accent ボタン上では二重リング外側 `ink-900` + 内側 `citrus-500` の構成     |

## 3 軸分離の根拠

`accent` をリンクや focus に共通利用すると、本文中で誘導 (link) とキーボード可視性 (focus) と CTA (accent) の意味が混線します。Editorial Citrus では:

- **accent (Persimmon)** — ブランド色。CTA・Featured・Hero アクセントに限定
- **link (Indigo)** — リンク誘導専用。本文中で persimmon を使わないことで、可読性を担保
- **focus (Citrus)** — キーボード可視性専用。accent の上に重ねても視認できる色を確保

## Status は色相なし

draft / published / archived など状態表現は **色相を使わない** ことを死守。

| 状態        | 表現                                                       |
| ----------- | ---------------------------------------------------------- |
| `draft`     | テキストラベル「下書き」+ `sumi-500`                       |
| `published` | バッジ非表示 (既定状態)                                    |
| `archived`  | テキストラベル「アーカイブ」+ `sumi-700` + 外枠 1px        |

色覚多様性に配慮しつつ、Editorial の落ち着きを壊さないため。

## ライト・ダークの温度設計

| テーマ | 背景 H | 前景 H | 設計意図                                                         |
| ------ | ------ | ------ | ---------------------------------------------------------------- |
| light  | 85 (暖) | 85 (暖) | 紙のような暖色クリーム上に黒墨インク。雑誌的な質感             |
| dark   | 220 (中) | 220 (中) | **暖色ダークは採用せず**。室内灯の暖色光との温度差を圧縮し、夜間の眩しさ・色滲みを抑制 |

> Devil's Advocate ラウンド 2 で「暖色ダーク (H=85) は室内光下で違和感が出る」との指摘を受け、ダークは中性に振り直しました (`09-glossary-and-decisions.md` 参照)。

## Persimmon の使用範囲

- ホーム Featured タイル (1 箇所のみ)
- CTA ボタン (主要動作 1 個まで)
- OG 画像 / 紹介ページ → **ブランド単色** で運用 (グラデーション・装飾なし)
- 本文中のリンク・focus には **使わない**

## AAA 実測ルール

1. `scripts/calculateContrast.ts` (Issue #0a で実装) が **culori** で OKLCH → sRGB 変換し、WCAG 2.x コントラスト比を計算
2. 本文ペアは **7.20:1 以上** を CI で要求 (運用目標 7.00:1 + 1〜2% マージン)
3. UI 大文字 (18pt+) ペアは **4.50:1 以上**
4. 値が 1.05 倍以内に近いペアは「マージン僅少」として PR コメントで警告
5. **Lighthouse の値を信用せず** culori 実測のみを根拠とする

具体的な実装スケッチは `07-accessibility-and-performance.md` および `scripts/calculateContrast.ts` のスケルトンを参照。

## トークン命名規約

```
{semantic}-{role}[-on-{surface}]
```

- `semantic` = `cream` / `ink` / `sumi` / `bone` / `persimmon` / `indigo` / `citrus`
- `role` = `50`〜`950` (明度刻み) または `primary` / `secondary`
- `-on-{surface}` = ペアコントラスト確定済みであることを示す (例: `ink-primary-on-cream`)

## Panda CSS 統合 (概要)

`panda.config.ts` の `theme.tokens.colors` に上記 primitives を登録、`semanticTokens.colors` で light/dark の値マッピングを行います (Issue #0a)。

```ts
// イメージ (実装は #0a で確定)
const colors = {
  cream: { 50: { value: "oklch(0.985 0.013 85)" } /* ... */ },
  ink: { primary: { onCream: { value: "oklch(0.205 0.020 85)" } } },
  // ...
};
const semanticColors = {
  bg: { value: { base: "{colors.cream.50}", _dark: "{colors.sumi.950}" } },
  fg: { value: { base: "{colors.ink.primary.onCream}", _dark: "{colors.bone.50}" } },
  link: { value: { base: "{colors.indigo.500}", _dark: "{colors.indigo.300}" } },
};
```

## 既存 Gruvbox の取り扱い

コードブロックハイライト (Shiki / Prism 等) は引き続き Gruvbox 系を温存。
本文・UI と **テーマレイヤを分離** することで、コードの慣れた配色を壊しません。
