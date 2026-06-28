/**
 * Issue #840 再評価トリガー Tripwire (実データ追従)
 *
 * Issue #840 は「記事末尾に座標近接ベースの関連記事を出す」フィーチャを、
 * 現在の節目構成では PostNavigation (前後記事ナビ) の劣化コピーになるため
 * 見送った deferral-record である。本テストは **フィーチャ本体を検証しない**。
 * 見送り判断の前提 (= 支配節目が一極集中している) が崩れたことを機械的に
 * 検知する「トリガー検知器」として機能する。
 *
 * **3 経路の live な検知器** (詳細は anchorTriggers.ts 冒頭 JSDoc):
 * 1. **maxShare < 50%**: 支配節目を持つ記事のうち、最大支配グループ比率が 50%
 *    未満になったとき (座標近接が時系列近接から分離したサイン)。
 * 2. **母数乖離**: 母数 (支配節目を持つ記事数) が全記事数と乖離したとき
 *    (「全記事が支配節目を持つ」前提が崩れたサイン)。
 * 3. **非 heavy 節目 3 件化**: 非 heavy 節目が 3 件以上になり、経路 1 の
 *    maxShare メトリクスが有意化したとき。
 *
 * **なぜ経路 2・3 が要るか (経路 1 単独では検証器が死ぬ)**:
 * - 非 heavy 節目が現在 2 件 (サイト開設 / 社会復帰) しかない構造では、最大
 *   グループ比率は `top / (c1 + c2) >= 0.5` が **数学的に常に成立** する。つまり
 *   経路 1 (`maxShare >= 0.5`) は非 heavy 節目が 3 件以上になるまで vacuous (常に
 *   pass) で発火不能。経路 3 でその窓を埋める。
 * - 経路 1 の母数は「支配節目を持つ記事」であり「全記事」ではない。過去記事
 *   バックフィル等で全記事より少ない母数になると、全記事ベースでは 50% 未満でも
 *   経路 1 が silent pass しうる。経路 2 で母数乖離を能動的に検知する。
 *
 * 観測値 (2026-06 時点): 約 77.8% (社会復帰 14 件 / サイト開設 4 件 / 母数 18 件)。
 * 記事追加で陳腐化する具体数なので、観測時点付きの目安として記す。
 *
 * **凍結 fixture を使わない設計差分 (重要)**:
 * 同じ実記事を入力に取る `AnchorPage.allPosts.test.tsx` /
 * `Coordinate.allPosts.test.tsx` は、本番 milestones.json の改変で道連れ失敗
 * しないよう凍結 fixture (testMilestones) を使う。一方、本テストは
 * **トリガー検知器** であり、実データ (実 milestones.json + 実 datasources) の
 * 変化に追従して反応することそのものが目的である。そのため本番
 * `datasources/milestones.json` を直 import し、`import.meta.glob` で実記事を
 * 動的列挙する。これは `anchors.test.ts` / `milestones.semantic.test.ts` が
 * 本番 JSON を直 import している前例と整合する (= 実データの意味的変化を
 * 検知する責務を持つテストは実データを使う)。
 */

import { describe, expect, it } from "vitest";
import milestonesJson from "../../../datasources/milestones.json";
import {
  computeDominantMilestoneShare,
  countNonHeavyMilestones,
} from "../anchorTriggers";
import type { Milestone } from "../anchors";

/**
 * Issue #840 のトリガー閾値。
 *
 * 最大支配グループ比率がこの値を下回ると、座標近接が時系列近接から分離し、
 * 関連付けが PostNavigation と直交しうる = フィーチャ再評価の余地が生まれる。
 */
const TRIGGER_THRESHOLD = 0.5;

/**
 * 経路 3 の閾値。非 heavy 節目がこの件数以上になると maxShare メトリクス
 * (経路 1) が vacuous でなくなる (= 有意化する)。
 */
const NON_HEAVY_MILESTONE_TRIGGER = 3;

const milestones = milestonesJson as readonly Milestone[];

/**
 * datasources/*.md の実ファイル名を動的列挙する。記事の追加・削除に追従する。
 */
const postFilePaths = Object.keys(import.meta.glob("/datasources/*.md"));
const postFileNames = postFilePaths
  .map((path) => path.split("/").pop())
  .filter((name): name is string => typeof name === "string" && name.length > 0);

describe("Issue #840 再評価トリガー (実データ追従 Tripwire)", () => {
  it("datasources/*.md を 1 件以上取得できる (テスト前提の健全性)", () => {
    expect(postFileNames.length).toBeGreaterThanOrEqual(1);
  });

  it("本番 milestones.json を 1 件以上読み込める (テスト前提の健全性)", () => {
    expect(milestones.length).toBeGreaterThanOrEqual(1);
  });

  it("非 heavy 節目が 3 件未満を維持する (3 件以上なら maxShare メトリクスが有意化 = Issue #840 を再評価せよ)", () => {
    // 経路 3: 非 heavy 節目が 2 件しかない間は maxShare >= 50% が常に成立し
    // (vacuous)、経路 1 の検証は死んでいる。非 heavy 節目が 3 件以上になると
    // maxShare メトリクスが有意化するため、その構造変化をここで即検知する。
    const nonHeavyCount = countNonHeavyMilestones(milestones);
    expect(
      nonHeavyCount,
      `非 heavy 節目が ${nonHeavyCount} 件になり ${NON_HEAVY_MILESTONE_TRIGGER} 件以上に達した。` +
        `最大支配グループ < 50% メトリクス (経路 1) が vacuous でなくなり有意化した` +
        ` (#840 補助目安: 非 heavy 節目 5 件)。Issue #840 を再評価し、maxShare ` +
        `トリガーの有効化 / 閾値の見直しを行うこと。`,
    ).toBeLessThan(NON_HEAVY_MILESTONE_TRIGGER);
  });

  it("母数 (支配節目を持つ記事数) が全記事数と一致する (乖離したら #840 母数前提が崩れた = 再評価せよ)", () => {
    // 経路 2: maxShare の母数は「支配節目を持つ記事」であり「全記事」ではない。
    // 現状は全 .md が支配節目を持つため両者は一致する。過去記事バックフィル
    // (全非 heavy 節目より前の旧記事) や非 timestamp .md 混入で母数が glob 件数と
    // 乖離すると、全記事ベースでは 50% 未満でも maxShare が silent pass しうる。
    // ここで母数と全記事数の一致を invariant として固定し、乖離を能動的に検知する。
    const { denominator } = computeDominantMilestoneShare(
      postFileNames,
      milestones,
    );
    expect(
      denominator,
      `母数 (支配節目を持つ記事数=${denominator}) が全記事数 (${postFileNames.length}) と乖離した。` +
        `#840 メトリクスの母数前提 (全記事が支配節目を持つ) が崩れたため、` +
        `maxShare が全記事ベースで偽陰性になりうる。母数定義と Issue #840 ` +
        `トリガーを再評価すること。`,
    ).toBe(postFileNames.length);
  });

  it("最大支配グループ比率が 50% 以上を維持する (50% 未満なら Issue #840 のトリガー発火 = 関連記事フィーチャを再評価せよ)", () => {
    const { maxShare, dominantLabel, denominator, groups } =
      computeDominantMilestoneShare(postFileNames, milestones);

    // 母数 (支配節目を持つ記事数) が 0 だと比率が意味を持たないため前提を固定する
    expect(denominator).toBeGreaterThanOrEqual(1);

    // 失敗時に現状の分布が読めるよう診断メッセージへ内訳を載せる
    const distribution = groups
      .map((group) => `${group.label}=${group.count}`)
      .join(", ");
    expect(
      maxShare,
      `Issue #840 トリガー発火の可能性: 最大支配グループ比率 ${(maxShare * 100).toFixed(1)}% が閾値 ${(TRIGGER_THRESHOLD * 100).toFixed(0)}% を下回った。` +
        `支配節目が一極集中しなくなり、座標近接が時系列近接 (PostNavigation) から分離した可能性がある。` +
        `関連記事フィーチャ (Issue #840) を再評価すること。` +
        ` [dominant=${dominantLabel ?? "なし"} / 母数=${denominator} / 内訳: ${distribution}]`,
    ).toBeGreaterThanOrEqual(TRIGGER_THRESHOLD);
  });
});
