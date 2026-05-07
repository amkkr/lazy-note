# public/fonts

Editorial Citrus デザインリニューアルのために self-host する欧文フォント
(Newsreader VF / JetBrains Mono VF) を配置するディレクトリです。

## 配置されているファイル

| ファイル                       | 由来                                          | 用途                          |
| ------------------------------ | --------------------------------------------- | ----------------------------- |
| `Newsreader-VF.woff2`          | `@fontsource-variable/newsreader` (latin-ext) | 本文 / 見出し (欧文 Roman)    |
| `Newsreader-Italic-VF.woff2`   | `@fontsource-variable/newsreader` (latin-ext) | 本文 / 見出し (欧文 Italic)   |
| `JetBrainsMono-VF.woff2`       | `@fontsource-variable/jetbrains-mono` (latin-ext) | 等幅 (コードブロック)     |
| `Newsreader-LICENSE.txt`       | https://github.com/productiontype/Newsreader  | OFL 1.1 ライセンス全文        |
| `JetBrainsMono-LICENSE.txt`    | https://github.com/JetBrains/JetBrainsMono    | OFL 1.1 ライセンス全文        |

すべて **SIL Open Font License 1.1** です。再配布の条件 (留保された名前を改変しない、
派生時はライセンスを同梱する等) を満たしてください。

## 再取得方法

`scripts/download-fonts.sh` を実行すると、jsDelivr 経由で latin-ext subset 済みの
woff2 と OFL ライセンスを取得し直せます。

```bash
./scripts/download-fonts.sh
```

## 設計参照

- `docs/rfc/editorial-citrus/03-typography.md`
- `docs/rfc/editorial-citrus/08-roadmap.md` (#0b)
- `docs/typography-decision.md` (Phase 0 採点記録)

## Phase 0 と本実装の分離

本ディレクトリの woff2 は **Phase 0 採点用に準備された素材** です。`@font-face`
宣言や Panda CSS の `textStyles` への組み込みは、Phase 0 採点 (5 軸 25 点満点で
20 点以上) を経て採用案が確定したあとに、別 Issue (Issue #2-β 相当) で実装します。
