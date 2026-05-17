/**
 * scripts/calculateContrast.ts のヘルパー単体テスト (Issue #623 / S-2 対応)
 *
 * 検証対象:
 *   - buildCsvRow: valid OKLCH ペアで CSV 行を組み立て、invalid 入力で undefined を返す
 *   - emitGithubActionsWarnings: 環境変数 GITHUB_ACTIONS の状態で出力分岐する
 *
 * 方針:
 *   - 振る舞い単位で 1 ケースずつ書く (TDD)
 *   - 環境変数判定は dead code 化を防ぐため true / false 両ケース検証
 *   - console.log は vi.spyOn で捕獲する
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCsvRow,
  type ContrastPair,
  type ContrastResult,
  emitGithubActionsWarnings,
  type NamedColor,
} from "../calculateContrast.ts";

// =============================================================================
// buildCsvRow
// =============================================================================

describe("buildCsvRow", () => {
  it("valid OKLCH ペアで CSV 行を組み立てられる", () => {
    const surface: NamedColor = {
      label: "cream-50",
      value: "oklch(98% 0.02 90)",
      role: "surface",
    };
    const fg: NamedColor = {
      label: "ink-900",
      value: "oklch(20% 0.02 90)",
      role: "fg",
    };

    const row = buildCsvRow(surface, fg);

    expect(row).toBeDefined();
    // CSV カラム順は CSV_HEADER と同期している:
    //   surface,fg,surface_oklch,fg_oklch,ratio,verdict,aaa,aa
    const columns = (row as string).split(",");
    expect(columns).toHaveLength(8);
    expect(columns[0]).toBe("cream-50");
    expect(columns[1]).toBe("ink-900");
    expect(columns[2]).toBe('"oklch(98% 0.02 90)"');
    expect(columns[3]).toBe('"oklch(20% 0.02 90)"');
    // ratio は数値文字列 (小数 2 桁)。実際の値ではなく形式のみ検証する
    // (culori の wcagContrast 戻り値の精度に振り回されないため)。
    expect(columns[4]).toMatch(/^\d+\.\d{2}$/);
    // verdict は AAA / AA / AA-large / FAIL のいずれか
    expect(["AAA", "AA", "AA-large", "FAIL"]).toContain(columns[5]);
    expect(["yes", "no"]).toContain(columns[6]);
    expect(["yes", "no"]).toContain(columns[7]);
  });

  it("parse 不能な fg 文字列で undefined を返す", () => {
    const surface: NamedColor = {
      label: "cream-50",
      value: "oklch(98% 0.02 90)",
      role: "surface",
    };
    const fg: NamedColor = {
      label: "invalid",
      value: "not-a-color",
      role: "fg",
    };

    const row = buildCsvRow(surface, fg);

    expect(row).toBeUndefined();
  });

  it("parse 不能な surface 文字列で undefined を返す", () => {
    const surface: NamedColor = {
      label: "invalid",
      value: "totally-invalid-color-string",
      role: "surface",
    };
    const fg: NamedColor = {
      label: "ink-900",
      value: "oklch(20% 0.02 90)",
      role: "fg",
    };

    const row = buildCsvRow(surface, fg);

    expect(row).toBeUndefined();
  });
});

// =============================================================================
// emitGithubActionsWarnings
// =============================================================================

describe("emitGithubActionsWarnings", () => {
  const buildResult = (
    name: string,
    ratio: number,
    marginal: boolean,
  ): ContrastResult => {
    const pair: ContrastPair = {
      name,
      fg: "oklch(20% 0.02 90)",
      bg: "oklch(98% 0.02 90)",
      minRatio: 4.5,
      category: "body",
    };
    return {
      pair,
      ratio,
      fgLuminance: 0.1,
      bgLuminance: 0.9,
      aaa: ratio >= 7,
      aa: ratio >= 4.5,
      passed: ratio >= pair.minRatio,
      marginal,
    };
  };

  let logSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = process.env.GITHUB_ACTIONS;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    if (originalEnv === undefined) {
      delete process.env.GITHUB_ACTIONS;
    } else {
      process.env.GITHUB_ACTIONS = originalEnv;
    }
  });

  it("GITHUB_ACTIONS=true でマージン僅少ペアごとに ::warning:: を出力できる", () => {
    process.env.GITHUB_ACTIONS = "true";
    const marginal = [
      buildResult("pair-a", 7.05, true),
      buildResult("pair-b", 4.6, true),
    ];

    emitGithubActionsWarnings(marginal);

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(
      1,
      "::warning::マージン僅少 ratio=7.05 pair-a",
    );
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      "::warning::マージン僅少 ratio=4.60 pair-b",
    );
  });

  it("GITHUB_ACTIONS 未設定では何も出力しない", () => {
    delete process.env.GITHUB_ACTIONS;
    const marginal = [buildResult("pair-a", 7.05, true)];

    emitGithubActionsWarnings(marginal);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("GITHUB_ACTIONS=false (true 以外の値) では何も出力しない", () => {
    process.env.GITHUB_ACTIONS = "false";
    const marginal = [buildResult("pair-a", 7.05, true)];

    emitGithubActionsWarnings(marginal);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("GITHUB_ACTIONS=true でもマージン僅少が空配列なら何も出力しない", () => {
    process.env.GITHUB_ACTIONS = "true";

    emitGithubActionsWarnings([]);

    expect(logSpy).not.toHaveBeenCalled();
  });
});
