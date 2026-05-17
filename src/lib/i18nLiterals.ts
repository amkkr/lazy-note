/**
 * 横串で参照される表示文言の共通定数を集約するモジュール (Issue #629)。
 *
 * 設計方針:
 * - **i18n フレームワークは導入しない** (既存方針 / CLAUDE.md「外部ライブラリ
 *   追加の閾値が高い」を踏襲)。あくまで「複数コンポーネントから参照される
 *   素朴な文字列定数」を 1 箇所に集約するだけのモジュール。
 * - **横串で散らばっている文言のみここに置く**。単一ファイル内で完結する文言は
 *   そのファイル内に閉じた定数 (例: `Resurface.tsx` の
 *   `RESURFACE_SECTION_HEADING`) として残し、過度な抽象化を避ける
 *   (CLAUDE.md「過度に抽象化しない」方針)。
 * - **将来 i18n 化する際の grep 起点**として機能させる。export 名は
 *   `<DOMAIN>_<KEY>` 形式の SCREAMING_SNAKE で揃え、grep で網羅性を
 *   確認しやすくする。
 *
 * 採用判断 (Issue #629 / PR #627 follow-up):
 * - PR #627 (Issue #534) で Resurface / AnchorPage の文言テンプレートを
 *   ファイル内定数として外出ししたが、`"無題の記事"` は 6 箇所
 *   (定数化 2 / ハードコード 4) で重複していた。i18n 化作業者の grep 漏れ
 *   リスクが最も高い文言なので横串集約する。
 * - 「ファイル内局所定数」と「横串共通定数」の使い分け基準:
 *   - **横串共通**: 同一文言が **複数ファイル** で参照される (本モジュール)
 *   - **ファイル内局所**: 単一ファイルで完結する (各コンポーネント内)
 */

/**
 * タイトル未設定の記事を一覧 / 詳細表示する際のフォールバック文言。
 *
 * 参照元 (6 箇所):
 * - `src/components/atoms/IndexRow.tsx`
 * - `src/components/atoms/BentoCard.tsx`
 * - `src/components/atoms/FeaturedCard.tsx`
 * - `src/components/pages/PostDetailPage.tsx`
 * - `src/components/common/Resurface.tsx`
 * - `src/components/pages/AnchorPage.tsx`
 *
 * テストファイルからは **import しない** (期待値リテラルを共有すると
 * 同義反復になり、文言変更時の regression を検知できなくなるため)。
 */
export const UNTITLED_POST = "無題の記事" as const;
