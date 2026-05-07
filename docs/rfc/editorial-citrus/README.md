# Editorial Citrus デザインリニューアル

> **Notes that age well.**
> 急がない記録、急がせない言葉。

## 概要

本ドキュメント群は Lazy Note の UI/UX/デザインフルリニューアル計画「Editorial Citrus」の設計合意ドキュメントです。
ブログの語り口を「速報」ではなく「読み物」に寄せ、長く読み返せる紙の編集物のような佇まいを目指します。

3 つのキーワードでブランドを定義します。

- **Editorial** ── 雑誌編集的な余白・組版・見出しヒエラルキー
- **Calm** ── 一覧の情報密度を抑え、ノイズを徹底的に削る
- **Living** ── アクセントとしての Persimmon (柿) と Citrus (柑橘) で、季節感と温度を残す

## 唯一の単一ソース

実装ロードマップおよび設計合意は以下の **Phase1 計画 (v2)** に統一しています。

- [10-renewal-phase1-plan.md](./10-renewal-phase1-plan.md) ── Phase1 計画 (v2)

## 進捗

- Epic Issue: [#386](https://github.com/amkkr/lazy-note/issues/386)

## 経緯

1. **Phase A 調査** ── 既存記事 16 本、現行スタイル、Panda CSS トークン、ルーティング構成、テスト方針の棚卸し (旧 Gruvbox 残存実測 73 件 / 19 ファイル)
2. **Phase B-D 設計** ── v1 RFC (旧 `01`〜`09`) で Editorial Citrus の骨子を策定
3. **Devil's Advocate 第 2 ラウンド APPROVE** ── v2 計画 (`10-renewal-phase1-plan.md`) として **APPROVE WITH MINOR FIXES** 取得済み (軽微修正 4 件反映済)

v1 RFC (`01-concept-and-personas.md` 〜 `09-glossary-and-decisions.md`) は本 PR で削除し、Phase1 着手は v2 計画 (`10-renewal-phase1-plan.md`) を **唯一の単一ソース** とします。

## 互換性の約束

- 既存 16 記事 (`datasources/*.md`) は **無改変で動き続ける** こと
- 既存の `## 投稿日時` セクションは廃止しない
- 新メタ情報は `## メタ` セクションを追記する形 (任意) でのみ拡張
- 既存 Gruvbox カラーはコードハイライト用途で温存
