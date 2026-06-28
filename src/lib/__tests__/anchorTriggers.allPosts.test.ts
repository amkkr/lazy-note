/**
 * Issue #840 再評価トリガー Tripwire (実データ追従)
 *
 * Issue #840 は「記事末尾に座標近接ベースの関連記事を出す」フィーチャを、
 * 現在の節目構成では PostNavigation (前後記事ナビ) の劣化コピーになるため
 * 見送った deferral-record である。本テストは **フィーチャ本体を検証しない**。
 * 見送り判断の前提 (= 支配節目が一極集中している) が崩れたことを機械的に
 * 検知する「トリガー検知器」として機能する。
 *
 * トリガー (主条件): 最大支配グループ比率が全記事の 50% 未満になったとき。
 * 現在は約 77.8% (社会復帰 14 件 / サイト開設 4 件 / 母数 18 件) で、50% を
 * 大きく上回っている。この値が 50% 未満まで下がると本テストが fail し、
 * 「Issue #840 のトリガーが発火した可能性 → 関連記事フィーチャを再評価せよ」と
 * 気づける設計。
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
import { computeDominantMilestoneShare } from "../anchorTriggers";
import type { Milestone } from "../anchors";

/**
 * Issue #840 のトリガー閾値。
 *
 * 最大支配グループ比率がこの値を下回ると、座標近接が時系列近接から分離し、
 * 関連付けが PostNavigation と直交しうる = フィーチャ再評価の余地が生まれる。
 */
const TRIGGER_THRESHOLD = 0.5;

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
