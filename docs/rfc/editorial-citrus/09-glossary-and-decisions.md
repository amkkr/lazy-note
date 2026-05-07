# 09. 用語集と意思決定の記録

## 用語集

| 用語                  | 定義                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Editorial Citrus**  | 本リニューアルプロジェクトのコードネーム。"Editorial" + "Citrus" (柑橘 = focus 色)                                    |
| **Persimmon**         | 柿色のアクセント。`persimmon-600 = oklch(0.520 0.180 38)` (#358 で実測調整)。CTA / Featured / OG 画像に限定           |
| **Indigo**            | 藍色のリンク色。light は `indigo-500`、dark は `indigo-300`                                                            |
| **Citrus**            | 柑橘色の focus 専用色。`citrus-500 = oklch(0.860 0.150 105)`                                                          |
| **Cream**             | 紙のような暖色背景 (light)。`cream-50 / cream-100`                                                                    |
| **Ink**               | 墨インクのような前景 (light)。`ink-primary-on-cream / ink-secondary-on-cream / ink-900`                               |
| **Sumi**              | 墨色の中性階調。dark 背景 (`sumi-950`) と status ラベル (`sumi-500/600/700`) に使用                                   |
| **Bone**              | 骨色の前景 (dark)。`bone-50 / bone-100`                                                                               |
| **Editorial Bento**   | ホームのレイアウトパターン。Featured (span6) + Bento 2x2 + Index の組み合わせ                                          |
| **Hero**              | 記事詳細最上部のタイトル領域 (本リニューアルでは大型化せず、組版重視)                                                  |
| **TOC**               | Table of Contents。記事詳細の目次。desktop で sticky、< 1024px で Disclosure                                          |
| **`## メタ` セクション** | Markdown 記事に追記する任意のメタ情報セクション (`status` / `published_at` / `tags` 等)                          |
| **feature flag editorial** | `vite.config.ts` の `define` で gate される flag。dev / preview のみ on、本番常時 off                            |
| **Phase 0**           | フォント採用判定のための実機サンプル検証 (27 枚撮影、5 軸採点)                                                         |
| **Plan A**            | Phase 0 採点 15〜19 点時の退避策。本文を Hiragino Mincho ProN に                                                      |
| **Plan B**            | Phase 0 採点 14 点以下時の退避策。Noto Serif JP subset を導入 (Ext-10 発動)                                           |
| **MVP 9 Issue**       | リニューアル必須の 9 件 (#0a/#0b/#0c, #1, #2, #3, #4a/#4b/#4c)                                                        |
| **拡張 10 Issue**     | Ext-1〜6 (必須に近い) + Ext-7〜10 (nice-to-have)                                                                      |
| **ハードゲート**      | G1〜G5。CI で merge を block する閾値                                                                                  |
| **モニタリング**      | M1〜M3。観測のみで block しない指標                                                                                    |
| **moment of delight** | 瞬間的な喜び。Editorial Citrus ではドロップキャップとロゴ "z" の hover ゆらりに限定                                    |
| **grainy gradient**   | モノクロ noise PNG 1 枚を mix-blend-mode で重ねた紙の質感演出                                                          |
| **Drop cap (ドロップキャップ)** | 記事本文の最初の段落の先頭 1 文字を大きく組む装飾。ASCII 先頭時のみ適用、aria-hidden + 隠し span で SR 重複回避  |

## 採用しなかった案と却下理由

### 1. **Slow Web** (コンセプト)

- 概要: 「速くないこと」を全面に出すブランディング
- 却下: ネガティブ表現になりがち。"Notes that age well." の方がポジティブで意図を伝えやすい

### 2. **Fraunces (フォント)**

- 概要: variable な装飾的 serif
- 却下: 装飾性が強く、読み物としての可読性で Newsreader に劣る (DA 第 1 ラウンドで指摘)

### 3. **🍃 等の季節アイコン**

- 概要: 季節ごとに本文・ホームに小さなアイコンを配置
- 却下: Editorial の落ち着きを壊す。Whimsy の濫用と判断 (DA 第 1 ラウンド)

### 4. **暖色ダーク (H = 85 のまま dark を作る)**

- 概要: light と同じ色相軸でダークも作る案
- 却下: 室内灯 (暖色光) 下で違和感、青い液晶光と温度差が出にくい。**dark は中性 H = 220 で代替** (DA 第 2 ラウンド)

### 5. **MVP に View Transitions**

- 概要: ページ遷移に React 19 + VT API を使う
- 却下: SPA でのブラウザ差異が大きく、組版重視の方針と合わない。**Ext-7 に退避** (DA 第 2 ラウンド)

### 6. **focus ring trail (発光残像)**

- 概要: focus 移動時に残光が尾を引く演出
- 却下: キーボード操作の可視性を損ねる。**static 0ms に変更** (DA 第 2 ラウンド)

### 7. **ホーム背景の sweeping gradient**

- 概要: スクロールに連動した大型グラデーション
- 却下: バッテリ消費 + Calm の精神に反する。**grain 1 枚で代替** (DA 第 2 ラウンド)

### 8. **status バッジに色相を持たせる**

- 概要: draft = 黄、archived = 灰など色相で表現
- 却下: 色覚多様性配慮 + Editorial の落ち着き。**色相なし sumi 階調 + テキストラベル** に統一

### 9. **フロントマター (YAML) への破壊的移行**

- 概要: 既存 16 記事をすべて YAML フロントマター化
- 却下: ペルソナ C (運営者本人) の互換性死守ポイントに反する。**`## メタ` 追記式** で代替

### 10. **本文 60ch (≈ 30rem) や 80ch (≈ 40rem)**

- 概要: より狭い / より広い本文幅
- 却下: 雑誌組版の経験則と Newsreader の x-height から **36rem (≒ 36〜40 全角)** が最適と判断

### 11. **アクセント色を本文リンクにも使う**

- 概要: Persimmon-600 をリンク色として共用
- 却下: アクセントとリンク誘導とキーボード可視性が混線する。**3 軸分離** に変更

### 12. **全モーション 0ms (= モーション全廃)**

- 概要: prefers-reduced-motion 既定で扱う案
- 却下: ロゴ hover ゆらりとドロップキャップが残ることで **moment of delight** が成立する。reduced-motion のみで停止

## 妥協していい妥協 (3 件)

設計の収束のため、以下 3 点は意図的に「最善ではないが妥協する」と合意。

### 妥協 1: 組版採点の 20/25 点ボーダー決め打ち

- 5 軸採点に客観性は限定される
- それでも採点シートを残すことで、後続 Issue 担当者が判断材料を引き継げる
- 真の最善 (= ユーザテストで決定) は時間予算的に不可

### 妥協 2: VT を MVP から落とす

- ページ遷移演出は確実に「あれば嬉しい」要素
- しかしブラウザ差異が大きく、MVP ハードゲート (CLS / VR diff) との整合がとりにくい
- Ext-7 に退避し、master 安定後に追加検証

### 妥協 3: 暖色ダークを採用しない

- 「ブランド一貫性のためダークも H=85」は理屈として綺麗
- しかし室内光 (暖色) との色温度差で実用感が落ちる
- 中性 H=220 に切り替え、dark は別軸で最適化

## 死守ポイント (4 件)

これは絶対に妥協しない、4 件。

### 死守 1: AAA 7:1 を culori 実測で担保

- Lighthouse のコントラスト計算に頼らない
- `scripts/calculateContrast.ts` で OKLCH → sRGB 変換、WCAG コントラスト比を直接計算
- 本文 7.20:1 (運用目標 + 1〜2% マージン)、未満は CI exit 1

### 死守 2: 既存 16 記事の互換性

- `## 投稿日時` フォーマット温存
- `## メタ` セクションは追記式 (任意)
- 既存記事を **書き換えずに** リニューアル後も動く
- T1 テストで担保

### 死守 3: axe-core violations = 0 をハードゲート

- a11y 違反 0 を merge 条件に
- 警告ではなく block
- WCAG 2.2 AA + AAA タグで axe を回す

### 死守 4: Newsreader 採用前に実機サンプル必須

- 27 枚撮影 + 5 軸採点 + 20/25 点ボーダー
- これをスキップして採用しない
- 19 点以下なら Plan A / Plan B に **必ず退避**

## Devil's Advocate レビュー記録

### ラウンド 1 (設計案 v1 → v2)

主な指摘:

- 過剰なモーション演出 (sweeping gradient、季節アイコン)
- フォント Fraunces は装飾的すぎる
- AAA 想定の甘さ (Lighthouse 値依存)
- ペルソナ未定義

対応: モーション削減、Newsreader に変更、culori 実測ルール導入、4 ペルソナ定義

### ラウンド 2 (設計案 v2 → v2.5)

主な指摘:

- 暖色ダークは室内光下で違和感
- ドロップキャップが SR で重複読み上げ
- focus ring trail がキーボード可視性を損ねる
- VT を MVP に入れるとブラウザ差異で揺れる

対応: dark を中性 H=220 に、aria-hidden + 隠し span 戦略、focus ring static 化、VT は Ext-7 へ

### ラウンド 3 (設計案 v2.5)

判定: **APPROVE**

- 妥協 3 件 / 死守 4 件の整理に合意
- MVP 9 Issue + 拡張 10 Issue の粒度に合意
- 本 RFC ドキュメント群を実装の単一ソース of truth とすることに合意

## 今後 RFC を更新すべき条件

- Phase 0 採点で Plan A / Plan B が発動した場合 → `03-typography.md` を更新
- AAA 実測で本文ペアが 7.20 を割る場合 → `02-color-system.md` の OKLCH 値を更新
- VR baseline が master 変動で大きく変わった場合 → `08-roadmap.md` の baseline 撮影タイミングを記録
- 新たな DA レビューラウンドで合意点が変わった場合 → 本ファイルに追記
