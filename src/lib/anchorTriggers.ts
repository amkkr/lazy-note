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
 * トリガーの定義 (3 経路の live な検知器):
 * 1. **maxShare < 50%**: 各記事の「支配節目」(heavy 除外後、`daysSince >= 0` の
 *    節目のうち daysSince 最小 = 最後に通過した節目) でグルーピングしたとき、
 *    最大グループが占める比率 (max dominant-group share) が 50% 未満になったとき。
 *    座標近接が時系列近接から分離し、関連付けが PostNavigation と直交しうる。
 * 2. **母数乖離**: 母数 (支配節目を持つ記事数) が全記事数と乖離したとき。
 *    過去記事バックフィル等で「全記事が支配節目を持つ」前提が崩れたサイン。
 * 3. **非 heavy 節目 3 件化**: 後述の `countNonHeavyMilestones` を参照。
 *    maxShare メトリクスが有意化する構造変化を検知する。
 *
 * **maxShare が現状 vacuous である問題 (= 経路 3 が必要な理由)**:
 * 非 heavy 節目が現在 2 件 (サイト開設 / 社会復帰) しかない構造では、最大グループ
 * 比率は `top / (c1 + c2) >= 0.5` が **数学的に常に成立** する (完全二分 9:9 で
 * ちょうど 0.5 でも >= 0.5)。つまり経路 1 (maxShare < 50%) は非 heavy 節目が
 * 3 件以上にならない限り構造的に発火不能 (vacuous) であり、検証器としては死ぬ。
 * 経路 3 (`countNonHeavyMilestones` の tripwire) はこの「窓」を埋め、メトリクスが
 * 有意化する瞬間 (非 heavy 節目 3 件化) を即検知する二段構えである。
 *
 * 観測値 (2026-06 時点 / 記事 18 件 × 節目 3 件): 支配節目分布は「社会復帰
 * 14 件 / サイト開設 4 件」で、最大支配グループ比率は約 77.8%。記事追加で
 * 陳腐化する具体数なので、この値はアサートせず観測時点付きの目安として残す。
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
 * heavy を除いた節目 (= 関連付け軸に乗る節目) の件数を返す純粋関数。
 *
 * **存在意義 (dead tripwire 対策)**: 非 heavy 節目が 2 件しかない構造では
 * `computeDominantMilestoneShare` の `maxShare >= 0.5` 検証が vacuous (常に成立)
 * になり死ぬ (モジュール冒頭 JSDoc 参照)。本関数を使った tripwire
 * (`countNonHeavyMilestones(milestones) < 3`) で「非 heavy 節目が 3 件以上に
 * なった = maxShare メトリクスが有意化した」構造変化を即検知し、maxShare 検証の
 * 死角を埋める二段構えを成立させる。
 *
 * @param milestones - 登録された節目の配列
 * @returns heavy 以外の tone を持つ節目の件数
 */
export const countNonHeavyMilestones = (
  milestones: readonly Milestone[],
): number =>
  milestones.filter((milestone) => !EXCLUDED_TONES.includes(milestone.tone))
    .length;

/**
 * 1 記事の「支配節目」を選定する純粋関数。
 *
 * 支配節目 = heavy 除外後の通過済み節目 (= `daysSince >= 0`; `computeCoordinates`
 * が未来の節目を除外済み) のうち **daysSince 最小** (= 最後に通過した節目) を
 * 1 つ選ぶ。グルーピングで個体を識別できるよう、戻り値は Coordinate (label/tone/
 * daysSince のみで date 同一性を持たない) ではなく、元の `Milestone` (date を含む)
 * を返す。
 *
 * **タイブレーク (決定的)**: daysSince が同値の節目が複数あるときは、
 * `milestones` の **入力順で先に現れた方** を採用する。入力順に走査し「現在の
 * 最小より厳密に小さいときだけ更新する」ことで同値時は先勝ち (= 入力順) になり、
 * 同一入力に対して常に同じ結果を返す。
 *
 * **前提契約 (publishedAt)**: `publishedAt` は **有効な ISO 8601 文字列** である
 * こと。内部で呼ぶ `computeCoordinates` → `toJstCalendarDate` は不正値で throw
 * する契約のため。本トリガー検知経路は `inferPublishedAt` の戻り値 (= 妥当な
 * ISO 8601、推定不能なら呼び出し側で除外済み) のみを渡すため安全である。
 *
 * @param publishedAt - 記事の公開日時 (有効な ISO 8601 文字列)
 * @param milestones - 登録された節目の配列
 * @returns 支配節目 (元の `Milestone`)。heavy 除外後に通過済み節目が
 *   1 件も無い (= 非 heavy 座標 0 件) 場合は undefined
 */
export const selectDominantMilestone = (
  publishedAt: string,
  milestones: readonly Milestone[],
): Milestone | undefined => {
  let dominant: Milestone | undefined;
  let dominantDays = Number.POSITIVE_INFINITY;

  for (const milestone of milestones) {
    // 共有エンジン computeCoordinates を単一節目に適用し、heavy 除外 / 未来除外 /
    // daysSince 算出のロジック重複を避けつつ、節目との対応 (= date 同一性) を保つ。
    const [coordinate] = computeCoordinates(publishedAt, [milestone], {
      excludeTones: EXCLUDED_TONES,
    });
    if (coordinate === undefined) {
      continue;
    }
    // 厳密に小さいときだけ更新する (同値は更新しない = 入力順で先勝ち)
    if (coordinate.daysSince < dominantDays) {
      dominant = milestone;
      dominantDays = coordinate.daysSince;
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
 * - `groups`: 支配節目別の記事数。count 降順 → label 昇順 → date 昇順で決定的に
 *   整列する。
 */
export interface DominantMilestoneShare {
  readonly maxShare: number;
  readonly dominantLabel: string | undefined;
  readonly denominator: number;
  readonly groups: readonly DominantMilestoneGroup[];
}

/**
 * ロケール非依存のコードポイント順比較。
 *
 * `String.prototype.localeCompare` は実行環境のロケール / ICU 実装に依存して
 * 結果が変わりうるため、決定的整列が要件のグループ整列ではコードポイント比較を
 * 使う。
 */
const compareByCodePoint = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

/**
 * 集計途中の支配節目グループ (内部表現)。
 *
 * 表示用の `label` に加え、グルーピングキーと整列の最終タイブレークに使う
 * `date` を保持する。`count` は集計中に加算するため可変。
 */
interface MutableDominantGroup {
  readonly label: string;
  readonly date: string;
  count: number;
}

/**
 * 記事ファイル名群と節目から「最大支配グループ比率」を計算する純粋関数
 * (Issue #840 のトリガー検知の中核)。
 *
 * 各記事について `inferPublishedAt` で publishedAt を推定し、
 * `selectDominantMilestone` で支配節目を 1 つ選定する。支配節目を持つ記事を
 * グルーピングし、最大グループの比率を返す。
 *
 * **グルーピングキー (date + label の複合)**: `Milestone` 型に id が無いため、
 * 表示用の `label` 単独をキーにすると、将来 milestones.json に **同一 label の
 * 別節目** (date 違い) が登録されたとき本来別グループの記事が併合され count が
 * 水増しされる (= maxShare 上振れ = 偽陰性方向)。これを防ぐためキーは
 * `date` + `label` の複合とする。
 *
 * **母数 (denominator) の定義**: 「支配節目を 1 つ以上持つ記事」= 非 heavy 座標が
 * 1 件以上ある記事のみを母数に含める。以下は母数から除外する:
 * - `inferPublishedAt` がファイル名から publishedAt を推定できない記事
 * - heavy 除外後に通過済み節目が 0 件の記事 (= 全非 heavy 節目より前に公開)
 *
 * したがって `maxShare` は **「全記事のうち」ではなく「支配節目を持つ記事のうち」**
 * の最大グループ比率である。現状は全 `.md` が支配節目を持つため両者は一致するが、
 * 過去記事バックフィル等で乖離しうる。母数が全記事数と一致するかどうかは
 * 呼び出し側 (Tripwire) で別途 invariant としてアサートする。
 *
 * **タイブレーク (グループ整列)**: `groups` は count 降順、count 同値なら
 * label 昇順 (コードポイント順)、さらに同値なら date 昇順で整列する。
 * `dominantLabel` / `maxShare` はこの整列後の先頭グループから決まるため、
 * 最大 count が同値のグループが複数あっても決定的に 1 つに定まる。
 *
 * @param fileNames - 記事ファイル名 (例: `20250101120000.md`) の配列
 * @param milestones - 登録された節目の配列
 * @returns 最大支配グループ比率と内訳 (`DominantMilestoneShare`)
 */
export const computeDominantMilestoneShare = (
  fileNames: readonly string[],
  milestones: readonly Milestone[],
): DominantMilestoneShare => {
  const groupByKey = new Map<string, MutableDominantGroup>();
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
    // date + label の複合キーで同一 label・別 date の節目併合を防ぐ
    const key = `${dominant.date} ${dominant.label}`;
    const existing = groupByKey.get(key);
    if (existing === undefined) {
      groupByKey.set(key, {
        label: dominant.label,
        date: dominant.date,
        count: 1,
      });
    } else {
      existing.count += 1;
    }
  }

  const groups: DominantMilestoneGroup[] = [...groupByKey.values()]
    .sort(
      (a, b) =>
        b.count - a.count ||
        compareByCodePoint(a.label, b.label) ||
        compareByCodePoint(a.date, b.date),
    )
    .map(({ label, count }) => ({ label, count }));

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
