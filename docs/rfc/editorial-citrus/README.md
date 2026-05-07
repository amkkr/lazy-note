# RFC: Editorial Citrus デザインリニューアル

> **Notes that age well.**
> 急がない記録、急がせない言葉。

## 概要

本 RFC は Lazy Note の UI/UX フルリニューアル計画「Editorial Citrus」の設計合意ドキュメント群です。
ブログの語り口を「速報」ではなく「読み物」に寄せ、長く読み返せる紙の編集物のような佇まいを目指します。

3 つのキーワードでブランドを定義します。

- **Editorial** ── 雑誌編集的な余白・組版・見出しヒエラルキー
- **Calm** ── 一覧の情報密度を抑え、ノイズを徹底的に削る
- **Living** ── アクセントとしての Persimmon (柿) と Citrus (柑橘) で、季節感と温度を残す

## 設計の合意プロセス

本 RFC は以下のプロセスで収束しました。

1. **調査** ── 既存記事 16 本、現行スタイル、Panda CSS トークン、ルーティング構成、テスト方針の棚卸し
2. **設計案 v1** ── 暖色寄りの Editorial スタイルを骨子化
3. **Devil's Advocate 第 1 ラウンド** ── 過剰演出 / VT 採用 / AAA 想定甘さ等を指摘 → 設計案 v2 へ
4. **Devil's Advocate 第 2 ラウンド** ── 暖色ダーク・ドロップキャップ読み上げ重複・focus ring trail 等の積み残しを指摘 → 設計案 v2.5 へ
5. **Devil's Advocate 第 3 ラウンド** ── **APPROVE 取得**

第 3 ラウンドでの合意ポイント、妥協していい妥協 (3 件) と死守ポイント (4 件) は `09-glossary-and-decisions.md` に記録しています。

## ドキュメント一覧

| #   | ファイル                                                       | 内容                                                                               |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 01  | [01-concept-and-personas.md](./01-concept-and-personas.md)     | コンセプト、ブランドポジション、4 種の読書シーン、ペルソナ                         |
| 02  | [02-color-system.md](./02-color-system.md)                     | OKLCH カラーシステム、AAA 7:1 実測ルール、accent / link / focus 3 軸分離           |
| 03  | [03-typography.md](./03-typography.md)                         | Newsreader VF + JetBrains Mono VF self-host、Phase 0 検証フロー、textStyles        |
| 04  | [04-layout.md](./04-layout.md)                                 | Editorial Bento ホーム、36rem 本文、Sticky TOC、404 / Empty / Loading              |
| 05  | [05-motion-and-delight.md](./05-motion-and-delight.md)         | モーション 5 種、ドロップキャップ、grainy gradient、reduced-motion / transparency  |
| 06  | [06-data-model.md](./06-data-model.md)                         | `## 投稿日時` 維持 + `## メタ` セクション追記方式、C1〜C8 ルール、T1〜T12 テスト   |
| 07  | [07-accessibility-and-performance.md](./07-accessibility-and-performance.md) | a11y / Performance ハードゲート (G1〜G5)、モニタリング (M1〜M3)、CI 設計           |
| 08  | [08-roadmap.md](./08-roadmap.md)                               | MVP 9 Issue + 拡張 10 Issue、依存関係グラフ、Feature flag 規約                     |
| 09  | [09-glossary-and-decisions.md](./09-glossary-and-decisions.md) | 用語集、採用しなかった案、妥協 3 件 / 死守 4 件、APPROVE 記録                      |

## MVP 9 Issue + 拡張 10 Issue 一覧

### MVP (リニューアルとして必須)

| ID    | タイトル                                                  | 依存            |
| ----- | --------------------------------------------------------- | --------------- |
| #0a   | OKLCH カラートークン整備 + AAA 実測スクリプト             | -               |
| #0b   | フォント Phase 0 検証 (Newsreader 採用判定)               | -               |
| #0c   | `## メタ` パーサ + 既存 16 記事互換テスト                 | -               |
| #1    | Typography textStyles + ドロップキャップ                  | #0b             |
| #2    | Editorial Bento ホーム                                    | #0a, #0c, #1    |
| #3    | 記事詳細 36rem + Sticky TOC                               | #0a, #1         |
| #4a   | a11y ハードゲート (axe / contrast 実測 / VR baseline)     | #0a             |
| #4b   | Performance ハードゲート (INP / CLS / Lighthouse)         | #0b, #1         |
| #4c   | grainy gradient + reduced-motion / transparency 対応      | #0a, #1         |

### 拡張 (Ext-1〜6 必須に近い、Ext-7〜10 nice-to-have)

| ID     | タイトル                                          | 区分             |
| ------ | ------------------------------------------------- | ---------------- |
| Ext-1  | OG 画像 (Persimmon 単色)                          | 必須に近い       |
| Ext-2  | RSS / sitemap                                     | 必須に近い       |
| Ext-3  | クライアント検索                                  | 必須に近い       |
| Ext-4  | タグページ・アーカイブ                            | 必須に近い       |
| Ext-5  | ダークモード切替 UI                               | 必須に近い       |
| Ext-6  | フォント license check cron (半年)                | 必須に近い       |
| Ext-7  | View Transitions                                  | nice-to-have     |
| Ext-8  | 検索ハイライト                                    | nice-to-have     |
| Ext-9  | Lighthouse perf SLO 自動 Issue                    | nice-to-have     |
| Ext-10 | Noto Serif JP subset (Plan B 発動時のみ)          | nice-to-have     |

詳細な AC・依存・推定難易度は `08-roadmap.md` を参照。

## 互換性の約束

- 既存 16 記事 (`datasources/*.md`) は **無改変で動き続ける** こと
- 既存の `## 投稿日時` セクションは廃止しない
- 新メタ情報は `## メタ` セクションを追記する形 (任意) でのみ拡張
- 既存 Gruvbox カラーはコードハイライト用途で温存

## 「死守ポイント」サマリ

- AAA 7:1 は culori 実測で担保 (Lighthouse の値に依存しない)
- 既存 16 記事の互換性
- axe-core violations = 0 をハードゲート
- Newsreader 採用前に実機サンプル必須 (Phase 0 で 20/25 点未満なら Plan A/B へ退避)

詳細は `09-glossary-and-decisions.md`。
