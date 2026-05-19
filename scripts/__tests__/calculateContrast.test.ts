/**
 * scripts/calculateContrast.ts のヘルパー単体テスト
 * (Issue #623 / S-2、Issue #651 / M-2 + M-3、Issue #688 対応)
 *
 * 検証対象:
 *   - buildCsvRow: valid OKLCH ペアで CSV 行を組み立て、invalid 入力で undefined を返す
 *   - emitGithubActionsWarnings: 環境変数 GITHUB_ACTIONS の状態で出力分岐する
 *   - aggregateResults: NG / マージン僅少 / 合計件数を集計する (M-2)
 *   - printSummary: 合計サマリ行 (空行 + 合計行) を console.log に出力する (Issue #688)
 *   - exitOnFailure: NG / --strict 違反時に exit(1)、それ以外で void 復帰する (M-2)
 *   - dispatchWarnings: aggregated.marginal を emitGithubActionsWarnings に橋渡しする (M-2)
 *   - formatReportLines: レポート行配列を純粋関数として組み立てる (M-3)
 *
 * 方針:
 *   - 振る舞い単位で 1 ケースずつ書く (TDD)
 *   - 環境変数判定は dead code 化を防ぐため true / false 両ケース検証
 *   - console.log は vi.spyOn で捕獲する
 *   - process.exit は vi.spyOn で throw に差し替え、捕捉する
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  aggregateResults,
  buildCsvRow,
  type ContrastPair,
  type ContrastResult,
  dispatchWarnings,
  emitGithubActionsWarnings,
  exitOnFailure,
  formatReportLines,
  type NamedColor,
  printSummary,
} from "../calculateContrast.ts";

// =============================================================================
// ContrastResult ファクトリ (テスト共通)
// =============================================================================

const buildResult = (
  name: string,
  ratio: number,
  options: { passed?: boolean; marginal?: boolean } = {},
): ContrastResult => {
  const passed = options.passed ?? true;
  const marginal = options.marginal ?? false;
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
    passed,
    marginal,
  };
};

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
      buildResult("pair-a", 7.05, { marginal: true }),
      buildResult("pair-b", 4.6, { marginal: true }),
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
    const marginal = [buildResult("pair-a", 7.05, { marginal: true })];

    emitGithubActionsWarnings(marginal);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("GITHUB_ACTIONS=false (true 以外の値) では何も出力しない", () => {
    process.env.GITHUB_ACTIONS = "false";
    const marginal = [buildResult("pair-a", 7.05, { marginal: true })];

    emitGithubActionsWarnings(marginal);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("GITHUB_ACTIONS=true でもマージン僅少が空配列なら何も出力しない", () => {
    process.env.GITHUB_ACTIONS = "true";

    emitGithubActionsWarnings([]);

    expect(logSpy).not.toHaveBeenCalled();
  });
});

// =============================================================================
// aggregateResults (M-2)
// =============================================================================

describe("aggregateResults", () => {
  it("NG (passed=false) を failed に振り分けられる", () => {
    const results = [
      buildResult("p-1", 8.0, { passed: true }),
      buildResult("p-2", 3.0, { passed: false }),
    ];
    const semanticResults = [buildResult("s-1", 2.0, { passed: false })];

    const aggregated = aggregateResults(results, semanticResults);

    expect(aggregated.failed).toHaveLength(2);
    expect(aggregated.failed.map((r) => r.pair.name)).toEqual(["p-2", "s-1"]);
  });

  it("passed かつ marginal を marginal に振り分けられる", () => {
    const results = [
      buildResult("p-1", 7.05, { passed: true, marginal: true }),
      buildResult("p-2", 8.0, { passed: true, marginal: false }),
    ];
    const semanticResults = [
      buildResult("s-1", 4.6, { passed: true, marginal: true }),
    ];

    const aggregated = aggregateResults(results, semanticResults);

    expect(aggregated.marginal).toHaveLength(2);
    expect(aggregated.marginal.map((r) => r.pair.name)).toEqual(["p-1", "s-1"]);
  });

  it("passed=false かつ marginal=true は marginal に含めない (NG が優先)", () => {
    const results = [
      buildResult("p-1", 4.0, { passed: false, marginal: true }),
    ];

    const aggregated = aggregateResults(results, []);

    expect(aggregated.failed).toHaveLength(1);
    expect(aggregated.marginal).toHaveLength(0);
  });

  it("primitive と semantic を連結した合計件数を total に返す", () => {
    const results = [
      buildResult("p-1", 8.0),
      buildResult("p-2", 8.0),
      buildResult("p-3", 8.0),
    ];
    const semanticResults = [buildResult("s-1", 8.0), buildResult("s-2", 8.0)];

    const aggregated = aggregateResults(results, semanticResults);

    expect(aggregated.total).toBe(5);
  });

  it("空配列を渡すと failed / marginal が空・total=0 になる", () => {
    const aggregated = aggregateResults([], []);

    expect(aggregated.failed).toEqual([]);
    expect(aggregated.marginal).toEqual([]);
    expect(aggregated.total).toBe(0);
  });
});

// =============================================================================
// printSummary (Issue #688: exitOnFailure からサマリ出力の責務を分離)
// =============================================================================

describe("printSummary", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("合計サマリ行を console.log に出力する", () => {
    const aggregated = {
      failed: [] as readonly ContrastResult[],
      marginal: [buildResult("m-1", 7.05, { passed: true, marginal: true })],
      total: 10,
    };

    printSummary(aggregated);

    expect(logSpy).toHaveBeenCalledWith(
      "合計: 10 / NG: 0 / マージン僅少: 1",
    );
  });

  it("空行 → 合計行の順で 2 回 console.log を呼ぶ (master 出力順を維持)", () => {
    const aggregated = {
      failed: [] as readonly ContrastResult[],
      marginal: [] as readonly ContrastResult[],
      total: 3,
    };

    printSummary(aggregated);

    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenNthCalledWith(1, "");
    expect(logSpy).toHaveBeenNthCalledWith(
      2,
      "合計: 3 / NG: 0 / マージン僅少: 0",
    );
  });

  it("failed / marginal の件数をサマリ行に反映する", () => {
    const aggregated = {
      failed: [
        buildResult("f-1", 3.0, { passed: false }),
        buildResult("f-2", 2.0, { passed: false }),
      ],
      marginal: [
        buildResult("m-1", 7.05, { passed: true, marginal: true }),
        buildResult("m-2", 4.6, { passed: true, marginal: true }),
        buildResult("m-3", 7.1, { passed: true, marginal: true }),
      ],
      total: 20,
    };

    printSummary(aggregated);

    expect(logSpy).toHaveBeenCalledWith(
      "合計: 20 / NG: 2 / マージン僅少: 3",
    );
  });
});

// =============================================================================
// exitOnFailure (M-2、Issue #688 でサマリ出力を分離)
// =============================================================================

describe("exitOnFailure", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // process.exit を throw に差し替えて、後続コードを止めつつ呼び出しを検証する
    const mockExit = (code?: number): never => {
      throw new Error(`process.exit(${code})`);
    };
    exitSpy = vi
      .spyOn(process, "exit")
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      .mockImplementation(mockExit as any);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("failed が 0 件かつ strict=false なら exit せず void 復帰する", () => {
    const aggregated = {
      failed: [] as readonly ContrastResult[],
      marginal: [] as readonly ContrastResult[],
      total: 3,
    };

    expect(() => exitOnFailure(aggregated, false)).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("サマリ行は出力しない (printSummary に分離済み)", () => {
    const aggregated = {
      failed: [] as readonly ContrastResult[],
      marginal: [buildResult("m-1", 7.05, { passed: true, marginal: true })],
      total: 10,
    };

    exitOnFailure(aggregated, false);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("failed が 1 件以上あれば process.exit(1) する", () => {
    const aggregated = {
      failed: [buildResult("f-1", 3.0, { passed: false })],
      marginal: [] as readonly ContrastResult[],
      total: 1,
    };

    expect(() => exitOnFailure(aggregated, false)).toThrow(
      "process.exit(1)",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "\nNG ペアあり: AAA / AA を満たしていません",
    );
  });

  it("strict=true かつ marginal がある場合は process.exit(1) する", () => {
    const aggregated = {
      failed: [] as readonly ContrastResult[],
      marginal: [buildResult("m-1", 7.05, { passed: true, marginal: true })],
      total: 1,
    };

    expect(() => exitOnFailure(aggregated, true)).toThrow("process.exit(1)");
    expect(errorSpy).toHaveBeenCalledWith(
      "\n--strict 指定: マージン僅少ペアあり",
    );
  });

  it("strict=true でも marginal が空なら exit しない", () => {
    const aggregated = {
      failed: [] as readonly ContrastResult[],
      marginal: [] as readonly ContrastResult[],
      total: 1,
    };

    expect(() => exitOnFailure(aggregated, true)).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

// =============================================================================
// dispatchWarnings (M-2)
// =============================================================================

describe("dispatchWarnings", () => {
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

  it("aggregated.marginal を emitGithubActionsWarnings に橋渡しできる", () => {
    process.env.GITHUB_ACTIONS = "true";
    const aggregated = {
      failed: [] as readonly ContrastResult[],
      marginal: [buildResult("m-1", 7.05, { passed: true, marginal: true })],
      total: 1,
    };

    dispatchWarnings(aggregated);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "::warning::マージン僅少 ratio=7.05 m-1",
    );
  });

  it("GITHUB_ACTIONS 未設定なら何も出力しない", () => {
    delete process.env.GITHUB_ACTIONS;
    const aggregated = {
      failed: [] as readonly ContrastResult[],
      marginal: [buildResult("m-1", 7.05, { passed: true, marginal: true })],
      total: 1,
    };

    dispatchWarnings(aggregated);

    expect(logSpy).not.toHaveBeenCalled();
  });
});

// =============================================================================
// formatReportLines (M-3)
// =============================================================================

describe("formatReportLines", () => {
  it("ヘッダ行 / 閾値行 / セクション見出しの順で行を組み立てる", () => {
    const lines = formatReportLines([], []);

    expect(lines[0]).toBe("== Editorial Citrus AAA コントラスト実測 ==");
    expect(lines[1]).toMatch(/^本文閾値: .* \/ 大文字: .*$/);
    expect(lines[2]).toBe("");
    expect(lines[3]).toBe("[primitive ペア]");
    expect(lines[4]).toBe("");
    expect(lines[5]).toBe("[semantic トークン整合性]");
  });

  it("primitive / semantic ペア各 1 件で 8 行を返す (header4 + p1 + blank + sem-header + s1)", () => {
    const results = [buildResult("p-1", 8.0, { passed: true })];
    const semanticResults = [buildResult("s-1", 8.0, { passed: true })];

    const lines = formatReportLines(results, semanticResults);

    // header(1) + threshold(1) + blank(1) + section(1) + p1(1) + blank(1) + section(1) + s1(1)
    expect(lines).toHaveLength(8);
    expect(lines[4]).toContain("p-1");
    expect(lines[7]).toContain("s-1");
  });

  it("純粋関数として副作用を持たない (console.log を呼ばない)", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      formatReportLines(
        [buildResult("p-1", 8.0)],
        [buildResult("s-1", 8.0)],
      );
      expect(logSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });

  it("passed=true で OK マーカ、passed=false で NG マーカを行に含める", () => {
    const results = [
      buildResult("ok-pair", 8.0, { passed: true }),
      buildResult("ng-pair", 2.0, { passed: false }),
    ];

    const lines = formatReportLines(results, []);

    const okLine = lines.find((l) => l.includes("ok-pair"));
    const ngLine = lines.find((l) => l.includes("ng-pair"));
    expect(okLine).toMatch(/OK /);
    expect(ngLine).toMatch(/NG /);
  });

  it("marginal=true のペアには (margin<5%) サフィックスを付与する", () => {
    const results = [
      buildResult("marginal-pair", 7.05, { passed: true, marginal: true }),
    ];

    const lines = formatReportLines(results, []);

    const marginalLine = lines.find((l) => l.includes("marginal-pair"));
    expect(marginalLine).toContain("(margin<5%)");
  });
});
