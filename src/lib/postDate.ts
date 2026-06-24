/**
 * 加筆日時の比較専用パース層 (Issue #808)
 *
 * - `createdAt` / `updatedAt` の **表示文字列**はそのまま使い、本モジュールは
 *   「updatedAt が createdAt より厳密に新しいか」の **大小判定**のみを担う
 * - 文字列の辞書順比較は書式不統一 (区切り `/` と `-` の混在 / 時刻有無) で
 *   破綻するため、書式緩めのパースで一度 JST epoch(ms) に正規化してから比較する
 * - 純粋関数のみで構成し、`Date.now()` / 引数なし `new Date()` には依存しない
 *   (現在時刻に依存しない = 同一入力で常に同一出力)
 * - `anchors.ts` の export (`JST_OFFSET_MS` 等) は import しない。責務分離のため
 *   JST オフセット定数は本モジュール内にローカルに持つ
 */

/**
 * JST (+09:00) のオフセット (ミリ秒)。
 *
 * - JST の壁時計時刻を UTC epoch へ変換する際、UTC 換算で 9 時間引くために使う
 *   (JST は UTC+9 のため、同じ壁時計時刻でも UTC より 9 時間早い瞬間を指す)
 * - `anchors.ts` にも同名定数があるが、責務分離のため本モジュールに独立して持つ
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * `YYYY/MM/DD HH:MM` / `YYYY-MM-DD HH:MM` を受理する正規表現。
 *
 * - 区切りは `/` と `-` の両方を許容する (ダッシュは PostDetailPage の既存
 *   fixture `"2024-01-15"` との互換のため。運用データは全てスラッシュ)
 * - 時刻部 `(?:[ T]HH:MM)?` は省略可能 (省略時は 00:00 とみなす)。日付と時刻の
 *   区切りは半角スペースまたは `T` を許容する
 * - 本正規表現は **桁数のみ**を検証する。月日時分の値範囲 (1-12 月等) の検証は
 *   `parsePostDateToEpoch` 側で行う (Issue #812 で追加。正規表現の受理形式自体は
 *   変更せず、パース後に範囲チェックする方針)
 * - 1 つの値の中で区切りが混在するケース (`2026/03-10` 等) は実運用で発生しない
 *   ため受理する場合があるが、ドット区切り `2026.03.10` は桁の前後に許可文字が
 *   無いため確実に不一致 (`undefined`) になる
 */
const POST_DATE_PATTERN =
  /^(\d{4})[/-](\d{2})[/-](\d{2})(?:[ T](\d{2}):(\d{2}))?$/;

/**
 * 値が指定範囲 (両端含む) の内側かどうかを判定する純粋関数。
 *
 * @param value 判定対象の数値
 * @param min 下限 (この値を含む)
 * @param max 上限 (この値を含む)
 * @returns `min <= value <= max` なら `true`
 */
const isInRange = (value: number, min: number, max: number): boolean =>
  value >= min && value <= max;

/**
 * 投稿日時文字列を JST (+09:00) 固定で epoch(ms) に正規化する純粋関数。
 *
 * - 桁数マッチ (`POST_DATE_PATTERN`) 後、月日時分の値範囲を検証する (Issue #812)。
 *   月 1-12 / 日 1-31 / 時 0-23 / 分 0-59 のいずれかが範囲外なら `undefined` を返す。
 *   これにより `2026/13/40` や `24:00` 等の範囲外値が `Date.UTC` のロールオーバーで
 *   隣接日時へ化けるのを防ぐ
 * - 日の検証は **単純な 1-31 範囲のみ**で、月ごとの日数や閏年は判定しない (意図的な
 *   現状維持・YAGNI)。そのため `2026/04/31` (4 月は 30 日まで) や `2026/02/30` の
 *   ような「月に対し過大な日」は範囲検証を通過し、従来どおり `Date.UTC` の
 *   ロールオーバーに委ねられる (翌月へ繰り上がる)
 *
 * @param value `YYYY/MM/DD HH:MM` / `YYYY-MM-DD HH:MM` 形式の文字列
 *   (時刻は省略可能で、省略時は 00:00 とみなす)
 * @returns 正規化した epoch(ms)。形式不一致または値範囲外の場合は `undefined`
 */
export const parsePostDateToEpoch = (value: string): number | undefined => {
  const matched = POST_DATE_PATTERN.exec(value);
  if (matched === null) {
    return undefined;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  // 時刻省略時は 00:00 とみなす
  const hour = matched[4] === undefined ? 0 : Number(matched[4]);
  const minute = matched[5] === undefined ? 0 : Number(matched[5]);

  // 月日時分の値範囲を検証する (日は 1-31 範囲のみ。月過大日はロールオーバーに委ねる)
  if (
    !isInRange(month, 1, 12) ||
    !isInRange(day, 1, 31) ||
    !isInRange(hour, 0, 23) ||
    !isInRange(minute, 0, 59)
  ) {
    return undefined;
  }

  // JST 壁時計時刻 → epoch は UTC 換算で 9 時間引く (JST は UTC+9 のため)
  return Date.UTC(year, month - 1, day, hour, minute) - JST_OFFSET_MS;
};

/**
 * `updatedAt` が `createdAt` より厳密に新しいかを判定する純粋関数。
 *
 * - 両者とも `parsePostDateToEpoch` でパース成功し、かつ
 *   `updated epoch > created epoch` のときだけ `true`
 * - いずれかが形式不正 (`undefined`)、または `updated <= created` のときは `false`
 *
 * @param createdAt 作成日時の表示文字列
 * @param updatedAt 更新日時の表示文字列
 * @returns updatedAt が createdAt より厳密に新しければ `true`
 */
export const isUpdatedAfterCreated = (
  createdAt: string,
  updatedAt: string,
): boolean => {
  const createdEpoch = parsePostDateToEpoch(createdAt);
  const updatedEpoch = parsePostDateToEpoch(updatedAt);

  if (createdEpoch === undefined || updatedEpoch === undefined) {
    return false;
  }

  return updatedEpoch > createdEpoch;
};
