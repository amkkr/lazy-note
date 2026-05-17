/**
 * milestones.json のランタイムスキーマ検証 (Issue #547)
 *
 * 背景:
 * - `datasources/milestones.json` は `as readonly Milestone[]` の型キャストのみで
 *   信頼していたため、`tone` の値域 (`"neutral" | "light" | "heavy"`) や
 *   `date` / `label` の型が JSON 編集者の手で壊れてもランタイム検出できなかった。
 * - 本モジュールは TypeScript の型キャストでは捕まらない不正値を
 *   ランタイムで検出する検証関数群を提供する。
 *
 * 設計判断 (Issue #547):
 *
 * 1. **Zod 等の外部ライブラリは採用しない**: CLAUDE.md の方針
 *    「外部ライブラリの追加は原則しない」に従い、依存追加コスト
 *    (supply chain / bundle size / lockfile drift) を回避する。
 *    Milestone のスキーマは 3 フィールド × tone enum 3 値だけで、
 *    inline 自作検証で十分にカバーできる。
 *
 * 2. **2 つの API を提供する**:
 *    - `parseMilestones(unknown): Milestone[]` (lenient)
 *      - 不正要素を **除外** して有効分のみ返す。
 *      - production runtime (3 page の JSON import 直後) で使い、
 *        異常データが混入してもアプリ全体が落ちないようにする。
 *      - 既存 `scripts/newPost.ts` の `loadMilestones` の検証挙動と互換。
 *    - `validateMilestonesStrict(unknown): readonly Milestone[]` (strict)
 *      - 1 件でも不正があれば `MilestoneValidationError` を throw する。
 *      - テスト (CI) で `datasources/milestones.json` の現状値を検査するために
 *        使う。CI が落ちることで、PR 時点で異常データの追加を検出する。
 *
 * 3. **検証タイミング**:
 *    - **テスト時 (CI)**: `validateMilestonesStrict` で本番 JSON を strict 検査。
 *      不正値を取り込んだ PR は CI 失敗で merge をブロックできる。
 *    - **production runtime**: `parseMilestones` で lenient 検査。
 *      本番では異常要素を除外して画面を生かす (Fail-soft)。
 *
 * 4. **エラーメッセージの可読性**: `MilestoneValidationError` に
 *    `issues: readonly MilestoneIssue[]` を持たせ、CI ログから
 *    どの index のどのフィールドがどう不正だったかを即座に特定できるようにする。
 *
 * Issue #546 (集約せず各 page で個別 import する) との関係:
 * - 本モジュールは **データ (`MILESTONES` 定数)** の集約点ではなく、
 *   **検証関数 (純粋関数)** の集約点である。各 page は引き続き
 *   `datasources/milestones.json` を個別 import し、本モジュールの
 *   `parseMilestones` を import して JSON を narrowing する。
 *   → 「この MILESTONES はどこから来てどう加工されたか」の追跡コストは
 *   変わらず page 1 ファイル内で完結する。
 */

import type { Milestone, MilestoneTone } from "./anchors";

/**
 * 許容される `MilestoneTone` の値域。
 *
 * `anchors.ts` の `MilestoneTone` 型と同期させる必要があるが、
 * TypeScript の型情報はランタイムに失われるため、ここで 1 箇所に集約する。
 */
const ALLOWED_TONES: readonly MilestoneTone[] = [
  "neutral",
  "light",
  "heavy",
] as const;

const isMilestoneTone = (value: unknown): value is MilestoneTone => {
  return (
    typeof value === "string" &&
    (ALLOWED_TONES as readonly string[]).includes(value)
  );
};

/**
 * `date` フィールドの形式 (`YYYY-MM-DD`)。値範囲 (月 / 日のロールオーバー) は
 * `anchors.ts` の `toMilestoneCalendarDate` の仕様に従って不問とする。
 * 本検証は「JSON 編集者が誤って `date: 12345` のような型違反を入れた」ことを
 * 検出するためのもので、暦計算の正確性は anchors 側に委譲する。
 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Milestone 1 件分の検証で見つかった不整合。
 *
 * - `index`: 元配列内の 0-origin インデックス。
 * - `field`: 問題があったフィールド名 (`"date"` / `"label"` / `"tone"` /
 *   `"shape"` / `"root"` のいずれか)。`"shape"` は「要素がオブジェクトでない」、
 *   `"root"` は「配列ではない」など要素レベルでない構造エラー。
 * - `message`: 人間可読な要約。CI ログにそのまま出して原因が分かることを目指す。
 * - `value`: 実際に入っていた値 (型エラーの追跡用)。
 */
export interface MilestoneIssue {
  readonly index: number | null;
  readonly field: "root" | "shape" | "date" | "label" | "tone";
  readonly message: string;
  readonly value: unknown;
}

/**
 * `validateMilestonesStrict` が不整合を検出したときに throw するエラー。
 *
 * `issues` には全件分の `MilestoneIssue` が入る (1 件で fail-fast せず、
 * 編集者が「複数箇所の不正を 1 回で直せる」よう全件報告する)。
 */
export class MilestoneValidationError extends Error {
  readonly issues: readonly MilestoneIssue[];

  constructor(issues: readonly MilestoneIssue[]) {
    const summary = issues
      .map((issue) => {
        const where =
          issue.index === null ? "root" : `index=${issue.index}`;
        const valueRepr = JSON.stringify(issue.value);
        return `[${where}] field=${issue.field}: ${issue.message} (value=${valueRepr})`;
      })
      .join("\n");
    super(
      `milestones.json validation failed (${issues.length} issue(s)):\n${summary}`,
    );
    this.name = "MilestoneValidationError";
    this.issues = issues;
  }
}

/**
 * 1 件分の検証。問題が見つかったら issues 配列に push し、有効ならば
 * 正規化された Milestone を返す。
 */
const validateOne = (
  item: unknown,
  index: number,
  issues: MilestoneIssue[],
): Milestone | null => {
  if (typeof item !== "object" || item === null) {
    issues.push({
      index,
      field: "shape",
      message: "要素がオブジェクトではありません",
      value: item,
    });
    return null;
  }
  const record = item as Record<string, unknown>;

  let hasError = false;

  if (typeof record.date !== "string") {
    issues.push({
      index,
      field: "date",
      message: "date が文字列ではありません",
      value: record.date,
    });
    hasError = true;
  } else if (!DATE_PATTERN.test(record.date)) {
    issues.push({
      index,
      field: "date",
      message: "date が YYYY-MM-DD 形式ではありません",
      value: record.date,
    });
    hasError = true;
  }

  if (typeof record.label !== "string") {
    issues.push({
      index,
      field: "label",
      message: "label が文字列ではありません",
      value: record.label,
    });
    hasError = true;
  } else if (record.label.length === 0) {
    issues.push({
      index,
      field: "label",
      message: "label が空文字列です",
      value: record.label,
    });
    hasError = true;
  }

  if (!isMilestoneTone(record.tone)) {
    issues.push({
      index,
      field: "tone",
      message: `tone が許容値 (${ALLOWED_TONES.join(" / ")}) 外です`,
      value: record.tone,
    });
    hasError = true;
  }

  if (hasError) {
    return null;
  }

  return {
    date: record.date as string,
    label: record.label as string,
    tone: record.tone as MilestoneTone,
  };
};

/**
 * lenient 検証: 不正要素を除外して有効分のみ返す。
 *
 * - 入力が配列でない場合は空配列を返す (fail-soft)。
 * - 個々の要素が不正な場合はその要素を除外する (CI / production の双方で
 *   アプリを止めない)。
 * - 検証で除外された情報は失われる。CI で網羅的に検出したい場合は
 *   `validateMilestonesStrict` を使う。
 *
 * @param input - JSON.parse の戻り値などの未検証データ
 * @returns 有効と判定された Milestone の配列
 */
export const parseMilestones = (input: unknown): Milestone[] => {
  if (!Array.isArray(input)) {
    return [];
  }
  const issues: MilestoneIssue[] = [];
  const result: Milestone[] = [];
  input.forEach((item, index) => {
    const validated = validateOne(item, index, issues);
    if (validated !== null) {
      result.push(validated);
    }
  });
  return result;
};

/**
 * strict 検証: 1 件でも不整合があれば `MilestoneValidationError` を throw する。
 *
 * - 入力が配列でない場合も throw する。
 * - 検出された全 issue を `MilestoneValidationError.issues` に格納する
 *   (fail-fast ではなく全件報告で、編集者の修正サイクルを 1 回にする)。
 * - テストコード / scripts ビルド前検証で使うことを想定。
 *
 * @param input - JSON.parse の戻り値などの未検証データ
 * @returns 全件検証を通過した Milestone の配列 (readonly)
 * @throws {MilestoneValidationError} 不整合がある場合
 */
export const validateMilestonesStrict = (
  input: unknown,
): readonly Milestone[] => {
  if (!Array.isArray(input)) {
    throw new MilestoneValidationError([
      {
        index: null,
        field: "root",
        message: "ルートが配列ではありません",
        value: input,
      },
    ]);
  }
  const issues: MilestoneIssue[] = [];
  const result: Milestone[] = [];
  input.forEach((item, index) => {
    const validated = validateOne(item, index, issues);
    if (validated !== null) {
      result.push(validated);
    }
  });
  if (issues.length > 0) {
    throw new MilestoneValidationError(issues);
  }
  return result;
};
