/**
 * Anchor 再評価トリガー検知器 (Issue #840)
 *
 * 背景:
 * Issue #840 は「記事末尾に座標近接ベースの関連記事を出す」フィーチャを、
 * 現在の節目構成では PostNavigation (前後記事ナビ) の劣化コピーになるため
 * 見送った deferral-record である。座標近接が時系列近接とほぼ一致してしまう
 * 限り、関連記事は「前後記事」と直交せず、新しい価値を生まない。
 *
 * 本モジュールは **フィーチャ本体 (selectRelatedByCoordinate 等) を実装しない**。
 * 見送り判断の前提が崩れたことを機械的に検知する「トリガー検知器」だけを提供する。
 *
 * トリガーの定義:
 * - 各記事の「支配節目」= heavy 除外後、`daysSince >= 0` の節目 (= 通過済みの
 *   節目) のうち **daysSince 最小** (= 最後に通過した節目) を 1 つ選ぶ。
 * - 全記事を支配節目でグルーピングしたとき、最大グループが占める比率
 *   (max dominant-group share) を計算する。
 * - 実データ (記事 18 件 × 節目 3 件) では「社会復帰 14 件 (77.8%) /
 *   サイト開設 4 件 (22.2%)」で、最大支配グループ比率は約 77.8%。
 * - **再評価トリガー (主条件): 最大支配グループ比率が全記事の 50% 未満になったとき**。
 *   そのとき座標近接が時系列近接から分離し、関連付けが PostNavigation と
 *   直交しうるため、フィーチャを再評価する余地が生まれる。
 *
 * 設計方針:
 * - 純粋関数のみで構成し、モジュールスコープの可変状態を持たない
 *   (`anchors.ts` と同じ方針)。
 * - heavy は関連付け軸から除外する (`excludeTones: ["heavy"]`)。これは
 *   Coordinate (#491) / Resurface (#492) の「heavy は静かに隠す」ポリシーと
 *   整合する。
 */

import {
  computeCoordinates,
  type Coordinate,
  inferPublishedAt,
  type Milestone,
} from "./anchors";

/**
 * 支配節目選定時に関連付け軸から除外する tone。
 *
 * heavy (例: 休職開始 / 喪失体験) は感情的に重い節目であり、Coordinate /
 * Resurface と同様に関連付けの軸からは除外する。`computeCoordinates` の
 * `excludeTones` に渡すことで除外する。
 */
const EXCLUDED_TONES: readonly Milestone["tone"][] = ["heavy"];

/**
 * 1 記事の「支配節目」を選定する純粋関数。
 *
 * 支配節目 = heavy 除外後の Coordinate (= `daysSince >= 0` の通過済み節目;
 * `computeCoordinates` が未来の節目を除外済み) のうち **daysSince 最小**
 * (= 最後に通過した節目) を 1 つ選ぶ。
 *
 * **タイブレーク (決定的)**: daysSince が同値の節目が複数あるときは、
 * `milestones` の **入力順で先に現れた方** を採用する。`computeCoordinates` は
 * 入力 `milestones` の順序を保ったまま Coordinate を返す契約のため、戻り値配列を
 * 先頭から走査し「現在の最小より厳密に小さいときだけ更新する」ことで、同値時は
 * 先勝ち (= 入力順) になる。これにより同一入力に対して常に同じ結果を返す。
 *
 * @param publishedAt - 記事の公開日時 (ISO 8601 文字列)
 * @param milestones - 登録された節目の配列
 * @returns 支配節目に対応する Coordinate。heavy 除外後に通過済み節目が
 *   1 件も無い (= 非 heavy 座標 0 件) 場合は undefined
 */
export const selectDominantMilestone = (
  publishedAt: string,
  milestones: readonly Milestone[],
): Coordinate | undefined => {
  const coordinates = computeCoordinates(publishedAt, milestones, {
    excludeTones: EXCLUDED_TONES,
  });
  // 先頭要素を初期値に取り、残りを走査する。先頭が undefined (空配列) なら
  // 非 heavy の通過済み節目が無い = 支配節目なし。
  const [first, ...rest] = coordinates;
  if (first === undefined) {
    return undefined;
  }

  let dominant = first;
  for (const coordinate of rest) {
    // 厳密に小さいときだけ更新する (同値は更新しない = 入力順で先勝ち)
    if (coordinate.daysSince < dominant.daysSince) {
      dominant = coordinate;
    }
  }
  return dominant;
};

/**
 * 支配節目ごとの記事数 (グループ集計の 1 件)。
 */
export interface DominantMilestoneGroup {
  readonly label: string;
  readonly count: number;
}

/**
 * 最大支配グループ比率の計算結果。
 *
 * - `maxShare`: 最大支配グループが母数に占める比率 (0..1)。母数 0 のときは 0。
 * - `dominantLabel`: 最大支配グループの label (母数 0 のときは undefined)。
 * - `denominator`: 母数 (= 支配節目を 1 つ以上持つ記事数)。
 * - `groups`: 支配節目別の記事数。count 降順 → label 昇順で決定的に整列する。
 */
export interface DominantMilestoneShare {
  readonly maxShare: number;
  readonly dominantLabel: string | undefined;
  readonly denominator: number;
  readonly groups: readonly DominantMilestoneGroup[];
}

/**
 * 記事ファイル名群と節目から「最大支配グループ比率」を計算する純粋関数
 * (Issue #840 のトリガー検知の中核)。
 *
 * 各記事について `inferPublishedAt` で publishedAt を推定し、
 * `selectDominantMilestone` で支配節目を 1 つ選定する。支配節目を持つ記事を
 * その label でグルーピングし、最大グループの比率を返す。
 *
 * **母数 (denominator) の定義**: 「支配節目を 1 つ以上持つ記事」= 非 heavy 座標が
 * 1 件以上ある記事のみを母数に含める。以下は母数から除外する:
 * - `inferPublishedAt` がファイル名から publishedAt を推定できない記事
 * - heavy 除外後に通過済み節目が 0 件の記事 (= 全非 heavy 節目より前に公開)
 *
 * **タイブレーク (グループ整列)**: `groups` は count 降順、count 同値のときは
 * label 昇順 (辞書順) で整列する。`dominantLabel` / `maxShare` はこの整列後の
 * 先頭グループから決まるため、最大 count が同値のグループが複数あっても
 * label 昇順で決定的に 1 つに定まる。
 *
 * @param fileNames - 記事ファイル名 (例: `20250101120000.md`) の配列
 * @param milestones - 登録された節目の配列
 * @returns 最大支配グループ比率と内訳 (`DominantMilestoneShare`)
 */
export const computeDominantMilestoneShare = (
  fileNames: readonly string[],
  milestones: readonly Milestone[],
): DominantMilestoneShare => {
  const countByLabel = new Map<string, number>();
  let denominator = 0;

  for (const fileName of fileNames) {
    const publishedAt = inferPublishedAt(fileName);
    if (publishedAt === undefined) {
      continue;
    }
    const dominant = selectDominantMilestone(publishedAt, milestones);
    if (dominant === undefined) {
      continue;
    }
    denominator += 1;
    countByLabel.set(dominant.label, (countByLabel.get(dominant.label) ?? 0) + 1);
  }

  const groups: DominantMilestoneGroup[] = [...countByLabel.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label));

  const topGroup = groups[0];
  const maxShare =
    denominator === 0 || topGroup === undefined
      ? 0
      : topGroup.count / denominator;

  return {
    maxShare,
    dominantLabel: topGroup?.label,
    denominator,
    groups,
  };
};
