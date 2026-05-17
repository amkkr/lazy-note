/**
 * milestones.json のランタイムスキーマ検証テスト (Issue #547)
 *
 * 構成:
 * - `parseMilestones` (lenient): 不正要素を除外
 * - `validateMilestonesStrict` (strict): 1 件でも不正で throw
 * - 実データ検証: `datasources/milestones.json` を strict 検査
 *
 * 検証タイミングの考え方 (詳細は `milestonesSchema.ts` 冒頭の JSDoc 参照):
 * - 本テストは CI で `pnpm test:run` 実行時に走る。
 * - 「本番 JSON が strict を通る」テストにより、不正値を入れた PR を
 *   merge 前に検出できる (PR 時点で Required check を落とす)。
 */

import { join } from "node:path";
import { describe, expect, it } from "vitest";
import milestonesJson from "../../../datasources/milestones.json";
import {
  MilestoneValidationError,
  parseMilestones,
  validateMilestonesStrict,
} from "../milestonesSchema";

// =============================================================================
// parseMilestones (lenient)
// =============================================================================

describe("parseMilestones (lenient)", () => {
  it("正常な節目 1 件をそのまま返せる", () => {
    const input = [{ date: "2025-01-01", label: "復帰", tone: "light" }];
    expect(parseMilestones(input)).toEqual(input);
  });

  it("複数の正常な節目をすべて返せる", () => {
    const input = [
      { date: "2025-01-01", label: "復帰", tone: "neutral" },
      { date: "2025-02-02", label: "節目イベント", tone: "light" },
      { date: "2025-03-03", label: "喪失体験", tone: "heavy" },
    ];
    expect(parseMilestones(input)).toEqual(input);
  });

  it("空配列を渡すと空配列を返せる", () => {
    expect(parseMilestones([])).toEqual([]);
  });

  it("配列でないルートは空配列にフォールバックできる", () => {
    expect(parseMilestones({ foo: "bar" })).toEqual([]);
    expect(parseMilestones(null)).toEqual([]);
    expect(parseMilestones(undefined)).toEqual([]);
    expect(parseMilestones("not array")).toEqual([]);
    expect(parseMilestones(42)).toEqual([]);
  });

  it("オブジェクトでない要素を除外できる", () => {
    const input = [
      "string",
      42,
      null,
      { date: "2025-01-01", label: "有効", tone: "neutral" },
    ];
    const result = parseMilestones(input);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("有効");
  });

  it("date が文字列でない要素を除外できる", () => {
    const input = [
      { date: 12345, label: "bad", tone: "neutral" },
      { date: "2025-01-01", label: "good", tone: "neutral" },
    ];
    const result = parseMilestones(input);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("good");
  });

  it("date が YYYY-MM-DD 形式でない要素を除外できる", () => {
    const input = [
      { date: "2025/01/01", label: "slash-separator", tone: "neutral" },
      { date: "2025-1-1", label: "no-zero-pad", tone: "neutral" },
      { date: "20250101", label: "no-separator", tone: "neutral" },
      { date: "2025-01-01", label: "valid", tone: "neutral" },
    ];
    const result = parseMilestones(input);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("valid");
  });

  it("label が文字列でない要素を除外できる", () => {
    const input = [
      { date: "2025-01-01", label: 12345, tone: "neutral" },
      { date: "2025-01-02", label: "valid", tone: "neutral" },
    ];
    const result = parseMilestones(input);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("valid");
  });

  it("label が空文字列の要素を除外できる", () => {
    const input = [
      { date: "2025-01-01", label: "", tone: "neutral" },
      { date: "2025-01-02", label: "valid", tone: "neutral" },
    ];
    const result = parseMilestones(input);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("valid");
  });

  it("tone が許容値外の要素を除外できる", () => {
    const input = [
      { date: "2025-01-01", label: "happy-tone", tone: "happy" },
      { date: "2025-01-02", label: "xss-attempt", tone: "<script>" },
      { date: "2025-01-03", label: "valid-neutral", tone: "neutral" },
      { date: "2025-01-04", label: "valid-light", tone: "light" },
      { date: "2025-01-05", label: "valid-heavy", tone: "heavy" },
    ];
    const result = parseMilestones(input);
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.label)).toEqual([
      "valid-neutral",
      "valid-light",
      "valid-heavy",
    ]);
  });

  it("入力配列の順序を保持できる", () => {
    const input = [
      { date: "2025-03-03", label: "c", tone: "neutral" },
      { date: "2025-01-01", label: "a", tone: "neutral" },
      { date: "2025-02-02", label: "b", tone: "neutral" },
    ];
    const result = parseMilestones(input);
    expect(result.map((m) => m.label)).toEqual(["c", "a", "b"]);
  });

  it("検証通過要素は元オブジェクトの追加プロパティを落とせる", () => {
    // 余計なフィールドを持ち込まれても Milestone 型に縮約する
    const input = [
      {
        date: "2025-01-01",
        label: "extra",
        tone: "neutral",
        unknown: "should-be-dropped",
      },
    ];
    const result = parseMilestones(input);
    expect(result[0]).toEqual({
      date: "2025-01-01",
      label: "extra",
      tone: "neutral",
    });
    expect("unknown" in result[0]).toBe(false);
  });
});

// =============================================================================
// validateMilestonesStrict (strict)
// =============================================================================

describe("validateMilestonesStrict (strict)", () => {
  it("正常な節目をそのまま返せる", () => {
    const input = [
      { date: "2025-01-01", label: "復帰", tone: "neutral" },
      { date: "2025-02-02", label: "節目", tone: "light" },
    ];
    expect(validateMilestonesStrict(input)).toEqual(input);
  });

  it("空配列を渡すと空配列を返せる (空は不正ではない)", () => {
    expect(validateMilestonesStrict([])).toEqual([]);
  });

  it("ルートが配列でないと MilestoneValidationError を throw できる", () => {
    expect(() => validateMilestonesStrict({})).toThrow(
      MilestoneValidationError,
    );
    expect(() => validateMilestonesStrict(null)).toThrow(
      MilestoneValidationError,
    );
  });

  it("不正な tone を含むと MilestoneValidationError を throw できる", () => {
    const input = [
      { date: "2025-01-01", label: "bad", tone: "happy" },
    ];
    expect(() => validateMilestonesStrict(input)).toThrow(
      MilestoneValidationError,
    );
  });

  it("複数の不正要素を 1 回の throw でまとめて報告できる (fail-fast しない)", () => {
    const input = [
      { date: 12345, label: "bad-date", tone: "neutral" },
      { date: "2025-01-01", label: "bad-tone", tone: "happy" },
      { date: "invalid", label: "", tone: "happy" }, // 3 件分の issue を生む
    ];
    let caught: MilestoneValidationError | null = null;
    try {
      validateMilestonesStrict(input);
    } catch (e) {
      if (e instanceof MilestoneValidationError) {
        caught = e;
      }
    }
    expect(caught).not.toBeNull();
    // 1 件目: date 型違反 (1)
    // 2 件目: tone 値域違反 (1)
    // 3 件目: date 形式違反 + label 空 + tone 値域違反 (3)
    // 合計 5 件
    expect(caught?.issues).toHaveLength(5);
  });

  it("エラーメッセージに index とフィールド名が含まれている", () => {
    const input = [
      { date: "2025-01-01", label: "good", tone: "neutral" },
      { date: "2025-01-02", label: "bad", tone: "happy" },
    ];
    let caught: MilestoneValidationError | null = null;
    try {
      validateMilestonesStrict(input);
    } catch (e) {
      if (e instanceof MilestoneValidationError) {
        caught = e;
      }
    }
    expect(caught).not.toBeNull();
    expect(caught?.message).toContain("index=1");
    expect(caught?.message).toContain("field=tone");
    expect(caught?.issues[0].index).toBe(1);
    expect(caught?.issues[0].field).toBe("tone");
  });

  it("MilestoneValidationError は name に固有値を持つ", () => {
    try {
      validateMilestonesStrict("not array");
    } catch (e) {
      expect((e as Error).name).toBe("MilestoneValidationError");
    }
  });
});

// =============================================================================
// 実データ検証: datasources/milestones.json
// =============================================================================
//
// Issue #547 AC: PR で `tone: "happy"` のような不正値を入れた場合に CI で
// 検出できることを担保する。本テスト群が CI で fail することにより、
// `datasources/milestones.json` への不正値追加 PR を merge 前にブロックする。

describe("datasources/milestones.json の実データ検証 (Issue #547 AC)", () => {
  // ファイルの存在確認 (path 計算の sanity check)
  const datasourcesPath = join(
    __dirname,
    "..",
    "..",
    "..",
    "datasources",
    "milestones.json",
  );

  it(`本番 milestones.json が ${datasourcesPath} に存在する`, () => {
    expect(typeof milestonesJson).not.toBe("undefined");
    expect(Array.isArray(milestonesJson)).toBe(true);
  });

  it("本番 milestones.json は validateMilestonesStrict を pass できる", () => {
    expect(() => validateMilestonesStrict(milestonesJson)).not.toThrow();
  });

  it("本番 milestones.json は 1 件以上の節目を持つ", () => {
    const result = validateMilestonesStrict(milestonesJson);
    expect(result.length).toBeGreaterThan(0);
  });

  it("本番 milestones.json の全要素が許容 tone のいずれかである", () => {
    const result = validateMilestonesStrict(milestonesJson);
    const allowedTones = ["neutral", "light", "heavy"];
    for (const milestone of result) {
      expect(allowedTones).toContain(milestone.tone);
    }
  });
});
