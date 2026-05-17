import { describe, expect, it } from "vitest";
import {
  buildPulseForbiddenVocabRegex,
  PULSE_FORBIDDEN_VOCAB,
} from "../forbiddenVocab";

/**
 * Pulse 思想禁則語彙 (Issue #540) の共通定数自体のサニティテスト。
 *
 * 個別 Tripwire テスト (Coordinate / Resurface / AnchorPage / HomePage) は
 * 「実描画テキストがこの語彙にマッチしないこと」を検査する。本テストはその
 * 上流で「定数自体が壊れていないこと」(初期 8 語を含む / 重複がない / regex
 * が想定通り構築される) を保証する。
 */
describe("forbiddenVocab (Pulse 思想禁則語彙)", () => {
  it("Issue #540 の初期語彙 8 語を全て含む", () => {
    const initial = [
      "投稿頻度",
      "平均間隔",
      "投稿ペース",
      "執筆ペース",
      "投稿リズム",
      "更新頻度",
      "投稿量",
      "執筆量",
    ];

    for (const term of initial) {
      expect(PULSE_FORBIDDEN_VOCAB).toContain(term);
    }
  });

  it("重複した語彙を含まない", () => {
    const unique = new Set(PULSE_FORBIDDEN_VOCAB);
    expect(unique.size).toBe(PULSE_FORBIDDEN_VOCAB.length);
  });

  it("生成された regex で禁則語彙の各語にマッチする", () => {
    const regex = buildPulseForbiddenVocabRegex();
    for (const term of PULSE_FORBIDDEN_VOCAB) {
      expect(term).toMatch(regex);
    }
  });

  it("生成された regex は中立な文字列にマッチしない", () => {
    const regex = buildPulseForbiddenVocabRegex();
    expect("こんにちは").not.toMatch(regex);
    expect("社会復帰から 10 日目").not.toMatch(regex);
    expect("過去の記事").not.toMatch(regex);
  });

  it("呼び出すたびに新しい RegExp インスタンスを返す (状態汚染を避けるため)", () => {
    const r1 = buildPulseForbiddenVocabRegex();
    const r2 = buildPulseForbiddenVocabRegex();
    expect(r1).not.toBe(r2);
    expect(r1.source).toBe(r2.source);
  });
});
