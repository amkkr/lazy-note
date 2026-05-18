/**
 * datasources/milestones.json の意味的スナップショットテスト (Issue #615)
 *
 * 背景:
 * 既存の `anchors.test.ts` (Issue #489 AC 群) は本番 `milestones.json` を
 * 入力にした統合テストを持つが、検証範囲は「型 / 値域 / NaN / 例外なし」
 * までで、label 名や date の意味的整合は誰も検証していなかった。
 * その結果、例えば `"サイト開設"` を `"blog 開設"` にリネームしても
 * 全テストが silent pass してしまう状態だった (PR #612 独立 DA レビュー
 * Moderate 反論より)。
 *
 * 本ファイルは本番 `milestones.json` の **全 milestone** を
 * `{ date, label, tone }` の期待値 fixture として固定し、rename / 日付変更
 * を明示的にテスト failure として検知することを目的とする。
 *
 * 更新ルール:
 * 本番 `datasources/milestones.json` を意図的に更新した場合は、本ファイルの
 * `EXPECTED_MILESTONES` も同時に書き直すこと。`toEqual` は順序も比較するため、
 * 配列順は本番 JSON と完全に一致させる。
 *
 * 非スコープ:
 * - ランタイム schema 検証 (型 / 値域 / tone enum) は Issue #547 で
 *   `src/lib/milestonesSchema.ts` (`parseMilestones` / `validateMilestonesStrict`)
 *   として inline 自作実装済み (Zod 等の外部ライブラリは CLAUDE.md
 *   「外部ライブラリの追加は原則しない」に従い不採用)。
 *   本ファイルは schema 検証では捕まらない「label rename / 日付変更 / tone 変更」
 *   という意味的変更を検知する責務に特化する。
 */

import { describe, expect, it } from "vitest";
import milestonesJson from "../../../datasources/milestones.json";
import type { Milestone } from "../anchors";

/**
 * 注意: 本ファイルの EXPECTED_MILESTONES は本番 milestones.json と同一の inline fixture。
 * 共通化すると silent pass リスクが復活する (冒頭 JSDoc の「背景」参照:
 * rename / 日付変更 / tone 変更を inline fixture で固定することで silent pass を
 * 防ぐ意図) ため意図的に重複させているが、milestone 件数が 5 件 (目安) を超えた
 * 場合は以下の代替案を再評価する。「5 件」は現状 3 件、本ファイル内の inline fixture
 * 視認性の境界として目安に設定したもので、厳密な閾値ではない。
 *
 * - 案 1: src/test/fixtures/expectedMilestones.ts に外出しし、Coordinate.allPosts.test.tsx /
 *   AnchorPage.allPosts.test.tsx の testMilestones から再利用 (silent pass リスクは残るが
 *   メンテ負荷削減)。
 *   ただし案 1 を選ぶ場合、「本番 JSON と意味的にずれていないか」を inline fixture で
 *   検証する本ファイルの設計思想自体が成立しなくなるため、本ファイルの存在意義自体を
 *   再検討する必要がある (fixture を共有した時点で、本番 JSON 更新と fixture 更新が
 *   同じ PR で必ず連動する保証が失われる)。
 * - 案 2: Issue #547 で実装済みの validateMilestonesStrict (src/lib/milestonesSchema.ts) を
 *   milestones.semantic.test.ts 側で活用し、本番 milestones.json を直接 strict 検証することで
 *   fixture を廃止する (Issue #547 はランタイム schema 検証として完了済み。ただし strict 検証は
 *   型 / 値域 / tone enum のみを担保し、label rename や日付変更は検知できないため、
 *   本ファイルの意味的スナップショット責務をそのまま代替できるわけではない。
 *   テスト側への適用は別途検討)。
 *
 * (Issue #631 / PR #628 / Issue #615 follow-up)
 */
const EXPECTED_MILESTONES: readonly Milestone[] = [
  {
    date: "2025-08-05",
    label: "休職開始",
    tone: "heavy",
  },
  {
    date: "2025-08-26",
    label: "サイト開設",
    tone: "neutral",
  },
  {
    date: "2025-09-05",
    label: "社会復帰",
    tone: "light",
  },
];

/**
 * 3 ケース構成の意図 (DA レビュー M-1 への応答):
 * 全件 `toEqual` が pass すれば件数 / 順序ケースは構造的に必ず pass するため、
 * 形式的には冗長な従属関係にある。しかし fail 時の **局所診断性** を優先して
 * 意図的に分離している。全件 `toEqual` の diff は配列全体を吐くため
 * 「件数だけずれた」「順序だけずれた」を一目で切り分けにくいが、
 * 件数 / 順序ケースが独立に fail すれば原因種別が即特定できる。
 */
describe("datasources/milestones.json 意味的スナップショット (Issue #615)", () => {
  const actualMilestones = milestonesJson as readonly Milestone[];

  it("milestones.json の全件が固定された期待値と完全一致する (rename / 日付変更 / tone 変更を検知できる)", () => {
    expect(actualMilestones).toEqual(EXPECTED_MILESTONES);
  });

  it("milestones.json の件数が固定された期待値と一致する (追加 / 削除を検知できる)", () => {
    expect(actualMilestones.length).toBe(EXPECTED_MILESTONES.length);
  });

  it("milestones.json の配列順序が固定された期待値と一致する (並び替えを検知できる)", () => {
    const actualDates = actualMilestones.map((m) => m.date);
    const expectedDates = EXPECTED_MILESTONES.map((m) => m.date);
    expect(actualDates).toEqual(expectedDates);
  });
});
