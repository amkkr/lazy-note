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
 *
 * **フィールド追加時の責務** (Issue #547):
 * 本インターフェースにフィールドを追加・変更したら、必ず
 * `src/lib/milestonesSchema.ts` の `validateOne` も更新すること。
 * ランタイム検証は型定義から自動生成されない (Zod 等の外部依存を
 * 入れない判断のため) ので、追加フィールドの検証規則を明示的に
 * 書き足す必要がある。忘れると JSON 編集者の入力ミスを検出できない。
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
 * - 桁数や数値が不正な場合は undefined を返す
 * - 月末日や閏年の厳密判定は行わない (Date.parse がロールオーバーしても
 *   文字列自体は再構築されないため、推定値はそのまま返る)
 *
 * 戻り値型 (Issue #682):
 * - CLAUDE.md「null vs undefined」方針に整合させるため `string | undefined`
 *   を採用する (「値がまだ割り当てられていない / 推定不可」のセマンティクスは
 *   undefined 側に倒すのが本プロジェクトのスタンス)
 *
 * @param fileName - ファイル名 (例: `20250101120000.md`)
 * @returns ISO 8601 文字列 (推定不可なら undefined)
 */
export const inferPublishedAt = (fileName: string): string | undefined => {
  const base = fileName.replace(/\.md$/, "");
  const match = base.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return undefined;
  }
  const [, year, month, day, hour, minute, second] = match;
  const candidate = `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
  return isIso8601(candidate) ? candidate : undefined;
};

/**
 * JST (+09:00) のオフセット (ミリ秒)。
 *
 * UTC 時刻に加算してから `getUTC*` で年月日を取り出すことで、JST 暦上の
 * カレンダー日付を算出する用途に使う。暦計算の単一ソースとして本モジュールに集約する。
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * ISO 8601 文字列 (publishedAt) から JST のカレンダー上の年月日を抽出する
 *
 * - publishedAt 内のタイムゾーンに関係なく、JST (+09:00) の暦上の日付を返す
 * - 同日内の時刻差は無視される (00:00 と 23:59 で同じ日付を返す)
 * - パース不能な値が渡された場合は throw する (呼び出し元は ISO 8601 妥当性が
 *   保証された文字列のみを渡す契約)
 *
 * 暦計算の単一ソース (Issue #746):
 * - 旧 `resurface.ts` の `isoToCalendarDate` (null 返し) と本関数 (throw) は本体が
 *   完全に同一だった。重複統合にあたり本関数を単一ソースとして export し、resurface
 *   側もこれを使う。resurface の呼び出し元 (`resolveAndSortPosts`) は
 *   `inferPublishedAt` が検証済みの ISO 文字列のみを渡すため、throw 契約でも観測上
 *   等価 (invalid が到達しない)。
 */
export const toJstCalendarDate = (isoDateTime: string): Date => {
  const time = Date.parse(isoDateTime);
  if (!Number.isFinite(time)) {
    throw new Error(`Invalid ISO 8601 datetime: "${isoDateTime}"`);
  }
  // JST (+09:00) オフセットを加えて UTC として年月日を取り出すことで、
  // JST 上のカレンダー日付を表現する Date インスタンスを生成する
  const jstShifted = new Date(time + JST_OFFSET_MS);
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
 * 暦計算の単一ソース (Issue #746):
 * - 旧 `resurface.ts` の `toCalendarDate` と本体が完全に同一だった。重複統合にあたり
 *   本関数を単一ソースとして export し、resurface 側もこれを使う。両者とも null 返し
 *   契約だったため観測上の差はない。
 *
 * @todo 値範囲検証関数は #489 で別途追加予定。本関数は現状ロールオーバーを許容する
 */
export const toMilestoneCalendarDate = (date: string): Date | null => {
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

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 2 つの JST カレンダー日付の差分日数 (target - origin) を返す
 *
 * - 引数はいずれも `toJstCalendarDate` / `toMilestoneCalendarDate` で
 *   00:00:00 UTC 固定化された Date インスタンスである前提
 * - 暦計算の単一ソース (Issue #746): 旧 `resurface.ts` の同名関数と本体が同一だった
 *   ため統合し、resurface 側もこれを使う
 */
export const diffInDays = (origin: Date, target: Date): number => {
  return Math.round((target.getTime() - origin.getTime()) / MS_PER_DAY);
};

/**
 * 今日の日付を JST 暦上の YYYY-MM-DD 文字列として返す。
 *
 * - `new Date()` を読むため副作用 (現在時刻依存) を持つ。純粋関数群と区別すること
 * - JST (+09:00) オフセットを加えて UTC 上の年月日を取り出す方式は
 *   `toJstCalendarDate` と同一の発想で、`JST_OFFSET_MS` を共有する
 * - テストで時刻を固定したい呼び出し (例: `selectResurfaced` の today 引数) は
 *   本関数を経由せず YYYY-MM-DD 文字列を直接渡すこと
 *
 * 暦計算の単一ソース (Issue #746):
 * - 旧 `pages/index.tsx` の `getTodayJst` が手計算していた `9 * 60 * 60 * 1000` を
 *   本モジュールへ集約する。pages 層は本関数を呼ぶことで JST オフセット定数の
 *   再記述を排除する。
 */
export const todayInJst = (): string => {
  const jst = new Date(Date.now() + JST_OFFSET_MS);
  const year = String(jst.getUTCFullYear()).padStart(4, "0");
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * `computeCoordinates` の動作オプション
 *
 * - `excludeTones`: 指定した tone を持つ節目を結果から **除外** する。
 *   未指定または空配列のときは全 tone を返す (既存挙動)。
 *   例: `["heavy"]` で heavy のみ除外 / `["heavy", "light"]` で neutral のみ残す
 *
 * 設計判断 (Issue #532 → Issue #614):
 * - 「表示ポリシーをエンジン引数で表現する」案A を採用 (Issue #532)
 * - 採用理由:
 *   1. **表示層ごとの再実装リスクを排除する**: tone 除外を `Coordinate.tsx`
 *      側 (`c.tone !== "heavy"` の filter) で行うと、`/anchor` ページ (#493) など
 *      別の表示層で「heavy も含めて出したい」「heavy だけ除外したい」を分岐したい
 *      ときに `tone !== "heavy"` の語彙を表示層ごとに書き直すリスクがある
 *   2. **責務集約**: 「どの tone を除外するか」は表示ポリシーだが、`MilestoneTone`
 *      を知るのは anchors モジュールであり、表示層に enum 比較を漏らしたくない
 *   3. **API 表面の単純化**: options は省略可能で、tone 指定なし (未指定 / 空配列)
 *      の呼び出し (`AnchorPage.tsx` / 全 tone を出す経路) は素直に全件を返す
 * - 案B (ラッパー関数 `computeCoordinatesForDisplay` 追加) との比較: 同じ
 *   モジュールに似た名前の関数を2つ並べると「どちらを呼ぶべきか」の意思決定コストが
 *   表示層側に残る。options による単一関数化の方が API 表面が小さい
 *
 * boolean → 集合指定への破壊的置換 (Issue #614):
 * - 当初は「heavy を除外するか」を表す boolean フラグだったが、将来 tone が
 *   増えたとき (例: `light` も状況により隠したい) に boolean フラグを tone ごとに
 *   増やすと API が肥大化する。除外したい tone の **集合** を直接受ける
 *   `excludeTones?: readonly MilestoneTone[]` へ拡張性のため置換した
 * - `@deprecated` 二段移行 (旧 boolean フラグを当面残す案2) は採らない。
 *   旧フラグの利用は内部の `Coordinate.tsx` 1 か所のみで外部公開 API では
 *   なく、後方互換コストを払う意味がないため破壊的に置換する (「過剰抽象化を避ける」
 *   方針と整合)
 */
export interface ComputeCoordinatesOptions {
  readonly excludeTones?: readonly MilestoneTone[];
}

/**
 * 1 つの (milestone, publishedDate) ペアを評価し、Coordinate に変換する純粋関数。
 *
 * 戻り値が undefined の場合は以下のいずれかに該当する:
 *   - `excludeTones` に含まれる tone の節目だった (Issue #614)
 *   - milestone.date の形式不正 (`toMilestoneCalendarDate` が null を返す)
 *   - publishedAt より後 (未来) の節目だった
 *
 * `computeCoordinates` の本体から条件分岐を引き剥がし、cognitive complexity を
 * 8 以下に抑えるために抽出 (Issue #652)。
 */
const tryBuildCoordinate = (
  milestone: Milestone,
  publishedDate: Date,
  excludeTones: readonly MilestoneTone[],
): Coordinate | undefined => {
  if (excludeTones.includes(milestone.tone)) {
    return undefined;
  }
  const milestoneDate = toMilestoneCalendarDate(milestone.date);
  if (milestoneDate === null) {
    return undefined;
  }
  const days = diffInDays(milestoneDate, publishedDate);
  if (days < 0) {
    return undefined;
  }
  return {
    kind: "coordinate",
    label: milestone.label,
    tone: milestone.tone,
    daysSince: days,
  };
};

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
 * - `options.excludeTones` に含まれる tone の節目を結果から除外する。未指定または
 *   空配列のときは全 tone を含めて返す (Issue #532 → Issue #614 で集合指定型に拡張)
 *
 * Biome 厳格化耐性メモ (Issue #652 / PR #623 follow-up):
 * - 本関数は `maxAllowedComplexity:8` 厳格化条件下でも違反 0 になるよう、
 *   per-milestone の評価を `tryBuildCoordinate` ヘルパーへ抽出している。
 *   入力順保持 / 未来除外 / 形式不正除外 / excludeTones 除外の全仕様は
 *   既存 `anchors.test.ts` で固定済み。
 *
 * @param publishedAt - 記事の公開日時 (ISO 8601 文字列)
 * @param milestones - 登録された節目の配列
 * @param options - 表示ポリシーオプション (省略可能。詳細は
 *   `ComputeCoordinatesOptions` の JSDoc を参照)
 * @returns 各節目に対応する Coordinate の配列 (publishedAt より後の節目は除外。
 *   `excludeTones` 指定時は該当 tone の節目もさらに除外)
 */
export const computeCoordinates = (
  publishedAt: string,
  milestones: readonly Milestone[],
  options?: ComputeCoordinatesOptions,
): readonly Coordinate[] => {
  const publishedDate = toJstCalendarDate(publishedAt);
  const excludeTones = options?.excludeTones ?? [];

  const coordinates: Coordinate[] = [];
  for (const milestone of milestones) {
    const coordinate = tryBuildCoordinate(milestone, publishedDate, excludeTones);
    if (coordinate !== undefined) {
      coordinates.push(coordinate);
    }
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
