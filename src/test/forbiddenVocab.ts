/**
 * Anchor 系コンポーネントの Tripwire テスト用の Pulse 思想禁則語彙集。
 *
 * 「Pulse (頻度可視化)」を切った思想を厳守するため、UI 上で投稿頻度・投稿間隔・
 * 執筆量・更新頻度のような "抽象指標" を表示してはならない。本定数は
 * Coordinate / Resurface / AnchorPage / HomePage の Tripwire テストから共通参照し、
 * 「3 語のみで防御 → 類義語素通り」というガード網漏れを構造的に解消する。
 *
 * 出典: Issue #540 (Issue #493 PR の DA レビュー指摘の積み残し)
 *
 * 追加・削除の方針:
 * - 「Pulse 思想に反する語彙」を本ファイルに集約する
 * - 個別テスト側で独自に「投稿ペースに関する文言を含まない」のような同種の
 *   regex を書き起こしたくなったら、本定数への追記を優先する
 * - 既存記事 (datasources/*.md) の本文ヒットを避けたいケースは Tripwire ではなく
 *   個別テスト側で個別 query を書くこと (本定数は **UI ラベル / 抽象指標** に限定)
 */

/**
 * Pulse 思想で禁止する語彙の正規化済みリスト。
 *
 * - 「投稿頻度 / 平均間隔 / 投稿ペース」: Issue #493 PR DA レビューで指摘済み既存3語
 * - 「執筆ペース / 投稿リズム / 更新頻度 / 投稿量 / 執筆量」: Issue #540 で追加する類義語
 *
 * 数値表現 (「N 日ぶり」「N 日経過」等) は語彙ではなく数値パターンであり、
 * `Resurface.test.tsx` 側で個別の regex (`/日ぶり/` 等) で防御している。本定数の
 * 対象は **完全一致語彙** のみとする。
 */
export const PULSE_FORBIDDEN_VOCAB = [
  "投稿頻度",
  "平均間隔",
  "投稿ペース",
  "執筆ペース",
  "投稿リズム",
  "更新頻度",
  "投稿量",
  "執筆量",
] as const;

export type PulseForbiddenTerm = (typeof PULSE_FORBIDDEN_VOCAB)[number];

/**
 * `PULSE_FORBIDDEN_VOCAB` を `|` で連結した RegExp を生成する。
 *
 * `expect(text).not.toMatch(buildPulseForbiddenVocabRegex())` の形で
 * Tripwire テストから利用する。RegExp はテストごとに新規生成して
 * `lastIndex` 等の状態汚染を避ける。
 */
export const buildPulseForbiddenVocabRegex = (): RegExp =>
  new RegExp(PULSE_FORBIDDEN_VOCAB.join("|"));
