# public/fonts

Editorial Citrus デザインリニューアル (Issue #387 / R-1) のために
self-host する欧文フォントを配置するディレクトリです。

## 配置されているファイル

| ファイル                          | 由来                                              | 用途                                  |
| --------------------------------- | ------------------------------------------------- | ------------------------------------- |
| `Newsreader-VF-Latin.woff2`       | Google Fonts CSS API (Newsreader v26 / latin)     | 本文 / 見出し (欧文 Roman, ASCII)     |
| `Newsreader-VF-LatinExt.woff2`    | Google Fonts CSS API (Newsreader v26 / latin-ext) | 本文 / 見出し (欧文 Roman, 拡張ラテン) |
| `Newsreader-LICENSE.txt`          | https://github.com/productiontype/Newsreader      | OFL 1.1 ライセンス全文                |
| `fonts.sha256`                    | (生成物) `scripts/download-fonts.sh` が出力       | 上記ファイルの SHA-256 マニフェスト   |

すべて **SIL Open Font License 1.1** です。再配布の条件 (留保された名前を改変
しない、派生時はライセンスを同梱する等) を満たしてください。

R-1 では Italic woff2 は同梱していません (合計 KB 削減のため)。
本文 *.md で Italic 強調が必要なケースが出たら Phase2 で再導入します。

## 再取得方法

`scripts/download-fonts.sh` を実行すると、Google Fonts CSS API 経由で
`fonts.gstatic.com` の永続化された woff2 と OFL ライセンスを取得し直し、
SHA-256 マニフェスト (`fonts.sha256`) を再生成します。

```bash
./scripts/download-fonts.sh
# または
pnpm fonts:download
```

## SHA-256 検証 (サプライチェーン保護)

`scripts/download-fonts.sh --verify` で、配置済みファイルが
`fonts.sha256` のハッシュと一致するか検証します。

```bash
./scripts/download-fonts.sh --verify
# または
pnpm fonts:verify
```

CI でフォント取得経路の改ざんを検知するためのゲートとして使えます。

## 設計参照

- `docs/rfc/editorial-citrus/03-typography.md` (タイポグラフィ全体方針)
- `docs/rfc/editorial-citrus/08-roadmap.md` (R-1 で本実装)
