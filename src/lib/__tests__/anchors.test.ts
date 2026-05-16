/**
 * 個人史座標エンジン (anchors.ts) のテスト
 *
 * 設計書: epic #487 / Issue #488 / Issue #497 (nominal 化)
 *
 * - publishedAt 推定 (ファイル名 → ISO 8601 JST 固定)
 * - 層1=座標 (computeCoordinates): 登録節目との差分日数
 * - 層2=経過 (computeElapsed): フォールバックの暦上経過日数
 * - 型の nominal 化 (Coordinate / Elapsed の discriminator field `kind`)
 *
 * 本ファイルは anchors.ts の純粋関数のみを検証する。
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import milestonesJson from "../../../datasources/milestones.json";
import {
  type Coordinate,
  computeCoordinates,
  computeElapsed,
  type Elapsed,
  inferPublishedAt,
  type Milestone,
} from "../anchors";

describe("inferPublishedAt: ファイル名からの ISO 8601 推定 (JST 固定)", () => {
  describe("正常系", () => {
    it("ファイル名 20250101120000.md から 2025-01-01T12:00:00+09:00 を返す", () => {
      expect(inferPublishedAt("20250101120000.md")).toBe(
        "2025-01-01T12:00:00+09:00",
      );
    });

    it("拡張子 .md なしの 20250101120000 も同じ ISO 8601 を返す", () => {
      expect(inferPublishedAt("20250101120000")).toBe(
        "2025-01-01T12:00:00+09:00",
      );
    });

    it("ファイル名 20250908234321.md から 2025-09-08T23:43:21+09:00 を返す", () => {
      expect(inferPublishedAt("20250908234321.md")).toBe(
        "2025-09-08T23:43:21+09:00",
      );
    });

    it("ファイル名 20260307120000.md から 2026-03-07T12:00:00+09:00 を返す", () => {
      expect(inferPublishedAt("20260307120000.md")).toBe(
        "2026-03-07T12:00:00+09:00",
      );
    });

    it("閏年 2024-02-29 のファイル名 20240229120000.md は実在日付として 2024-02-29T12:00:00+09:00 を返す", () => {
      expect(inferPublishedAt("20240229120000.md")).toBe(
        "2024-02-29T12:00:00+09:00",
      );
    });
  });

  describe("異常系・境界値", () => {
    it("ゼロ埋めの 00000000000000.md は null を返す", () => {
      expect(inferPublishedAt("00000000000000.md")).toBeNull();
    });

    it("上限超過の 99999999999999.md は null を返す", () => {
      expect(inferPublishedAt("99999999999999.md")).toBeNull();
    });

    it("数字以外を含む abc.md は null を返す", () => {
      expect(inferPublishedAt("abc.md")).toBeNull();
    });

    it("13 桁しか無い 2025010112000.md は null を返す", () => {
      expect(inferPublishedAt("2025010112000.md")).toBeNull();
    });

    it("15 桁の 202501011200001.md は null を返す", () => {
      expect(inferPublishedAt("202501011200001.md")).toBeNull();
    });

    it("空文字列は null を返す", () => {
      expect(inferPublishedAt("")).toBeNull();
    });

    it("拡張子のみの .md は null を返す", () => {
      expect(inferPublishedAt(".md")).toBeNull();
    });

    /**
     * 設計上の意図: ファイル名推定は正規表現で年月日時分秒を抽出して
     * 文字列を組み立てる実装。Date.parse が非閏年の 2/29 をロールオーバー
     * させても文字列は再構築されないため、推定値はそのまま "2025-02-29T..."
     * を返す。anchors.ts 単独の境界値仕様としてここで固定する。
     *
     * 将来 isIso8601 側を厳密化する場合は本テストの期待値を null に反転する。
     */
    it("非閏年 2/29 ファイル名 20250229120000.md は 2025-02-29T12:00:00+09:00 を返す (実在しない日付だが文字列再構築のため許容)", () => {
      expect(inferPublishedAt("20250229120000.md")).toBe(
        "2025-02-29T12:00:00+09:00",
      );
    });
  });

  describe("既存16記事すべての解決", () => {
    /**
     * 対象は `YYYYMMDDhhmmss.md` 命名のファイルのみに絞る。
     * 命名外のファイル (例: `non-yyyymmddhhmmss.md`) が将来追加されても
     * inferPublishedAt の解決確認テストが壊れないようにする。
     * 件数しきい値 (>= 16) と全件解決を担保する点は変わらない。
     */
    it("datasources/ 配下の YYYYMMDDhhmmss.md ファイル全件で publishedAt が解決できる", () => {
      const datasourcesDir = join(__dirname, "../../../datasources");
      const files = readdirSync(datasourcesDir).filter((file) =>
        /^\d{14}\.md$/.test(file),
      );

      // 前提: 16 記事以上存在する (本 Issue の前提)
      expect(files.length).toBeGreaterThanOrEqual(16);

      for (const file of files) {
        const result = inferPublishedAt(file);
        expect(result, `ファイル ${file} の推定に失敗`).not.toBeNull();
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/);
      }
    });
  });
});

describe("computeCoordinates: 層1=座標 (登録節目との差分日数)", () => {
  describe("基本動作", () => {
    it("publishedAt より前の節目1つの差分日数を計算する", () => {
      const milestones: readonly Milestone[] = [
        { date: "2025-01-01", label: "社会復帰", tone: "neutral" },
      ];
      const result = computeCoordinates(
        "2025-01-10T12:00:00+09:00",
        milestones,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual<Coordinate>({
        kind: "coordinate",
        label: "社会復帰",
        tone: "neutral",
        daysSince: 9,
      });
    });

    it("同日 (節目=publishedAt) の差分日数は 0 になる", () => {
      const milestones: readonly Milestone[] = [
        { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
      ];
      const result = computeCoordinates(
        "2025-01-01T12:00:00+09:00",
        milestones,
      );

      expect(result).toHaveLength(1);
      expect(result[0].daysSince).toBe(0);
    });

    it("複数の節目すべてについて差分日数を返す", () => {
      const milestones: readonly Milestone[] = [
        { date: "2025-01-01", label: "社会復帰", tone: "neutral" },
        { date: "2025-01-05", label: "サイト開設", tone: "light" },
      ];
      const result = computeCoordinates(
        "2025-01-10T12:00:00+09:00",
        milestones,
      );

      expect(result).toHaveLength(2);
      expect(result.find((c) => c.label === "社会復帰")?.daysSince).toBe(9);
      expect(result.find((c) => c.label === "サイト開設")?.daysSince).toBe(5);
    });

    it("空の節目配列を渡すと空配列を返す", () => {
      const result = computeCoordinates("2025-01-10T12:00:00+09:00", []);

      expect(result).toEqual([]);
    });
  });

  describe("publishedAt より後の節目は除外", () => {
    it("publishedAt より後 (未来) の節目は結果に含まれない", () => {
      const milestones: readonly Milestone[] = [
        { date: "2025-01-01", label: "過去", tone: "neutral" },
        { date: "2025-12-31", label: "未来", tone: "light" },
      ];
      const result = computeCoordinates(
        "2025-01-10T12:00:00+09:00",
        milestones,
      );

      expect(result).toHaveLength(1);
      expect(result[0].label).toBe("過去");
    });

    it("全ての節目が publishedAt より後なら空配列を返す", () => {
      const milestones: readonly Milestone[] = [
        { date: "2025-12-31", label: "未来", tone: "neutral" },
      ];
      const result = computeCoordinates(
        "2025-01-10T12:00:00+09:00",
        milestones,
      );

      expect(result).toEqual([]);
    });
  });

  describe("tone の保持", () => {
    it("neutral / light / heavy の tone をそのまま結果に保持する", () => {
      const milestones: readonly Milestone[] = [
        { date: "2025-01-01", label: "中立", tone: "neutral" },
        { date: "2025-01-02", label: "軽め", tone: "light" },
        { date: "2025-01-03", label: "重い", tone: "heavy" },
      ];
      const result = computeCoordinates(
        "2025-02-01T12:00:00+09:00",
        milestones,
      );

      expect(result.find((c) => c.label === "中立")?.tone).toBe("neutral");
      expect(result.find((c) => c.label === "軽め")?.tone).toBe("light");
      expect(result.find((c) => c.label === "重い")?.tone).toBe("heavy");
    });
  });

  describe("日数計算の精度", () => {
    it("月をまたぐ場合も暦日数で計算される (2025-01-31 → 2025-02-01 は 1 日)", () => {
      const milestones: readonly Milestone[] = [
        { date: "2025-01-31", label: "境界", tone: "neutral" },
      ];
      const result = computeCoordinates(
        "2025-02-01T12:00:00+09:00",
        milestones,
      );

      expect(result[0].daysSince).toBe(1);
    });

    it("年をまたぐ場合も暦日数で計算される (2024-12-31 → 2025-01-01 は 1 日)", () => {
      const milestones: readonly Milestone[] = [
        { date: "2024-12-31", label: "大晦日", tone: "neutral" },
      ];
      const result = computeCoordinates(
        "2025-01-01T12:00:00+09:00",
        milestones,
      );

      expect(result[0].daysSince).toBe(1);
    });

    it("publishedAt 内の時刻に関係なく日付の差で計算される (00:00 と 23:59 で同じ)", () => {
      const milestones: readonly Milestone[] = [
        { date: "2025-01-01", label: "起点", tone: "neutral" },
      ];
      const morning = computeCoordinates(
        "2025-01-10T00:00:00+09:00",
        milestones,
      );
      const night = computeCoordinates("2025-01-10T23:59:59+09:00", milestones);

      expect(morning[0].daysSince).toBe(9);
      expect(night[0].daysSince).toBe(9);
    });
  });

  describe("入力順の保持", () => {
    /**
     * 設計上の意図: computeCoordinates の JSDoc に「milestones の順序を
     * 保ったまま返す」と明記しているため、テストで仕様固定する。
     * 表示層 (#491) でソート順を別途指定する/しないの判断はこの不変条件に依存する。
     */
    it("milestones の入力順を保持したまま Coordinate 配列を返す", () => {
      const milestones: readonly Milestone[] = [
        { date: "2025-01-05", label: "B", tone: "neutral" },
        { date: "2025-01-01", label: "A", tone: "neutral" },
        { date: "2025-01-03", label: "C", tone: "light" },
      ];
      const result = computeCoordinates(
        "2025-02-01T12:00:00+09:00",
        milestones,
      );

      expect(result.map((c) => c.label)).toEqual(["B", "A", "C"]);
    });

    it("publishedAt より後ろの節目を除外しても残った要素の相対順は保持される", () => {
      const milestones: readonly Milestone[] = [
        { date: "2025-01-05", label: "B", tone: "neutral" },
        { date: "2025-12-31", label: "未来", tone: "light" },
        { date: "2025-01-01", label: "A", tone: "neutral" },
        { date: "2025-01-03", label: "C", tone: "light" },
      ];
      const result = computeCoordinates(
        "2025-02-01T12:00:00+09:00",
        milestones,
      );

      expect(result.map((c) => c.label)).toEqual(["B", "A", "C"]);
    });
  });

  /**
   * Milestone.date の値範囲検証は本モジュールでは行わない。
   * 不正な YYYY-MM-DD は `Date.UTC` のロールオーバーでサイレントに
   * 別の日付として解釈される (例: "2025-13-32" → 2026-02-01)。
   *
   * 将来 milestones.json の値範囲検証関数を #489 で追加するため、
   * 本モジュールの「ロールオーバー許容」挙動を仕様としてここで固定する。
   * 将来 #489 で検証関数が導入されたとしても、anchors.ts の純粋関数は
   * この挙動を保つ前提 (検証は呼び出し側責務)。
   */
  describe("Milestone.date 不正値の仕様: Date.UTC ロールオーバーを許容", () => {
    it('Milestone.date が "2025-13-32" のとき、Date.UTC のロールオーバーで 2026-02-01 として解釈される', () => {
      // 2025-13-32 → Date.UTC(2025, 12, 32) = 2026-02-01
      // publishedAt = 2026-02-10 とすると 9 日差になる
      const milestones: readonly Milestone[] = [
        { date: "2025-13-32", label: "ロールオーバー", tone: "neutral" },
      ];
      const result = computeCoordinates(
        "2026-02-10T12:00:00+09:00",
        milestones,
      );

      expect(result).toHaveLength(1);
      expect(result[0].daysSince).toBe(9);
    });

    it('Milestone.date が "2025-00-01" のとき、Date.UTC のロールオーバーで 2024-12-01 として解釈される', () => {
      // 2025-00-01 → Date.UTC(2025, -1, 1) = 2024-12-01
      // publishedAt = 2024-12-11 とすると 10 日差になる
      const milestones: readonly Milestone[] = [
        { date: "2025-00-01", label: "ロールオーバー", tone: "neutral" },
      ];
      const result = computeCoordinates(
        "2024-12-11T12:00:00+09:00",
        milestones,
      );

      expect(result).toHaveLength(1);
      expect(result[0].daysSince).toBe(10);
    });

    it('Milestone.date が "2025-99-99" のとき、Date.UTC のロールオーバーで 2033-06-07 として解釈される', () => {
      // 2025-99-99 → Date.UTC(2025, 98, 99) = 2033-06-07
      const milestones: readonly Milestone[] = [
        { date: "2025-99-99", label: "ロールオーバー", tone: "neutral" },
      ];
      const result = computeCoordinates(
        "2033-06-08T12:00:00+09:00",
        milestones,
      );

      expect(result).toHaveLength(1);
      expect(result[0].daysSince).toBe(1);
    });

    it('Milestone.date が "abc-de-fg" のとき、正規表現で reject されて結果から除外される', () => {
      const milestones: readonly Milestone[] = [
        { date: "abc-de-fg", label: "形式不正", tone: "neutral" },
      ];
      const result = computeCoordinates(
        "2025-02-01T12:00:00+09:00",
        milestones,
      );

      expect(result).toEqual([]);
    });

    it('Milestone.date が "2025-02-29" (非閏年 2/29) のとき、Date.UTC のロールオーバーで 2025-03-01 として解釈される', () => {
      // 2025-02-29 → Date.UTC(2025, 1, 29) = 2025-03-01
      const milestones: readonly Milestone[] = [
        { date: "2025-02-29", label: "非閏年 2/29", tone: "neutral" },
      ];
      const result = computeCoordinates(
        "2025-03-02T12:00:00+09:00",
        milestones,
      );

      expect(result).toHaveLength(1);
      expect(result[0].daysSince).toBe(1);
    });
  });

  /**
   * ラウンドトリップ整合性: inferPublishedAt が非閏年 2/29 を文字列として
   * 通すため (`"2025-02-29T12:00:00+09:00"`)、それを computeCoordinates に
   * 渡したときの挙動を仕様として固定する。
   *
   * - inferPublishedAt: 文字列再構築のためそのまま返す
   * - computeCoordinates: JST 暦上では Date.UTC ロールオーバーで 2025-03-01 扱い
   * - 結果として milestone "2025-03-01" との差分は 0 日になる
   */
  describe("inferPublishedAt → computeCoordinates のラウンドトリップ整合性", () => {
    it("inferPublishedAt が返した非閏年 2/29 の publishedAt は、暦上同一日 (2025-03-01) として扱われる", () => {
      const publishedAt = inferPublishedAt("20250229120000.md");
      expect(publishedAt).toBe("2025-02-29T12:00:00+09:00");

      // null チェック: 上の expect で確定済みだが TypeScript narrowing のため
      if (publishedAt === null) {
        throw new Error("unreachable");
      }

      const milestones: readonly Milestone[] = [
        { date: "2025-03-01", label: "x", tone: "neutral" },
      ];
      const result = computeCoordinates(publishedAt, milestones);

      expect(result).toHaveLength(1);
      expect(result[0].daysSince).toBe(0);
    });
  });
});

describe("computeElapsed: 層2=経過 (暦上の経過日数)", () => {
  it("origin から publishedAt までの経過日数を返す", () => {
    const result = computeElapsed(
      "2025-01-10T12:00:00+09:00",
      "2025-01-01",
      "サイト開設",
    );

    expect(result).toEqual<Elapsed>({
      kind: "elapsed",
      label: "サイト開設",
      daysSince: 9,
    });
  });

  it("origin と publishedAt が同日なら 0 日を返す", () => {
    const result = computeElapsed(
      "2025-01-01T15:00:00+09:00",
      "2025-01-01",
      "サイト開設",
    );

    expect(result.daysSince).toBe(0);
  });

  it("origin が publishedAt より後ろの場合は負の値を返さず 0 を返す", () => {
    const result = computeElapsed(
      "2025-01-01T12:00:00+09:00",
      "2025-01-10",
      "サイト開設",
    );

    expect(result.daysSince).toBe(0);
  });

  it("label がそのまま結果に保持される", () => {
    const result = computeElapsed(
      "2025-01-10T12:00:00+09:00",
      "2025-01-01",
      "任意のラベル",
    );

    expect(result.label).toBe("任意のラベル");
  });

  it("年をまたぐ経過日数も計算できる", () => {
    const result = computeElapsed(
      "2026-01-01T12:00:00+09:00",
      "2025-01-01",
      "1年経過",
    );

    expect(result.daysSince).toBe(365);
  });
});

describe("型定義: status / tags / updatedAt を露出しない", () => {
  it("Coordinate 型は kind / label / tone / daysSince のみを公開し、メタ情報を持たない", () => {
    const coordinate: Coordinate = {
      kind: "coordinate",
      label: "ラベル",
      tone: "neutral",
      daysSince: 0,
    };

    // status / tags / updatedAt のキーは存在しない
    expect(Object.keys(coordinate).sort()).toEqual(
      ["daysSince", "kind", "label", "tone"].sort(),
    );
  });

  it("Elapsed 型は kind / label / daysSince のみを公開し、tone も含まない", () => {
    const elapsed: Elapsed = {
      kind: "elapsed",
      label: "ラベル",
      daysSince: 0,
    };

    expect(Object.keys(elapsed).sort()).toEqual(
      ["daysSince", "kind", "label"].sort(),
    );
  });

  it("Milestone 型は date / label / tone のみを公開する", () => {
    const milestone: Milestone = {
      date: "2025-01-01",
      label: "ラベル",
      tone: "neutral",
    };

    expect(Object.keys(milestone).sort()).toEqual(
      ["date", "label", "tone"].sort(),
    );
  });
});

/**
 * Issue #497: Coordinate と Elapsed の nominal 化
 *
 * `Coordinate` (label/tone/daysSince) は構造的に `Elapsed` (label/daysSince) を
 * 包含するため、structural typing の TypeScript では「Coordinate を Elapsed
 * として受けて tone を捨てる」サイレント縮退が起きうる。
 *
 * 対策として両型に discriminator field `kind` を持たせ、型レベルで両者を
 * 不整合にしている。本テスト群はその不整合がコンパイル時に検出されることを
 * `@ts-expect-error` で固定する。
 *
 * Vitest の `// @ts-expect-error` ディレクティブは型エラーが発生しなければ
 * 「Unused @ts-expect-error directive」として `pnpm type-check` (tsc --noEmit)
 * が失敗するため、回帰テストとして機能する。
 *
 * 実行時アサーションは行わない (型レベルでの検証が目的)。
 */
describe("型レベル: Coordinate / Elapsed の nominal 化 (Issue #497)", () => {
  it("Coordinate を Elapsed に直接代入するとコンパイルエラーになる", () => {
    const coordinate: Coordinate = {
      kind: "coordinate",
      label: "ラベル",
      tone: "neutral",
      daysSince: 0,
    };

    // @ts-expect-error - Coordinate (kind: "coordinate") を Elapsed (kind: "elapsed")
    // に代入することは discriminator の不一致でコンパイル時に検出される
    const elapsed: Elapsed = coordinate;

    // void で参照することで「未使用変数」警告を回避しつつ、型エラーが
    // 発生していることを保証する
    void elapsed;
  });

  it("Elapsed を Coordinate に直接代入するとコンパイルエラーになる (tone 欠落 + kind 不一致)", () => {
    const elapsed: Elapsed = {
      kind: "elapsed",
      label: "ラベル",
      daysSince: 0,
    };

    // @ts-expect-error - Elapsed (kind: "elapsed", tone なし) を
    // Coordinate (kind: "coordinate", tone あり) に代入することは
    // discriminator 不一致と tone 欠落の両方でコンパイル時に検出される
    const coordinate: Coordinate = elapsed;

    void coordinate;
  });

  it("kind を持たないオブジェクトを Coordinate に代入するとコンパイルエラーになる (structural 包含の塞ぎ)", () => {
    // @ts-expect-error - discriminator `kind` が欠落しているため Coordinate
    // として代入できない (Issue #497 で導入した nominal 化の主目的)
    const coordinate: Coordinate = {
      label: "ラベル",
      tone: "neutral",
      daysSince: 0,
    };

    void coordinate;
  });

  it("kind を持たないオブジェクトを Elapsed に代入するとコンパイルエラーになる (structural 包含の塞ぎ)", () => {
    // @ts-expect-error - discriminator `kind` が欠落しているため Elapsed
    // として代入できない (Issue #497 で導入した nominal 化の主目的)
    const elapsed: Elapsed = {
      label: "ラベル",
      daysSince: 0,
    };

    void elapsed;
  });

  it("computeCoordinates の戻り値要素は Coordinate として narrow でき、Elapsed には代入できない", () => {
    const milestones: readonly Milestone[] = [
      { date: "2025-01-01", label: "x", tone: "neutral" },
    ];
    const result = computeCoordinates("2025-01-10T12:00:00+09:00", milestones);
    const first = result[0];

    // discriminated union narrowing が効くことを確認
    if (first.kind === "coordinate") {
      // tone への安全なアクセス
      expect(first.tone).toBe("neutral");
    }

    // @ts-expect-error - computeCoordinates の戻り値要素 (Coordinate) を
    // Elapsed として受けるのは Issue #497 で禁止された
    const elapsed: Elapsed = first;

    void elapsed;
  });

  it("computeElapsed の戻り値は Elapsed として narrow でき、Coordinate には代入できない", () => {
    const result = computeElapsed(
      "2025-01-10T12:00:00+09:00",
      "2025-01-01",
      "x",
    );

    if (result.kind === "elapsed") {
      // discriminator が "elapsed" であることを確認
      expect(result.daysSince).toBe(9);
    }

    // @ts-expect-error - computeElapsed の戻り値 (Elapsed) を Coordinate
    // として受けるのは Issue #497 で禁止された (tone 欠落 + kind 不一致)
    const coordinate: Coordinate = result;

    void coordinate;
  });
});

// =============================================================================
// Issue #489 AC: 実データ統合 (datasources/milestones.json × datasources/*.md)
// =============================================================================
//
// Issue #489 の Acceptance Criteria「登録した節目で N-1 の座標計算が
// 16記事に対して破綻しない」を実データで担保する統合テスト群。
//
// - 入力 1: `datasources/milestones.json` (本 PR で登録した節目データ)
// - 入力 2: `datasources/*.md` (記事のファイル名 → inferPublishedAt)
// - 検証関数: computeCoordinates (層1=座標)
//
// 破綻の定義 (この describe では以下を全件検出する):
//   - 例外を投げる
//   - undefined / null を返す
//   - 配列以外を返す
//   - 要素の daysSince が NaN
describe("Issue #489 AC: 実データ統合 (milestones.json × 全記事)", () => {
  const datasourcesDir = join(__dirname, "..", "..", "..", "datasources");
  const milestones = milestonesJson as readonly Milestone[];

  const collectPostPublishedAts = (): readonly string[] => {
    const fileNames = readdirSync(datasourcesDir).filter((name) =>
      name.endsWith(".md"),
    );
    const isoList: string[] = [];
    for (const fileName of fileNames) {
      const iso = inferPublishedAt(fileName);
      if (iso !== null) {
        isoList.push(iso);
      }
    }
    return isoList;
  };

  it("datasources/*.md が 16 件存在する (AC 前提条件)", () => {
    const publishedAts = collectPostPublishedAts();
    expect(publishedAts.length).toBe(16);
  });

  it("milestones.json は 1 件以上の節目を持つ (AC 前提条件)", () => {
    expect(milestones.length).toBeGreaterThan(0);
  });

  it("全 16 記事に対して computeCoordinates が例外を投げず配列を返す", () => {
    const publishedAts = collectPostPublishedAts();
    for (const publishedAt of publishedAts) {
      const result = computeCoordinates(publishedAt, milestones);
      expect(Array.isArray(result)).toBe(true);
    }
  });

  it("全 16 記事の Coordinate 配列に undefined / null 要素が混入しない", () => {
    const publishedAts = collectPostPublishedAts();
    for (const publishedAt of publishedAts) {
      const result = computeCoordinates(publishedAt, milestones);
      for (const coordinate of result) {
        expect(coordinate).not.toBeUndefined();
        expect(coordinate).not.toBeNull();
      }
    }
  });

  it("全 16 記事の Coordinate.daysSince が NaN にならず 0 以上の整数になる", () => {
    const publishedAts = collectPostPublishedAts();
    for (const publishedAt of publishedAts) {
      const result = computeCoordinates(publishedAt, milestones);
      for (const coordinate of result) {
        expect(Number.isNaN(coordinate.daysSince)).toBe(false);
        expect(Number.isInteger(coordinate.daysSince)).toBe(true);
        expect(coordinate.daysSince).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("全 16 記事の Coordinate.tone が MilestoneTone の値域に収まる", () => {
    const allowedTones: readonly string[] = ["neutral", "light", "heavy"];
    const publishedAts = collectPostPublishedAts();
    for (const publishedAt of publishedAts) {
      const result = computeCoordinates(publishedAt, milestones);
      for (const coordinate of result) {
        expect(allowedTones).toContain(coordinate.tone);
      }
    }
  });

  it("全 16 記事の Coordinate.kind が discriminator 'coordinate' になる", () => {
    const publishedAts = collectPostPublishedAts();
    for (const publishedAt of publishedAts) {
      const result = computeCoordinates(publishedAt, milestones);
      for (const coordinate of result) {
        expect(coordinate.kind).toBe("coordinate");
      }
    }
  });
});
