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
- ~~新メタ情報は `## メタ` セクションを追記する形 (任意) でのみ拡張~~
  - **2026-05-16 時点: 未実装 (Issue #520 / PR #557 で `src/lib/meta.ts` を削除済)**
  - 当初 `## メタ` セクションで `status` / `published_at` / `updated_at` / `tags` を任意拡張する設計が `src/lib/meta.ts` に実装されていたが、実利用されないまま死蔵していたため Issue #520 / PR #557 で削除した
  - 再導入する場合は、削除直前の実装 (`git show 6014792^:src/lib/meta.ts`) およびテスト境界値拡充の参考 (`git show 15523ad`) を起点に、本 RFC の互換性の約束 (既存記事無改変) を守る形で書き直すこと
  - 参考 SHA に関する注記 (Issue #582): Issue #558 本文の受け入れ基準では `15523ad` と `cd05b6c` の両 SHA 参照が要請されていたが、`cd05b6c` はリポジトリに存在しない誤参照である (`git rev-parse cd05b6c` → unknown revision)。実在するのは `15523ad` (テスト拡充時点) と `6014792^` (削除直前) のみであり、本 RFC および PR #594 の `splitLines` バックポート実装ではこの 2 つを参照している
- 既存 Gruvbox カラーはコードハイライト用途で温存
