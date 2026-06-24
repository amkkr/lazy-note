import { describe, expect, it } from "vitest";
import { isUpdatedAfterCreated, parsePostDateToEpoch } from "../postDate";

/**
 * JST 壁時計時刻 (年月日時分) から期待 epoch(ms) を算出するテスト用ヘルパー。
 * - 本体実装と同一ロジック (UTC 換算で 9 時間引く) を独立に書くことで、
 *   実装側の計算式を二重チェックする意図。
 */
const expectedJstEpoch = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number => Date.UTC(year, month - 1, day, hour, minute) - 9 * 60 * 60 * 1000;

describe("parsePostDateToEpoch", () => {
  it("スラッシュ区切りとダッシュ区切りの同一日時が等しい epoch を返す", () => {
    const slash = parsePostDateToEpoch("2026/03/10 09:30");
    const dash = parsePostDateToEpoch("2026-03-10 09:30");

    expect(slash).toBe(expectedJstEpoch(2026, 3, 10, 9, 30));
    expect(slash).toBe(dash);
  });

  it("時刻省略時は同日 00:00 (JST) の epoch を返す", () => {
    const epoch = parsePostDateToEpoch("2026/03/10");

    expect(epoch).toBe(expectedJstEpoch(2026, 3, 10, 0, 0));
  });

  it("ISO 8601 (+09:00) リテラルと同一の epoch を返す", () => {
    // 本体・expectedJstEpoch ヘルパーと同じ式のコピーに依存しない独立検証。
    // JS の Date が解釈する ISO 8601 (オフセット明示) の epoch と一致することを確認する。
    const epoch = parsePostDateToEpoch("2026/03/10 09:30");

    expect(epoch).toBe(new Date("2026-03-10T09:30:00+09:00").getTime());
  });

  it("空文字に対し undefined を返す", () => {
    expect(parsePostDateToEpoch("")).toBeUndefined();
  });

  it("数字を含まない文字列に対し undefined を返す", () => {
    expect(parsePostDateToEpoch("abc")).toBeUndefined();
  });

  it("ドット区切りに対し undefined を返す", () => {
    expect(parsePostDateToEpoch("2026.03.10")).toBeUndefined();
  });

  it("月が 13 (範囲外) の入力に対し undefined を返す", () => {
    expect(parsePostDateToEpoch("2026/13/01")).toBeUndefined();
  });

  it("月が 00 (範囲外) の入力に対し undefined を返す", () => {
    expect(parsePostDateToEpoch("2026/00/01")).toBeUndefined();
  });

  it("日が 40 (範囲外) の入力に対し undefined を返す", () => {
    expect(parsePostDateToEpoch("2026/01/40")).toBeUndefined();
  });

  it("日が 00 (範囲外) の入力に対し undefined を返す", () => {
    expect(parsePostDateToEpoch("2026/01/00")).toBeUndefined();
  });

  it("時が 24 (範囲外) の入力に対し undefined を返す", () => {
    expect(parsePostDateToEpoch("2026/01/01 24:00")).toBeUndefined();
  });

  it("分が 60 (範囲外) の入力に対し undefined を返す", () => {
    expect(parsePostDateToEpoch("2026/01/01 12:60")).toBeUndefined();
  });

  it("月日時分が全て上限境界 (12/31 23:59) の入力に対し有効な epoch を返す", () => {
    expect(parsePostDateToEpoch("2026/12/31 23:59")).toBe(
      expectedJstEpoch(2026, 12, 31, 23, 59),
    );
  });

  it("月日が下限境界 (01/01) の入力に対し有効な epoch を返す", () => {
    expect(parsePostDateToEpoch("2026/01/01")).toBe(
      expectedJstEpoch(2026, 1, 1, 0, 0),
    );
  });

  it("時分が下限境界 (00:00) の入力に対し有効な epoch を返す", () => {
    expect(parsePostDateToEpoch("2026/06/15 00:00")).toBe(
      expectedJstEpoch(2026, 6, 15, 0, 0),
    );
  });

  it("月に対し過大な日 (04/31) はロールオーバーに委ね有効な epoch を返す", () => {
    // 日の検証は単純な 1-31 範囲のみで、月ごとの日数や閏年は判定しない (意図的な
    // 現状維持)。4 月は 30 日までだが 31 は 1-31 範囲を通過し、Date.UTC により
    // 翌月 1 日へロールオーバーする。
    expect(parsePostDateToEpoch("2026/04/31")).toBe(
      expectedJstEpoch(2026, 5, 1, 0, 0),
    );
  });
});

describe("isUpdatedAfterCreated", () => {
  it("updatedAt が createdAt より後なら true を返す", () => {
    expect(isUpdatedAfterCreated("2026/03/10 09:30", "2026/03/11 10:00")).toBe(
      true,
    );
  });

  it("updatedAt が createdAt と同一なら false を返す", () => {
    expect(isUpdatedAfterCreated("2026/03/10 09:30", "2026/03/10 09:30")).toBe(
      false,
    );
  });

  it("updatedAt が createdAt より前なら false を返す", () => {
    expect(isUpdatedAfterCreated("2026/03/11 10:00", "2026/03/10 09:30")).toBe(
      false,
    );
  });

  it("createdAt の書式が不正なら false を返す", () => {
    expect(isUpdatedAfterCreated("2026.03.10", "2026/03/11 10:00")).toBe(false);
  });

  it("updatedAt の書式が不正なら false を返す", () => {
    expect(isUpdatedAfterCreated("2026/03/10 09:30", "abc")).toBe(false);
  });

  it("区切りが混在 (createdAt が -, updatedAt が /) でも epoch 比較で正しく判定する", () => {
    // 合成ケース: 運用データは全てスラッシュだが、ダッシュ受理 (fixture 互換) と
    // スラッシュ受理が同一 epoch に正規化されることを 1 ケースで確認する目的の
    // 意図的な区切り混在テスト。
    expect(isUpdatedAfterCreated("2026-03-10 09:30", "2026/03/11 10:00")).toBe(
      true,
    );
  });

  it("日跨ぎ境界 (23:59 → 翌日 00:00) で true を返す", () => {
    expect(isUpdatedAfterCreated("2026/03/10 23:59", "2026/03/11 00:00")).toBe(
      true,
    );
  });

  it("同日加筆境界 (日付のみ 00:00 → 同日 09:30) で true を返す", () => {
    // 同日加筆を「更新あり」として扱う挙動は意図的 (openQuestion #2 の決定)。
    // createdAt が日付のみ (= 00:00 とみなす) のため、同日でも時刻が後なら更新扱い。
    expect(isUpdatedAfterCreated("2026/03/10", "2026/03/10 09:30")).toBe(true);
  });

  it("updatedAt が範囲外値 (13 月) なら false を返す", () => {
    // 比較層として、範囲外 updatedAt はパース不能 (undefined) 扱いになり、
    // 隣接日時へのロールオーバー化けを起こさず false に落ちる。
    expect(isUpdatedAfterCreated("2026/03/10 09:30", "2026/13/11 10:00")).toBe(
      false,
    );
  });
});
