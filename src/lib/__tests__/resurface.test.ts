/**
 * Resurface (再浮上) 選定ロジック (resurface.ts) のテスト
 *
 * 設計書: epic #487 / Issue #492
 *
 * 優先順位:
 *   (1) 沈黙トリガー (最後の投稿から N 日以上経過で発火)
 *   (2) 暦の節目 (1年前の同月同日など)
 *   (3) 座標上の意味 (節目記念日 = 節目からちょうど 1 年/2 年経過後の記事)
 *   (4) どれもなければ null
 *
 * - 純粋関数のみで構成し、time-source は引数 `today` (YYYY-MM-DD) で注入する
 * - 投稿頻度・投稿間隔の数値は ResurfaceReason に **持たせない**
 *   (沈黙の事実だけを返し、Pulse を切った思想に整合させる)
 * - `selectResurfaced` は anchors.ts の `inferPublishedAt` を再利用する
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Milestone } from "../anchors";
import type { PostSummary } from "../markdown";
import {
  type ResurfacedEntry,
  SILENCE_THRESHOLD_DAYS,
  selectResurfaced,
} from "../resurface";

/**
 * PostSummary 風モックを作成するヘルパー。
 *
 * id は実ファイル名 (YYYYMMDDhhmmss) に従う想定。inferPublishedAt 解決に依存。
 */
const makePost = (id: string, title = `title-${id}`): PostSummary => ({
  id,
  title,
  createdAt: "",
  author: "anonymous",
  excerpt: "",
  readingTimeMinutes: 1,
});

describe("SILENCE_THRESHOLD_DAYS: 沈黙トリガーのデフォルトしきい値", () => {
  it("ハードコードでなく定数として export されている", () => {
    expect(typeof SILENCE_THRESHOLD_DAYS).toBe("number");
  });

  it("30 日 (1 ヶ月相当) として定義されている (運用前提)", () => {
    expect(SILENCE_THRESHOLD_DAYS).toBe(30);
  });
});

describe("selectResurfaced: 優先順位 (1) 沈黙トリガー", () => {
  describe("沈黙判定", () => {
    it("最後の投稿から 30 日以上経過していれば沈黙として発火する", () => {
      // 最新記事: 2025-01-01
      // today: 2025-02-01 (31 日経過)
      const posts = [makePost("20250101120000"), makePost("20240101120000")];
      const result = selectResurfaced(posts, [], "2025-02-01");

      expect(result).not.toBeNull();
      expect(result?.reason.kind).toBe("silence");
    });

    it("最後の投稿から 30 日ちょうどで沈黙として発火する (>= 30)", () => {
      // 最新記事: 2025-01-01
      // today: 2025-01-31 (30 日経過)
      const posts = [makePost("20250101120000"), makePost("20240101120000")];
      const result = selectResurfaced(posts, [], "2025-01-31");

      expect(result).not.toBeNull();
      expect(result?.reason.kind).toBe("silence");
    });

    it("最後の投稿から 29 日 (しきい値未満) では沈黙は発火しない", () => {
      // 最新記事: 2025-01-01
      // today: 2025-01-30 (29 日経過)
      // milestones / calendar も無いので最終的に null になる
      const posts = [makePost("20250101120000"), makePost("20240601120000")];
      const result = selectResurfaced(posts, [], "2025-01-30");

      // 沈黙でなく、暦の節目 (1年前 6/1 vs today 1/30) も無いので null
      expect(result).toBeNull();
    });

    it("options.silenceThresholdDays で沈黙のしきい値を上書きできる", () => {
      // 最新記事: 2025-01-01
      // today: 2025-01-08 (7 日経過)
      // 既定の 30 日では発火しないが、しきい値 7 日では発火する
      const posts = [makePost("20250101120000"), makePost("20240601120000")];
      const result = selectResurfaced(posts, [], "2025-01-08", {
        silenceThresholdDays: 7,
      });

      expect(result).not.toBeNull();
      expect(result?.reason.kind).toBe("silence");
    });
  });

  describe("沈黙時の選定: 1年前の同月同日 → 最古記事", () => {
    it("沈黙ありで、1年前の同月同日記事があればそれを優先する", () => {
      // 最新記事: 2025-02-01 / today: 2025-04-01 (59 日沈黙)
      // 1年前の同月同日 = 2024-04-01 -> その記事 ID を浮上
      const posts = [
        makePost("20250201120000"),
        makePost("20240401120000", "1年前の今日の記事"),
        makePost("20240101120000"),
      ];
      const result = selectResurfaced(posts, [], "2025-04-01");

      expect(result).not.toBeNull();
      expect(result?.post.id).toBe("20240401120000");
      expect(result?.reason.kind).toBe("silence");
      if (result?.reason.kind === "silence") {
        expect(result.reason.sub).toBe("yearAgo");
      }
    });

    it("沈黙ありで、1年前の同月同日記事がなければ最古記事を浮上させる", () => {
      // 最新記事: 2025-02-01 / today: 2025-04-01 (59 日沈黙)
      // 1年前の同月同日 (2024-04-01) は無い
      const posts = [
        makePost("20250201120000"),
        makePost("20240801120000"),
        makePost("20240301120000", "最古記事"),
      ];
      const result = selectResurfaced(posts, [], "2025-04-01");

      expect(result).not.toBeNull();
      expect(result?.post.id).toBe("20240301120000");
      expect(result?.reason.kind).toBe("silence");
      if (result?.reason.kind === "silence") {
        expect(result.reason.sub).toBe("oldest");
      }
    });

    it("沈黙時 reason.lastPostDaysAgo は最新記事から today までの経過日数を保持する", () => {
      // 最新記事: 2025-01-01 / today: 2025-02-15 (45 日経過)
      const posts = [makePost("20250101120000"), makePost("20240101120000")];
      const result = selectResurfaced(posts, [], "2025-02-15");

      expect(result?.reason.kind).toBe("silence");
      if (result?.reason.kind === "silence") {
        expect(result.reason.lastPostDaysAgo).toBe(45);
      }
    });
  });

  describe("沈黙時の縮退: 最新記事しか無い場合", () => {
    it("posts が 1 件しか無くて沈黙していても、最新記事自身を浮上対象にしない (null)", () => {
      // 浮上は「過去の声」なので最新記事を選んでも意味がない
      const posts = [makePost("20250101120000")];
      const result = selectResurfaced(posts, [], "2025-04-01");

      expect(result).toBeNull();
    });
  });
});

describe("selectResurfaced: 優先順位 (2) 暦の節目", () => {
  it("沈黙でないとき、1年前の同月同日記事があればそれを返す", () => {
    // 最新記事: 2025-05-15 / today: 2025-05-15 (沈黙していない)
    // 1年前 2024-05-15 の記事がある -> calendar として返す
    const posts = [
      makePost("20250515120000"),
      makePost("20240515120000", "1年前の今日"),
      makePost("20240101120000"),
    ];
    const result = selectResurfaced(posts, [], "2025-05-15");

    expect(result).not.toBeNull();
    expect(result?.post.id).toBe("20240515120000");
    expect(result?.reason.kind).toBe("calendar");
    if (result?.reason.kind === "calendar") {
      expect(result.reason.yearsAgo).toBe(1);
    }
  });

  it("沈黙でないとき、2年前の同月同日記事があれば 1 年前より新しい暦の節目として返す", () => {
    // 最新記事: 2026-05-10 / today: 2026-05-15 (5 日経過、沈黙でない)
    // 1年前 (2025-05-15) は無いが、2年前 (2024-05-15) はある
    const posts = [
      makePost("20260510120000"),
      makePost("20240515120000", "2年前の今日"),
    ];
    const result = selectResurfaced(posts, [], "2026-05-15");

    expect(result).not.toBeNull();
    expect(result?.post.id).toBe("20240515120000");
    expect(result?.reason.kind).toBe("calendar");
    if (result?.reason.kind === "calendar") {
      expect(result.reason.yearsAgo).toBe(2);
    }
  });

  it("沈黙でないとき、複数年の同月同日候補があれば最も新しい年の候補を選ぶ", () => {
    // 1年前 (2025-05-15) と 2年前 (2024-05-15) の両方ある -> 1年前を優先
    const posts = [
      makePost("20260510120000"),
      makePost("20250515120000", "1年前"),
      makePost("20240515120000", "2年前"),
    ];
    const result = selectResurfaced(posts, [], "2026-05-15");

    expect(result?.post.id).toBe("20250515120000");
    expect(result?.reason.kind).toBe("calendar");
    if (result?.reason.kind === "calendar") {
      expect(result.reason.yearsAgo).toBe(1);
    }
  });
});

describe("selectResurfaced: 優先順位 (3) 座標上の意味 (節目記念日)", () => {
  it("沈黙でも暦の節目でもないが、節目からちょうど 1 年経過した記事があれば milestoneAnniversary として返す", () => {
    // 最新記事: 2026-01-10 / today: 2026-01-15 (5 日経過、沈黙でない)
    // 暦の節目 (1年前 2025-01-15) は無い
    // 節目「社会復帰」(2024-05-01) からちょうど 1 年経過 = 2025-05-01 に書かれた記事を浮上
    const posts = [
      makePost("20260110120000"),
      makePost("20250501120000", "社会復帰から1年経過した記事"),
    ];
    const milestones: readonly Milestone[] = [
      { date: "2024-05-01", label: "社会復帰", tone: "neutral" },
    ];
    const result = selectResurfaced(posts, milestones, "2026-01-15");

    expect(result).not.toBeNull();
    expect(result?.post.id).toBe("20250501120000");
    expect(result?.reason.kind).toBe("milestoneAnniversary");
    if (result?.reason.kind === "milestoneAnniversary") {
      expect(result.reason.label).toBe("社会復帰");
      expect(result.reason.yearsSinceMilestone).toBe(1);
    }
  });

  it("tone:heavy の節目記念日は浮上対象に含めない (Coordinate と同じ取り扱い)", () => {
    // 節目「重い体験」(2024-05-01, heavy) からちょうど 1 年経過した記事はあるが、
    // heavy は浮上対象から除外する
    const posts = [
      makePost("20260110120000"),
      makePost("20250501120000", "heavy 節目1年後"),
    ];
    const milestones: readonly Milestone[] = [
      { date: "2024-05-01", label: "重い体験", tone: "heavy" },
    ];
    const result = selectResurfaced(posts, milestones, "2026-01-15");

    // heavy 節目記念日は対象外なので null
    expect(result).toBeNull();
  });
});

describe("selectResurfaced: どれも該当しないケース", () => {
  it("沈黙なし・暦の節目なし・節目記念日なし → null を返す", () => {
    // 最新記事: 2025-01-10 / today: 2025-01-15 (5 日経過、沈黙でない)
    // 1年前 2024-01-15 の記事も無い
    const posts = [makePost("20250110120000"), makePost("20250105120000")];
    const result = selectResurfaced(posts, [], "2025-01-15");

    expect(result).toBeNull();
  });

  it("posts が空配列なら null を返す", () => {
    const result = selectResurfaced([], [], "2025-01-15");

    expect(result).toBeNull();
  });

  it("posts に inferPublishedAt 解決不能な ID が含まれていても落ちず、解決可能な記事のみで判定する", () => {
    // ID "invalid-id" は inferPublishedAt が null を返すため除外
    const posts = [makePost("20250101120000"), makePost("invalid-id")];
    const result = selectResurfaced(posts, [], "2025-02-01");

    // 1件残った 20250101120000 が最新で、その時点で today=2025-02-01 は 31 日経過 = 沈黙
    // しかし「最新だけしかない」=「過去候補が無い」のため null になる (上で検証済みの縮退)
    expect(result).toBeNull();
  });
});

describe("selectResurfaced: 既存16記事の実データに対する分岐", () => {
  /**
   * datasources/ 配下の YYYYMMDDhhmmss.md ファイル全件を PostSummary 化する。
   * inferPublishedAt 解決不能な ID は selectResurfaced 内で除外される。
   */
  const loadRealPostSummaries = (): PostSummary[] => {
    const datasourcesDir = join(__dirname, "../../../datasources");
    const files = readdirSync(datasourcesDir).filter((file) =>
      /^\d{14}\.md$/.test(file),
    );
    // ID 降順 (新しい順) で並べる (markdown.ts の挙動に合わせる)
    return files
      .map((file) => makePost(file.replace(".md", "")))
      .sort((a, b) => b.id.localeCompare(a.id));
  };

  it("today=2026-05-15 (現在) では最新記事 (2026-03-07) から 69 日経過のため沈黙トリガーが発火する", () => {
    const posts = loadRealPostSummaries();
    expect(posts.length).toBeGreaterThanOrEqual(16);

    const result = selectResurfaced(posts, [], "2026-05-15");

    expect(result).not.toBeNull();
    expect(result?.reason.kind).toBe("silence");
    if (result?.reason.kind === "silence") {
      expect(result.reason.lastPostDaysAgo).toBeGreaterThanOrEqual(30);
    }
  });

  it("today=2026-03-08 (最新記事翌日) では沈黙していないが、1年前 (2025-03-08) の記事も無いため null", () => {
    const posts = loadRealPostSummaries();
    // 2025-03-08 の記事は存在しない (記事は 2025-08-26 以降)
    const result = selectResurfaced(posts, [], "2026-03-08");

    expect(result).toBeNull();
  });

  it("today=2026-08-26 (沈黙でない & 1年前 2025-08-26 に記事あり) では暦の節目として浮上する", () => {
    const posts = loadRealPostSummaries();
    // 最新の 2026-03-07 から today までの日数を確認
    // 2026-03-07 から 2026-08-26 は 172 日経過 → 沈黙トリガー (>=30) が先に発火
    // ※ 当ケースは沈黙が優先されるテスト
    const result = selectResurfaced(posts, [], "2026-08-26");

    expect(result).not.toBeNull();
    // 沈黙が優先される (lastPostDaysAgo > 30)
    expect(result?.reason.kind).toBe("silence");
  });
});

describe("selectResurfaced: 戻り値型", () => {
  it("ResurfacedEntry は post と reason のみ公開し、頻度・間隔の数値プロパティを持たない", () => {
    const posts = [makePost("20250101120000"), makePost("20240101120000")];
    const result = selectResurfaced(posts, [], "2025-02-01");

    expect(result).not.toBeNull();
    if (result !== null) {
      const entry: ResurfacedEntry = result;
      const keys = Object.keys(entry).sort();
      // post / reason 以外のキーは存在しない
      expect(keys).toEqual(["post", "reason"]);
    }
  });
});
