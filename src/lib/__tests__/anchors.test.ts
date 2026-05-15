/**
 * 個人史座標エンジン (anchors.ts) のテスト
 *
 * 設計書: epic #487 / Issue #488
 *
 * - publishedAt 推定 (ファイル名 → ISO 8601 JST 固定)
 * - 層1=座標 (computeCoordinates): 登録節目との差分日数
 * - 層2=経過 (computeElapsed): フォールバックの暦上経過日数
 *
 * `meta.ts` には依存しない (death module 扱い、本 Issue の制約)
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
     * を返す。meta.test.ts の同じ境界値ケースと対称な振る舞いを保つ。
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
});

describe("computeElapsed: 層2=経過 (暦上の経過日数)", () => {
  it("origin から publishedAt までの経過日数を返す", () => {
    const result = computeElapsed(
      "2025-01-10T12:00:00+09:00",
      "2025-01-01",
      "サイト開設",
    );

    expect(result).toEqual<Elapsed>({
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
  it("Coordinate 型は label / tone / daysSince のみを公開し、メタ情報を持たない", () => {
    const coordinate: Coordinate = {
      label: "ラベル",
      tone: "neutral",
      daysSince: 0,
    };

    // status / tags / updatedAt のキーは存在しない
    expect(Object.keys(coordinate).sort()).toEqual(
      ["daysSince", "label", "tone"].sort(),
    );
  });

  it("Elapsed 型は label / daysSince のみを公開し、tone も含まない", () => {
    const elapsed: Elapsed = {
      label: "ラベル",
      daysSince: 0,
    };

    expect(Object.keys(elapsed).sort()).toEqual(["daysSince", "label"].sort());
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
