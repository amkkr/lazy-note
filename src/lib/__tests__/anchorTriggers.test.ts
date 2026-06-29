/**
 * Anchor 再評価トリガー検知器 (anchorTriggers.ts) の単体テスト (Issue #840)
 *
 * 本ファイルは合成入力 (固定 fixture) で `selectDominantMilestone` /
 * `computeDominantMilestoneShare` / `countNonHeavyMilestones` の
 * **決定的な振る舞い** を固定する:
 * - 支配節目 = heavy 除外後の通過済み節目のうち daysSince 最小
 * - タイブレーク (daysSince 同値) は milestones 入力順で先勝ち
 * - 母数 = 支配節目を 1 つ以上持つ記事 (推定不能 / 非 heavy 座標 0 件は除外)
 * - グルーピングキーは date + label の複合 (同一 label・別 date の併合防止)
 *
 * 実データ (datasources/*.md + 本番 milestones.json) を使った Tripwire は
 * `anchorTriggers.allPosts.test.ts` 側に分離する (本ファイルはロジック単体検証)。
 */

import { describe, expect, it } from "vitest";
import {
  computeDominantMilestoneShare,
  countNonHeavyMilestones,
  selectDominantMilestone,
} from "../anchorTriggers";
import type { Milestone } from "../anchors";

/**
 * 単体テスト専用の固定節目。
 *
 * - heavy 1 件 (除外対象) / neutral 1 件 / light 1 件 で構成し、
 *   heavy 除外と daysSince 最小選定の両方を観測できるようにする。
 */
const fixtureMilestones: readonly Milestone[] = [
  { date: "2025-08-05", label: "休職開始", tone: "heavy" },
  { date: "2025-08-26", label: "サイト開設", tone: "neutral" },
  { date: "2025-09-05", label: "社会復帰", tone: "light" },
];

describe("countNonHeavyMilestones: heavy 除外後の節目件数", () => {
  it("heavy を除いた件数 (neutral + light) を返す", () => {
    expect(countNonHeavyMilestones(fixtureMilestones)).toBe(2);
  });

  it("全節目が heavy のとき 0 を返す", () => {
    const allHeavy: readonly Milestone[] = [
      { date: "2025-08-05", label: "休職開始", tone: "heavy" },
      { date: "2025-08-10", label: "別の重い節目", tone: "heavy" },
    ];
    expect(countNonHeavyMilestones(allHeavy)).toBe(0);
  });

  it("空配列のとき 0 を返す", () => {
    expect(countNonHeavyMilestones([])).toBe(0);
  });
});

describe("selectDominantMilestone: 1 記事の支配節目選定", () => {
  it("複数の通過済み節目があるとき daysSince 最小 (最後に通過した節目) を選ぶ", () => {
    // 2025-09-08 公開: サイト開設 (13 日前) / 社会復帰 (3 日前) を通過済み。
    // より新しい社会復帰 (daysSince 最小) が支配節目になる。
    const dominant = selectDominantMilestone(
      "2025-09-08T00:00:00+09:00",
      fixtureMilestones,
    );
    expect(dominant?.label).toBe("社会復帰");
    expect(dominant?.date).toBe("2025-09-05");
  });

  it("非 heavy の通過済み節目が 1 件だけのとき、その節目を選ぶ", () => {
    // 2025-08-27 公開: サイト開設 (1 日前) のみ通過済み。社会復帰は未来で除外。
    const dominant = selectDominantMilestone(
      "2025-08-27T00:00:00+09:00",
      fixtureMilestones,
    );
    expect(dominant?.label).toBe("サイト開設");
    expect(dominant?.date).toBe("2025-08-26");
  });

  it("heavy 節目しか通過していない記事は支配節目を持たない (undefined)", () => {
    // 2025-08-10 公開: heavy の休職開始のみ通過済み。heavy は除外されるため
    // 非 heavy 座標は 0 件 → 支配節目なし。
    const dominant = selectDominantMilestone(
      "2025-08-10T00:00:00+09:00",
      fixtureMilestones,
    );
    expect(dominant).toBeUndefined();
  });

  it("全節目より前に公開された記事は支配節目を持たない (undefined)", () => {
    const dominant = selectDominantMilestone(
      "2025-01-01T00:00:00+09:00",
      fixtureMilestones,
    );
    expect(dominant).toBeUndefined();
  });

  it("daysSince 同値のときは milestones 入力順で先に現れた節目を選ぶ (決定的タイブレーク)", () => {
    // 同日 (2025-08-26) に非 heavy 節目を 2 件登録し、公開日も同日にすると
    // 両者 daysSince = 0 で同値になる。入力順で先の「先勝ち」を採用する。
    const tieMilestones: readonly Milestone[] = [
      { date: "2025-08-26", label: "先勝ち", tone: "neutral" },
      { date: "2025-08-26", label: "後負け", tone: "light" },
    ];
    const dominant = selectDominantMilestone(
      "2025-08-26T00:00:00+09:00",
      tieMilestones,
    );
    expect(dominant?.label).toBe("先勝ち");
    expect(dominant?.date).toBe("2025-08-26");
  });
});

describe("computeDominantMilestoneShare: 最大支配グループ比率の計算", () => {
  it("支配節目別に記事を集計し、最大グループの比率を返す", () => {
    // サイト開設 支配 = 2 件 / 社会復帰 支配 = 2 件 になる合成入力。
    const fileNames = [
      "20250827000000.md", // サイト開設 (1 日目)
      "20250901000000.md", // サイト開設 (6 日目, 社会復帰は未来)
      "20250908000000.md", // 社会復帰 (3 日目)
      "20250910000000.md", // 社会復帰 (5 日目)
    ];
    const result = computeDominantMilestoneShare(fileNames, fixtureMilestones);
    expect(result.denominator).toBe(4);
    expect(result.maxShare).toBe(0.5);
    expect(result.groups).toEqual([
      { label: "サイト開設", count: 2 },
      { label: "社会復帰", count: 2 },
    ]);
  });

  it("inferPublishedAt 不能な記事を母数から除外する", () => {
    const fileNames = ["20250908000000.md", "not-a-timestamp.md"];
    const result = computeDominantMilestoneShare(fileNames, fixtureMilestones);
    expect(result.denominator).toBe(1);
    expect(result.dominantLabel).toBe("社会復帰");
    expect(result.maxShare).toBe(1);
  });

  it("非 heavy 座標 0 件の記事を母数から除外する", () => {
    // 1 件目は全節目より前 (支配節目なし) で母数から外れ、2 件目だけが残る。
    const fileNames = ["20250101000000.md", "20250908000000.md"];
    const result = computeDominantMilestoneShare(fileNames, fixtureMilestones);
    expect(result.denominator).toBe(1);
    expect(result.dominantLabel).toBe("社会復帰");
  });

  it("母数 0 のとき maxShare 0 / dominantLabel undefined を返す", () => {
    const result = computeDominantMilestoneShare([], fixtureMilestones);
    expect(result.denominator).toBe(0);
    expect(result.maxShare).toBe(0);
    expect(result.dominantLabel).toBeUndefined();
    expect(result.groups).toEqual([]);
  });

  it("count 同値のグループは label 昇順 (コードポイント順) で整列する (決定的)", () => {
    // サイト開設 1 件 / 社会復帰 1 件 (count 同値) を label 昇順で並べる。
    // コードポイント順でも「サイト開設」< 「社会復帰」が成立する。
    const fileNames = ["20250827000000.md", "20250908000000.md"];
    const result = computeDominantMilestoneShare(fileNames, fixtureMilestones);
    expect(result.groups).toEqual([
      { label: "サイト開設", count: 1 },
      { label: "社会復帰", count: 1 },
    ]);
  });

  it("同一 label・別 date の節目を併合せず、複合キーで別グループに分ける", () => {
    // 同じ label「復帰」を date 違いで 2 件登録する (id 無しでの取り違え検知)。
    // label 単独キーだと 1 グループ count=2 (= 偽陰性方向) に水増しされるが、
    // date + label 複合キーなら各 1 件の別グループになる。
    const dupLabelMilestones: readonly Milestone[] = [
      { date: "2025-08-26", label: "復帰", tone: "neutral" },
      { date: "2025-09-05", label: "復帰", tone: "light" },
    ];
    const fileNames = [
      "20250827000000.md", // 2025-08-26 の「復帰」のみ通過済み
      "20250908000000.md", // より新しい 2025-09-05 の「復帰」が支配
    ];
    const result = computeDominantMilestoneShare(fileNames, dupLabelMilestones);
    expect(result.denominator).toBe(2);
    // 併合されていれば groups は 1 件 (count=2) になるはず。複合キーなので 2 件。
    expect(result.groups).toEqual([
      { label: "復帰", count: 1 },
      { label: "復帰", count: 1 },
    ]);
    expect(result.maxShare).toBe(0.5);
  });
});
