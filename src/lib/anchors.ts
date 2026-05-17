/**
 * 個人史座標エンジン (Anchor 機能の土台)
 *
 * 設計書: epic #487 / Issue #488 / Issue #497 (nominal 化)
 *
 * - 純粋関数のみで構成し、モジュールスコープの可変状態を持たない
 * - publishedAt はファイル名 (`YYYYMMDDhhmmss.md`) から ISO 8601 (JST +09:00 固定)
 *   を推定する純粋関数 (inferPublishedAt) で解決する
 *   (本番の日付抽出は `markdownParser.ts` の extractSectionContent 経由で
 *    別系統運用しており、Anchor 機能はファイル名推定のみに依存する)
 * - 「座標」(層1=computeCoordinates) と「経過」(層2=computeElapsed) を
 *   別関数・別型として命名区別する
 * - status / tags / updatedAt は本モジュールの出力に露出させない
 *
 * 型の nominal 化 (Issue #497):
 * - `Coordinate` (label/tone/daysSince) は構造的に `Elapsed` (label/daysSince) を
 *   包含する。TypeScript の structural typing で `Coordinate` を `Elapsed` として
 *   誤って受けて `tone` を捨てるサイレント縮退が表示層 (#491) で起きうる
 * - 対策として両型に **discriminator field `kind`** を持たせる
 *   (`"coordinate"` / `"elapsed"`)。Coordinate を Elapsed に代入すると
 *   `kind` の不一致でコンパイル時に検出され、サイレント縮退を防げる
 * - branded type ではなく discriminator を採用した理由:
 *   1. 表示層 (#491) で `switch (x.kind)` による discriminated union narrowing が
 *      効くため、`tone` への安全なアクセスが書ける (branded type では不可能)
 *   2. branded type は `as` キャストで突破可能だが、discriminator は実行時にも
 *      検証可能で防御力が高い
 *   3. `kind` の JSON シリアライズへの混入は本モジュールでは問題にならない
 *      (`anchors.ts` の戻り値は内部表現で、外部 API としてシリアライズされない)
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
 *
 * - `kind: "coordinate"` を **discriminator field** として実体に持つ
 *   (Elapsed との混同 = `Coordinate` を構造的互換で `Elapsed` として
 *   受けて `tone` を捨てるサイレント縮退をコンパイル時に検出するため)
 * - 設計判断: branded type ではなく discriminator を採用した理由は
 *   `anchors.ts` 冒頭の JSDoc または Issue #497 のコミットメッセージを参照
 * - 表示層 (#491) は `switch (x.kind)` で TypeScript の
 *   discriminated union narrowing を効かせて分岐することを想定している
 */
export interface Coordinate {
  readonly kind: "coordinate";
  readonly label: string;
  readonly tone: MilestoneTone;
  readonly daysSince: number;
}

/**
 * 層2=経過
 *
 * 節目が未登録または記事が全節目より前のときのフォールバック。
 * 「座標」ではなく「経過」と用語を厳密区別する。tone は持たない。
 *
 * - `kind: "elapsed"` を **discriminator field** として実体に持つ
 *   (Coordinate との混同をコンパイル時に検出するため)
 * - 設計判断の詳細は Coordinate の JSDoc を参照
 */
export interface Elapsed {
  readonly kind: "elapsed";
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
 * - 形式が `YYYY-MM-DD` を満たさない (例: "abc-de-fg") 場合のみ null を返す
 * - 値範囲は検証せず、`Date.UTC` のロールオーバーを許容する
 *   - 例: "2025-13-32" → 2026-02-01 / "2025-02-29" → 2025-03-01
 *   - 仕様としての挙動は `anchors.test.ts` の「Milestone.date 不正値の仕様」で固定
 *
 * @todo 値範囲検証関数は #489 で別途追加予定。本関数は現状ロールオーバーを許容する
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
 * `computeCoordinates` の動作オプション
 *
 * - `excludeHeavy`: true のとき、tone === "heavy" の節目を結果から **除外** する。
 *   未指定または false のときは heavy を含めて全 tone を返す (既存挙動)
 *
 * 設計判断 (Issue #532):
 * - 「表示ポリシーをエンジン引数で表現する」案A を採用
 * - 採用理由:
 *   1. **表示層ごとの再実装リスクを排除する**: heavy 除外を `Coordinate.tsx`
 *      側 (`c.tone !== "heavy"` の filter) で行うと、`/anchor` ページ (#493) など
 *      別の表示層で「heavy も含めて出したい」「heavy だけ除外したい」を分岐したい
 *      ときに `tone !== "heavy"` の語彙を表示層ごとに書き直すリスクがある
 *   2. **責務集約**: 「どの tone を除外するか」は表示ポリシーだが、`MilestoneTone`
 *      を知るのは anchors モジュールであり、表示層に enum 比較を漏らしたくない
 *   3. **API 互換性維持**: options は省略可能で、既存呼び出し
 *      (`AnchorPage.tsx` の heavy 含む呼び出し / 全テストケース) は無変更で動作する
 * - 案B (ラッパー関数 `computeCoordinatesForDisplay` 追加) との比較: 同じ
 *   モジュールに似た名前の関数を2つ並べると「どちらを呼ぶべきか」の意思決定コストが
 *   表示層側に残る。options による単一関数化の方が API 表面が小さい
 * - 案C (現状維持) との比較: ドキュメントだけでは「呼び出し忘れ」「filter の語彙
 *   揺れ」を防げない (受け入れ基準は「いずれかを選択し判断根拠を明文化」なので
 *   案C も選択肢だが、構造的に再発防止できる案A を採用する)
 */
export interface ComputeCoordinatesOptions {
  readonly excludeHeavy?: boolean;
}

/**
 * 層1=座標: publishedAt と登録節目の差分日数を計算する
 *
 * - publishedAt より後 (未来) の節目は結果から **除外 (filter)** する
 *   これは「まだ存在しない節目」を Coordinate として返さないためである
 *   (層2=`computeElapsed` は同じ未来起点を 0 にクランプするだけで除外しない。
 *    両関数の「未来の起点が来たときの挙動」は意図的に非対称な仕様)
 * - 引数の milestones の順序を保ったまま返す (`anchors.test.ts` の
 *   「入力順の保持」で仕様として固定)
 * - 空配列が渡されたら空配列を返す
 * - Milestone.date の値範囲は検証せず、`Date.UTC` のロールオーバーを許容する
 *   (`toMilestoneCalendarDate` の JSDoc / テスト「Milestone.date 不正値の仕様」参照)
 * - `options.excludeHeavy` が true のとき、tone === "heavy" の節目を結果から
 *   除外する。未指定または false のときは heavy を含めて返す (Issue #532)
 *
 * @param publishedAt - 記事の公開日時 (ISO 8601 文字列)
 * @param milestones - 登録された節目の配列
 * @param options - 表示ポリシーオプション (省略可能。詳細は
 *   `ComputeCoordinatesOptions` の JSDoc を参照)
 * @returns 各節目に対応する Coordinate の配列 (publishedAt より後の節目は除外。
 *   `excludeHeavy: true` 指定時はさらに heavy も除外)
 */
export const computeCoordinates = (
  publishedAt: string,
  milestones: readonly Milestone[],
  options?: ComputeCoordinatesOptions,
): readonly Coordinate[] => {
  const publishedDate = toJstCalendarDate(publishedAt);
  const excludeHeavy = options?.excludeHeavy ?? false;

  const coordinates: Coordinate[] = [];
  for (const milestone of milestones) {
    if (excludeHeavy && milestone.tone === "heavy") {
      continue;
    }
    const milestoneDate = toMilestoneCalendarDate(milestone.date);
    if (milestoneDate === null) {
      continue;
    }
    const days = diffInDays(milestoneDate, publishedDate);
    if (days < 0) {
      continue;
    }
    coordinates.push({
      kind: "coordinate",
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
 * - origin が publishedAt より後ろ (未来) の場合は 0 に **クランプ** する
 *   (負の値は返さず、エラーにもしない)
 *   これは Coordinate と異なり「未来からの経過」をそのまま 0 として扱うことで、
 *   フォールバック表示が破綻しないようにするためである。
 *   (層1=`computeCoordinates` は同じ未来起点を結果から filter で除外する。
 *    両関数の「未来の起点が来たときの挙動」は意図的に非対称な仕様)
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
    kind: "elapsed",
    label,
    daysSince: days < 0 ? 0 : days,
  };
};
