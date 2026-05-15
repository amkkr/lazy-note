/**
 * Resurface (再浮上) 選定ロジック
 *
 * 設計書: epic #487 / Issue #492 (N-5)
 *
 * Anchor の3つの顔のひとつ「Resurface」の純粋関数を提供する。
 *
 * - HomePage に独立スロットを設け、過去記事を1件浮上させる
 * - 「投稿頻度」「投稿間隔」の "抽象指標" は一切表示しない (Pulse を切った思想)
 * - 純粋関数のみで構成し、時刻ソースは引数 `today` (YYYY-MM-DD JST) で注入する
 * - anchors.ts の `inferPublishedAt` を再利用して post.id (= ファイル名) から
 *   ISO 8601 publishedAt を解決する
 *
 * 優先順位 (Issue #492 AC):
 *   (1) 沈黙トリガー: 最後の投稿から N 日以上経過していれば発火し、
 *       1年前の同月同日記事 → 最古記事 の順で浮上対象を選ぶ
 *   (2) 暦の節目: 沈黙でないとき、今日と同月同日の過去記事 (1年前/2年前...) を浮上
 *   (3) 座標上の意味: 暦の節目もないとき、節目からちょうど N 年経過した日に
 *       書かれた記事 (= 節目記念日) を浮上。tone:heavy は除外する (Coordinate と同等)
 *   (4) どれも該当しない → null (スロット非表示)
 *
 * 「沈黙時に過去の声を差し出す」=「忘れていた自分の声」=「単純に古い記事 / 1年前の自分」
 * の方が「重い節目近辺の記事」よりも回復的に働くため、沈黙時は 1年前 → 最古 の順で選ぶ。
 */

import { inferPublishedAt, type Milestone } from "./anchors";
import type { PostSummary } from "./markdown";

/**
 * 沈黙トリガーのデフォルトしきい値 (日数)。
 *
 * 30 日 (≒ 1 ヶ月) は「明らかな沈黙」と「通常の運用ペース」を分ける境界として採用。
 *
 * 過去16記事 (= 15 区間) の投稿間隔の実分布:
 *   - 中央値: 10 日
 *   - 平均:   12.87 日
 *   - 最大:   42 日
 *   - 30 日以上の頻度: 15 区間中 1 回 (6.7%)
 *
 * 30 日は「最大値 42 日」に近い境界 (最大の 7 割強) であり、通常運用では稀にしか
 * 到達しない値であるため、「明らかな沈黙」として扱うのに妥当。同時に「中央値 10 日」
 * の 3 倍に相当し、平均 12.87 日からも 2 倍以上離れているため、ノイズではなく
 * "運用ペースから外れた沈黙" と評価できる。
 *
 * マジックナンバーをハードコードしないために定数として export し、N-6 (/anchor
 * ページ) や将来の調整でも単一の出所からアクセスする。
 *
 * 上書きは `selectResurfaced` の `options.silenceThresholdDays` で行う。
 */
export const SILENCE_THRESHOLD_DAYS = 30;

/**
 * Resurface の理由 (浮上の根拠)。
 *
 * - kind: "silence"    沈黙トリガー (最後の投稿から N 日以上経過)
 *   - lastPostDaysAgo: 最後の投稿から today までの経過日数 (表示には使わない、ロジック検証用)
 *   - sub: "yearAgo"   1年前の同月同日記事を浮上
 *          "oldest"    1年前候補が無く、最古記事を浮上
 * - kind: "calendar"   暦の節目 (今日と同月同日の過去記事)
 *   - yearsAgo: 何年前の記事か (1年前なら 1)
 * - kind: "milestoneAnniversary" 節目記念日 (節目からちょうど N 年経過の日に書かれた記事)
 *   - label: 節目ラベル (例: "社会復帰")
 *   - yearsSinceMilestone: 節目から記事までの経過年数 (1年なら 1)
 *
 * 注意: lastPostDaysAgo は内部仕様としてロジック検証のために保持するが、
 * UI 側ではこの数値を **表示してはならない** (Pulse 思想)。reason.kind と
 * sub / yearsAgo / label のみが UI 表示の根拠となる。
 */
export type ResurfaceReason =
  | {
      readonly kind: "silence";
      readonly lastPostDaysAgo: number;
      readonly sub: "yearAgo" | "oldest";
    }
  | {
      readonly kind: "calendar";
      readonly yearsAgo: number;
    }
  | {
      readonly kind: "milestoneAnniversary";
      readonly label: string;
      readonly yearsSinceMilestone: number;
    };

/**
 * 浮上対象の記事と理由のペア。
 *
 * UI 側 (Resurface.tsx) はこの型を受け取り、null チェックで非表示判定、
 * reason の `kind` で文脈ラベル ("1 年前の今日" 等) を選び分ける。
 */
export interface ResurfacedEntry {
  readonly post: PostSummary;
  readonly reason: ResurfaceReason;
}

/**
 * オプション。
 *
 * - silenceThresholdDays: 沈黙トリガーのしきい値日数の上書き (省略時は SILENCE_THRESHOLD_DAYS)
 * - excludeIds: 浮上対象から除外する post.id のリスト。
 *
 * `excludeIds` の用途 (致命: View Transition `view-transition-name` 重複回避):
 *   HomePage では新着セクション (Featured / Bento / Index) で既に `view-transition-name:
 *   post-{id}` を付与しているため、Resurface に同じ post.id を浮上させると DOM 内で
 *   同名 transition が 2 か所に同時宣言される。Chrome の View Transitions API は
 *   重複時に "Unexpected duplicate view-transition-name" エラーで transition 全体を
 *   abort するため (= 「最後の宣言が勝つ」のではない)、記事 → HomePage 戻り遷移の
 *   Hero morph が壊れる。
 *
 *   呼び出し側で「現在表示中の posts.id」を `excludeIds` に渡すことで、Resurface 候補
 *   から強制的に除外し名前衝突を防ぐ。
 */
export interface SelectResurfacedOptions {
  readonly silenceThresholdDays?: number;
  readonly excludeIds?: readonly string[];
}

/**
 * publishedAt 解決済み (= inferPublishedAt が成功した) 記事のメタ情報。
 *
 * - publishedDate: JST 暦上の年月日のみ (時分秒は捨てる)
 */
interface ResolvedPost {
  readonly post: PostSummary;
  readonly publishedDate: Date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * YYYY-MM-DD 文字列を JST 暦上の Date (UTC 基準で時分秒 0) に変換する。
 *
 * - 不正な形式の場合は null を返す
 * - 日数差の計算用 (時刻は捨てる)
 */
const toCalendarDate = (date: string): Date | null => {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  const utcMs = Date.UTC(Number(year), Number(month) - 1, Number(day));
  if (!Number.isFinite(utcMs)) {
    return null;
  }
  return new Date(utcMs);
};

/**
 * ISO 8601 文字列を JST 暦上の Date に変換する (時分秒は捨てて JST 暦日のみ保持)。
 *
 * anchors.ts の同名 private 関数 (toJstCalendarDate) と同じ挙動だが、ファイル分離
 * のため再実装する (anchors.ts の private を export しない方針)。
 */
const isoToCalendarDate = (isoDateTime: string): Date | null => {
  const time = Date.parse(isoDateTime);
  if (!Number.isFinite(time)) {
    return null;
  }
  // JST (+09:00) オフセットを加えて UTC として年月日を取り出すことで、
  // JST 上のカレンダー日付を表現する Date インスタンスを生成する
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const jstShifted = new Date(time + jstOffsetMs);
  return new Date(
    Date.UTC(
      jstShifted.getUTCFullYear(),
      jstShifted.getUTCMonth(),
      jstShifted.getUTCDate(),
    ),
  );
};

/**
 * 2 つの JST カレンダー日付の差分日数を返す (target - origin)。
 */
const diffInDays = (origin: Date, target: Date): number => {
  return Math.round((target.getTime() - origin.getTime()) / MS_PER_DAY);
};

/**
 * 投稿群のうち inferPublishedAt 解決に成功したものだけを抽出し、
 * publishedDate (JST 暦) を付与して新しい順 (新→古) でソートする。
 */
const resolveAndSortPosts = (posts: readonly PostSummary[]): ResolvedPost[] => {
  const resolved: ResolvedPost[] = [];
  for (const post of posts) {
    // post.id がそのままファイル名のタイムスタンプ部 (例: 20260307120000) として
    // anchors.ts の inferPublishedAt に渡せる。.md 拡張子はあっても無くても良い。
    const publishedAt = inferPublishedAt(post.id);
    if (publishedAt === null) {
      continue;
    }
    const publishedDate = isoToCalendarDate(publishedAt);
    if (publishedDate === null) {
      continue;
    }
    resolved.push({ post, publishedDate });
  }
  // 新→古 にソート (最新が 0 番目)
  return resolved.sort(
    (a, b) => b.publishedDate.getTime() - a.publishedDate.getTime(),
  );
};

/**
 * 候補リストから「today と同月同日」の最も新しい年の記事を 1 件選ぶ。
 *
 * - 同月同日 = JST 暦上の (月, 日) が today と一致
 * - 同月同日のものが複数年あれば、yearsAgo (= today.year - post.year) が
 *   最も小さい (= 最も新しい年) を選ぶ
 * - yearsAgo >= 1 のもののみ (今日以前の過去記事)
 *
 * @returns {{ resolved, yearsAgo } | null}
 */
const pickSameMonthDay = (
  candidates: readonly ResolvedPost[],
  todayDate: Date,
): { readonly resolved: ResolvedPost; readonly yearsAgo: number } | null => {
  const todayMonth = todayDate.getUTCMonth();
  const todayDay = todayDate.getUTCDate();
  const todayYear = todayDate.getUTCFullYear();

  let best: { resolved: ResolvedPost; yearsAgo: number } | null = null;
  for (const r of candidates) {
    const postMonth = r.publishedDate.getUTCMonth();
    const postDay = r.publishedDate.getUTCDate();
    const postYear = r.publishedDate.getUTCFullYear();

    if (postMonth !== todayMonth || postDay !== todayDay) {
      continue;
    }
    const yearsAgo = todayYear - postYear;
    if (yearsAgo < 1) {
      continue;
    }
    // 最も新しい年 = yearsAgo が最小
    if (best === null || yearsAgo < best.yearsAgo) {
      best = { resolved: r, yearsAgo };
    }
  }
  return best;
};

/**
 * 1 つの (記事, 節目) ペアに対し、節目記念日として一致するかを評価する純粋関数。
 *
 * - tone:heavy の節目は対象外 (Coordinate と同等の取り扱い)
 * - 節目の月日と記事の月日が一致し、かつ節目→記事の年差が 1 以上
 * - 不正な節目日付 (toCalendarDate が null) は無効として除外
 *
 * @returns 一致時の yearsSinceMilestone, それ以外は null
 */
const matchMilestoneAnniversary = (
  resolved: ResolvedPost,
  milestone: Milestone,
): number | null => {
  if (milestone.tone === "heavy") {
    return null;
  }
  const mDate = toCalendarDate(milestone.date);
  if (mDate === null) {
    return null;
  }
  const postMonth = resolved.publishedDate.getUTCMonth();
  const postDay = resolved.publishedDate.getUTCDate();
  if (mDate.getUTCMonth() !== postMonth || mDate.getUTCDate() !== postDay) {
    return null;
  }
  const postYear = resolved.publishedDate.getUTCFullYear();
  const yearsSinceMilestone = postYear - mDate.getUTCFullYear();
  if (yearsSinceMilestone < 1) {
    return null;
  }
  return yearsSinceMilestone;
};

/**
 * 候補リストから「節目からちょうど N 年経過した日」に書かれた記事を 1 件選ぶ。
 *
 * - 節目の (月, 日) が記事の (月, 日) と一致
 * - 節目年から記事年までの差 (= yearsSinceMilestone) が 1 以上
 * - tone:heavy の節目は除外 (Coordinate と同等の取り扱い)
 * - 複数候補があれば最も新しい記事 (resolved リストの先頭側) を選ぶ
 *
 * @returns 該当があれば { resolved, label, yearsSinceMilestone }, 無ければ null
 */
const pickMilestoneAnniversary = (
  candidates: readonly ResolvedPost[],
  milestones: readonly Milestone[],
): {
  readonly resolved: ResolvedPost;
  readonly label: string;
  readonly yearsSinceMilestone: number;
} | null => {
  for (const r of candidates) {
    for (const milestone of milestones) {
      const yearsSinceMilestone = matchMilestoneAnniversary(r, milestone);
      if (yearsSinceMilestone === null) {
        continue;
      }
      return {
        resolved: r,
        label: milestone.label,
        yearsSinceMilestone,
      };
    }
  }
  return null;
};

/**
 * Resurface の浮上対象を選定する純粋関数。
 *
 * 優先順位:
 *   (1) 沈黙トリガー (最後の投稿から N 日以上経過)
 *       → 1年前の同月同日記事 / 最古記事 の順で選定
 *   (2) 暦の節目 (今日と同月同日の過去記事)
 *   (3) 座標上の意味 (節目記念日 = 節目からちょうど N 年経過した日の記事)
 *   (4) どれも該当しない → null
 *
 * @param posts - 全記事の PostSummary 配列 (順序不問、内部で publishedAt 解決順に並び替える)
 * @param milestones - 登録された節目の配列 (空配列許可)
 * @param today - 今日の日付 (YYYY-MM-DD, JST 想定)
 * @param options - しきい値の上書き / View Transition 衝突回避用の excludeIds 等
 * @returns 浮上対象とその理由、または null (スロット非表示)
 */
export const selectResurfaced = (
  posts: readonly PostSummary[],
  milestones: readonly Milestone[],
  today: string,
  options: SelectResurfacedOptions = {},
): ResurfacedEntry | null => {
  const todayDate = toCalendarDate(today);
  if (todayDate === null) {
    return null;
  }

  const threshold = options.silenceThresholdDays ?? SILENCE_THRESHOLD_DAYS;
  // excludeIds は配列で受け取り、O(1) 探索のために Set に変換する。
  // 空配列ないし undefined を渡された場合は空 Set として扱う (全候補が有効)。
  const excludeIdSet = new Set<string>(options.excludeIds ?? []);

  // publishedAt 解決済み記事を新→古 で並べる
  const resolved = resolveAndSortPosts(posts);
  if (resolved.length === 0) {
    return null;
  }

  const newest = resolved[0];
  // newest を浮上対象として選ぶことは設計上ない (最新は Featured で既に表示されているため
  // Resurface には「過去の声」しか出さない)。さらに、HomePage で既に表示中の post (id) を
  // 除外することで View Transition `view-transition-name` の重複衝突を回避する
  // (excludeIds の責務、SelectResurfacedOptions の JSDoc を参照)。
  //
  // 注意: pastCandidates は resolveAndSortPosts の戻り値である ResolvedPost[] を維持する
  // ため、ここで filter する。post.id は string 比較で十分 (id はファイル名タイムスタンプ)。
  const pastCandidates = resolved
    .slice(1)
    .filter((r) => !excludeIdSet.has(r.post.id));

  // (1) 沈黙トリガー判定
  const lastPostDaysAgo = diffInDays(newest.publishedDate, todayDate);
  const isSilence = lastPostDaysAgo >= threshold;

  if (isSilence) {
    if (pastCandidates.length === 0) {
      // 過去候補が無い (= 全候補が excludeIds に含まれている等) 場合、浮上できない。
      // 最新自身は選ばない方針 (Resurface は「過去の声」のみを差し出すため)。
      return null;
    }

    // 沈黙時の選定: 1年前の同月同日 → 最古
    const yearAgo = pickSameMonthDay(pastCandidates, todayDate);
    if (yearAgo !== null && yearAgo.yearsAgo === 1) {
      return {
        post: yearAgo.resolved.post,
        reason: {
          kind: "silence",
          lastPostDaysAgo,
          sub: "yearAgo",
        },
      };
    }

    // 1年前候補が無ければ最古記事 (resolved の末尾)
    const oldest = pastCandidates[pastCandidates.length - 1];
    return {
      post: oldest.post,
      reason: {
        kind: "silence",
        lastPostDaysAgo,
        sub: "oldest",
      },
    };
  }

  // (2) 暦の節目: 今日と同月同日の過去記事 (沈黙でないとき)
  const calendarHit = pickSameMonthDay(pastCandidates, todayDate);
  if (calendarHit !== null) {
    return {
      post: calendarHit.resolved.post,
      reason: {
        kind: "calendar",
        yearsAgo: calendarHit.yearsAgo,
      },
    };
  }

  // (3) 節目記念日 (節目からちょうど N 年経過した日に書かれた記事)
  const milestoneHit = pickMilestoneAnniversary(pastCandidates, milestones);
  if (milestoneHit !== null) {
    return {
      post: milestoneHit.resolved.post,
      reason: {
        kind: "milestoneAnniversary",
        label: milestoneHit.label,
        yearsSinceMilestone: milestoneHit.yearsSinceMilestone,
      },
    };
  }

  // (4) どれも該当しない
  return null;
};
