/**
 * 個人史座標エンジン (Anchor 機能の土台)
 *
 * 設計書: epic #487 / Issue #488
 *
 * - 純粋関数のみで構成し、モジュールスコープの可変状態を持たない
 * - publishedAt はファイル名 (`YYYYMMDDhhmmss.md`) から ISO 8601 (JST +09:00 固定)
 *   を推定する純粋関数で解決する。`meta.ts` (parseMetaSection/createDefaultMeta)
 *   は死蔵モジュール扱いで import しない (Anchor は meta.ts に一切触れない方針)
 * - 「座標」(層1=computeCoordinates) と「経過」(層2=computeElapsed) を
 *   別関数・別型として命名区別する
 * - status / tags / updatedAt は本モジュールの出力に露出させない
 */

/**
 * 節目の感情トーン
 *
 * - neutral: 中立な事実 (例: サイト開設)
 * - light: 軽めの節目 (例: 復帰、節目イベント)
 * - heavy: 重い節目 (例: 喪失体験など)。Coordinate 表示には出さない方針
 */
export type MilestoneTone = "neutral" | "light" | "heavy";

/**
 * 節目データのスキーマ (datasources/milestones.json に登録される単位)
 *
 * - date: YYYY-MM-DD (JST 想定)
 * - label: 表示用ラベル (例: "社会復帰" / "サイト開設")
 * - tone: 表示時の扱いを切り替えるための感情タグ
 */
export interface Milestone {
  readonly date: string;
  readonly label: string;
  readonly tone: MilestoneTone;
}

/**
 * 層1=座標
 *
 * 登録された節目 (Milestone) と publishedAt の差分日数を保持する。
 * 節目が登録されている限りで意味を持つ「座標」を名乗れる層。
 */
export interface Coordinate {
  readonly label: string;
  readonly tone: MilestoneTone;
  readonly daysSince: number;
}

/**
 * 層2=経過
 *
 * 節目が未登録または記事が全節目より前のときのフォールバック。
 * 「座標」ではなく「経過」と用語を厳密区別する。tone は持たない。
 */
export interface Elapsed {
  readonly label: string;
  readonly daysSince: number;
}

/**
 * ISO 8601 形式 (日時、タイムゾーン必須) の検証用正規表現
 *
 * 例: 2025-01-01T12:00:00+09:00
 */
const ISO_8601_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * ISO 8601 形式かどうかを判定する
 *
 * 形式の表面上のチェックに加え、Date でパース可能な実在日付であることを確認する
 */
const isIso8601 = (value: string): boolean => {
  if (!ISO_8601_DATETIME.test(value)) {
    return false;
  }
  const time = Date.parse(value);
  return Number.isFinite(time);
};

/**
 * ファイル名 (例: `20250101120000.md` / `20250101120000`) から
 * publishedAt の ISO 8601 文字列を推定する純粋関数
 *
 * - JST (+09:00) で固定する (既存記事は JST 想定)
 * - 14 桁の数字 + 任意の .md のみ受理する厳格な実装
 * - 桁数や数値が不正な場合は null を返す
 * - 月末日や閏年の厳密判定は行わない (Date.parse がロールオーバーしても
 *   文字列自体は再構築されないため、推定値はそのまま返る)
 *
 * @param fileName - ファイル名 (例: `20250101120000.md`)
 * @returns ISO 8601 文字列 (推定不可なら null)
 */
export const inferPublishedAt = (fileName: string): string | null => {
  const base = fileName.replace(/\.md$/, "");
  const match = base.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  const candidate = `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
  return isIso8601(candidate) ? candidate : null;
};

/**
 * ISO 8601 文字列 (publishedAt) から JST のカレンダー上の年月日を抽出する
 *
 * - publishedAt 内のタイムゾーンに関係なく、JST (+09:00) の暦上の日付を返す
 * - 同日内の時刻差は無視される (00:00 と 23:59 で同じ日付を返す)
 */
const toJstCalendarDate = (isoDateTime: string): Date => {
  const time = Date.parse(isoDateTime);
  if (!Number.isFinite(time)) {
    throw new Error(`Invalid ISO 8601 datetime: "${isoDateTime}"`);
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
 * 節目の date 文字列 (YYYY-MM-DD) を JST カレンダー上の Date に変換する
 *
 * - 年月日のみを保持した UTC 基準の Date インスタンスを返す
 * - 日数差の計算用 (時分秒は 00:00:00 固定)
 */
const toMilestoneCalendarDate = (date: string): Date | null => {
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 2 つの JST カレンダー日付の差分日数 (publishedAt - origin) を返す
 *
 * - 引数はいずれも `toJstCalendarDate` / `toMilestoneCalendarDate` で
 *   00:00:00 UTC 固定化された Date インスタンスである前提
 */
const diffInDays = (origin: Date, target: Date): number => {
  return Math.round((target.getTime() - origin.getTime()) / MS_PER_DAY);
};

/**
 * 層1=座標: publishedAt と登録節目の差分日数を計算する
 *
 * - publishedAt より後 (未来) の節目は結果から除外する
 * - 引数の milestones の順序を保ったまま返す
 * - 空配列が渡されたら空配列を返す
 *
 * @param publishedAt - 記事の公開日時 (ISO 8601 文字列)
 * @param milestones - 登録された節目の配列
 * @returns 各節目に対応する Coordinate の配列 (publishedAt より後の節目は除外)
 */
export const computeCoordinates = (
  publishedAt: string,
  milestones: readonly Milestone[],
): readonly Coordinate[] => {
  const publishedDate = toJstCalendarDate(publishedAt);

  const coordinates: Coordinate[] = [];
  for (const milestone of milestones) {
    const milestoneDate = toMilestoneCalendarDate(milestone.date);
    if (milestoneDate === null) {
      continue;
    }
    const days = diffInDays(milestoneDate, publishedDate);
    if (days < 0) {
      continue;
    }
    coordinates.push({
      label: milestone.label,
      tone: milestone.tone,
      daysSince: days,
    });
  }
  return coordinates;
};

/**
 * 層2=経過: publishedAt と origin の暦上の経過日数を計算する
 *
 * - 節目が未登録または記事が全節目より前のときのフォールバック
 * - origin が publishedAt より後ろの場合は 0 を返す (負の値は返さない)
 * - tone を持たない点で Coordinate と命名区別する
 *
 * @param publishedAt - 記事の公開日時 (ISO 8601 文字列)
 * @param origin - 起点となる日付 (YYYY-MM-DD)
 * @param label - 表示用ラベル
 * @returns label と daysSince を保持した Elapsed
 */
export const computeElapsed = (
  publishedAt: string,
  origin: string,
  label: string,
): Elapsed => {
  const publishedDate = toJstCalendarDate(publishedAt);
  const originDate = toMilestoneCalendarDate(origin);
  if (originDate === null) {
    throw new Error(`Invalid origin date (YYYY-MM-DD): "${origin}"`);
  }
  const days = diffInDays(originDate, publishedDate);
  return {
    label,
    daysSince: days < 0 ? 0 : days,
  };
};
