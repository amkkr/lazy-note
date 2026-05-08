import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createDefaultMeta, MetaParseError, parseMetaSection } from "../meta";

/**
 * テスト用の Markdown を生成するヘルパ
 */
const buildMarkdown = (metaSection: string | null): string => {
  const lines = [
    "# テストタイトル",
    "",
    "## 投稿日時",
    "- 2025-01-01 12:00",
    "",
    "## 筆者名",
    "- amkkr",
    "",
  ];
  if (metaSection !== null) {
    lines.push(metaSection, "");
  }
  lines.push("## 本文", "本文テキスト");
  return lines.join("\n");
};

describe("parseMetaSection", () => {
  describe("T1: ## メタ セクションが存在しない場合", () => {
    it("null を返し、呼び出し元で既定値割り当てに委ねる (C1)", () => {
      const markdown = buildMarkdown(null);

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result).toBeNull();
    });

    it("既定メタ生成関数 createDefaultMeta は status='published' で埋める", () => {
      const meta = createDefaultMeta("20250101120000.md");

      expect(meta.status).toBe("published");
      expect(meta.publishedAt).toBe("2025-01-01T12:00:00+09:00");
      expect(meta.tags).toEqual([]);
    });
  });

  describe("T2〜T4: status の各値で C2 通過", () => {
    it("T2: status: draft をパースできる", () => {
      const markdown = buildMarkdown("## メタ\n- status: draft");

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.status).toBe("draft");
    });

    it("T3: status: published をパースできる", () => {
      const markdown = buildMarkdown("## メタ\n- status: published");

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.status).toBe("published");
    });

    it("T4: status: archived をパースできる", () => {
      const markdown = buildMarkdown("## メタ\n- status: archived");

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.status).toBe("archived");
    });
  });

  describe("T5: published_at がパースされる", () => {
    it("published_at と status の両方が指定されたら採用される", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- published_at: 2025-02-03T09:30:00+09:00",
        ].join("\n"),
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.publishedAt).toBe("2025-02-03T09:30:00+09:00");
    });
  });

  describe("T6: status 欠落 → STATUS_REQUIRED (C3)", () => {
    it("tags のみで status が無いと MetaParseError(STATUS_REQUIRED) になる", () => {
      const markdown = buildMarkdown("## メタ\n- tags: [typescript, design]");

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("STATUS_REQUIRED");
      expect(caught?.file).toBe("20250101120000.md");
    });
  });

  describe("T7: 未知のキー → UNKNOWN_KEY (C4)", () => {
    it("foo のような未知キーが含まれると MetaParseError(UNKNOWN_KEY) になる", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- foo: bar",
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("UNKNOWN_KEY");
      expect(caught?.file).toBe("20250101120000.md");
      expect(typeof caught?.line).toBe("number");
    });
  });

  describe("T8: status 値が定義外 → INVALID_VALUE (C5)", () => {
    it("status: draft1 だと MetaParseError(INVALID_VALUE) になる", () => {
      const markdown = buildMarkdown("## メタ\n- status: draft1");

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_VALUE");
      expect(caught?.file).toBe("20250101120000.md");
    });
  });

  describe("T9: 同一キー重複 → DUPLICATE_KEY (C6)", () => {
    it("status が 2 行ある場合は MetaParseError(DUPLICATE_KEY) になる", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: draft\n- status: published",
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("DUPLICATE_KEY");
      expect(caught?.file).toBe("20250101120000.md");
    });
  });

  describe("T10: ISO 8601 違反 → INVALID_DATETIME (C7)", () => {
    it("published_at が日付形式でないと MetaParseError(INVALID_DATETIME) になる", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- published_at: not-a-date",
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
      expect(caught?.file).toBe("20250101120000.md");
    });

    it("updated_at が ISO 8601 違反でも INVALID_DATETIME になる", () => {
      const markdown = buildMarkdown(
        ["## メタ", "- status: published", "- updated_at: 2025/01/01"].join(
          "\n",
        ),
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });
  });

  describe("T11: 空行混在でもパースできる", () => {
    it("メタ本文に空行があっても無視され、後続項目もパースされる", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "",
          "- tags: [typescript, design]",
          "",
          "- updated_at: 2025-01-03T18:30:00+09:00",
        ].join("\n"),
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result).not.toBeNull();
      expect(result?.status).toBe("published");
      expect(result?.tags).toEqual(["typescript", "design"]);
      expect(result?.updatedAt).toBe("2025-01-03T18:30:00+09:00");
    });
  });

  describe("T12: published_at 省略時はファイル名から推定 (C8)", () => {
    it("ファイル名 20250101120000.md から JST の ISO 8601 を生成する", () => {
      const markdown = buildMarkdown("## メタ\n- status: published");

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.publishedAt).toBe("2025-01-01T12:00:00+09:00");
    });

    it("拡張子無しのタイムスタンプ文字列でも推定できる", () => {
      const markdown = buildMarkdown("## メタ\n- status: published");

      const result = parseMetaSection(markdown, "20250101120000");

      expect(result?.publishedAt).toBe("2025-01-01T12:00:00+09:00");
    });
  });

  describe("補助: tags の挙動", () => {
    it("空配列 [] を許容する", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- tags: []",
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.tags).toEqual([]);
    });

    it("配列形式でない値は INVALID_VALUE になる", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- tags: typescript",
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_VALUE");
    });
  });

  /**
   * Issue #428 で拡充した parseTagsValue の境界値テスト群。
   *
   * 設計意図:
   * - tags は「角括弧で囲まれたカンマ区切り」というゆるい記法を採用しており、
   *   執筆者が手書きする際の些細なゆれ（前後空白・連続カンマ・要素 1 件）を
   *   寛容に受け入れる方針 (split → trim → 空文字列 filter)。
   * - 大量タグの上限はあえて設けず、parser 層では件数制約を持たない。
   *   タグ数が UI 表示で問題になる場合は表示レイヤで間引く想定。
   */
  describe("Issue #428: parseTagsValue 境界値", () => {
    it("要素 1 件の tags は要素数 1 の配列としてパースされる", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- tags: [typescript]",
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.tags).toEqual(["typescript"]);
    });

    it("[a,,b] の連続カンマ間の空要素は除去される", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- tags: [a,,b]",
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.tags).toEqual(["a", "b"]);
    });

    it("[ a , b ] のように前後空白がある要素はトリムされる", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- tags: [ a , b ]",
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.tags).toEqual(["a", "b"]);
    });

    it("100 要素のタグ列は tag0..tag99 まで全て同一順序で配列に保持される", () => {
      const tags = Array.from({ length: 100 }, (_, index) => `tag${index}`);
      const markdown = buildMarkdown(
        `## メタ\n- status: published\n- tags: [${tags.join(", ")}]`,
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      // 完全一致比較で要素数・順序・値の全てを検証する
      expect(result?.tags).toEqual(tags);
    });

    it("[,,,] のようにカンマのみの配列は空配列になる", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- tags: [,,,]",
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.tags).toEqual([]);
    });
  });

  /**
   * Issue #428 で拡充した isIso8601 妥当性テスト群 (published_at 経由)。
   *
   * 設計上の意図:
   * - 形式チェックは正規表現で表面的に行い、実在性は Date.parse に委譲する
   *   2 段階構成。これにより「2025-13-01 のような明らかな不正値」「+25:00
   *   のような範囲外オフセット」「12:60 分のような不正分」は弾けるが、
   *   V8 の Date.parse が緩めに通すケース（例: 2025-02-29 を 2025-03-01
   *   にロールオーバー、24:00 を翌日 0 時として valid 扱い）はすり抜ける。
   * - 厳密な閏年/月日判定や時間部の境界判定は、ビルド時の Markdown 編集
   *   レイヤ (CI lint) で防御する責務分界。フロント側で受理されてもユーザー
   *   観測上の不正値は発生しづらい (表示は文字列保持のためロールオーバー
   *   後の値も元の文字列として表示される) ため、ランタイム parser には
   *   強い検証を課さない。
   *
   * 将来の反転方針 / TODO(#428): parseMarkdown 単体の厳格化を優先する場合、
   * 以下のテストを反転させ ISO 8601 仕様準拠化する:
   * - "非閏年 2/29" → expect を INVALID_DATETIME に反転
   * - "24:00 / 12:60" → expect を INVALID_DATETIME に反転
   *   (isIso8601 内で年月日と時刻の範囲チェックを追加実装)
   */
  describe("Issue #428: isIso8601 妥当性 (published_at)", () => {
    it("月部分が 13 の 2025-13-01T00:00:00+09:00 は INVALID_DATETIME になる", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- published_at: 2025-13-01T00:00:00+09:00",
        ].join("\n"),
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });

    it("日部分が 32 の 2025-01-32T00:00:00+09:00 は INVALID_DATETIME になる", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- published_at: 2025-01-32T00:00:00+09:00",
        ].join("\n"),
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });

    it("閏年の 2024-02-29T12:00:00+09:00 は published_at として受理される", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- published_at: 2024-02-29T12:00:00+09:00",
        ].join("\n"),
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.publishedAt).toBe("2024-02-29T12:00:00+09:00");
    });

    /**
     * 設計上の意図: V8 の Date.parse は 2025-02-29 を 2025-03-01 へロール
     * オーバーするため Number.isFinite が true を返す。本 parser は実在性
     * 判定を Date.parse に委譲する設計のため、非閏年 2/29 を弾けない。
     * フロント表示は文字列保持のため "2025-02-29" としてそのまま表示され、
     * ユーザー観測上の不正は起こりづらい。実在性の厳格判定はビルド時 lint
     * の責務とする分界に基づく。
     *
     * 将来の反転方針 / TODO(#428): parseMarkdown 単体に厳格化を入れるなら、
     * isIso8601 内で年月から実際の月末日を計算し一致しなければ false を
     * 返す実装に変更し、本テストの expect を `INVALID_DATETIME` に反転する。
     */
    it("非閏年の 2025-02-29T12:00:00+09:00 は現状 published_at として受理される (TODO #428: 仕様準拠化検討)", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- published_at: 2025-02-29T12:00:00+09:00",
        ].join("\n"),
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.publishedAt).toBe("2025-02-29T12:00:00+09:00");
    });

    it("タイムゾーンが +25:00 の published_at は INVALID_DATETIME になる", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- published_at: 2025-01-01T12:00:00+25:00",
        ].join("\n"),
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });

    it("小数秒 3 桁の ISO 8601 文字列は publishedAt に同一文字列で設定される", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- published_at: 2025-01-01T12:00:00.123+09:00",
        ].join("\n"),
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.publishedAt).toBe("2025-01-01T12:00:00.123+09:00");
    });

    /**
     * 設計上の意図: 正規表現 `\.\d+` は桁数を制限せず、isIso8601 は形式チェック
     * 後の実在性判定を `Date.parse` に委譲する。V8 の Date.parse は 6 桁以上の
     * 小数秒も valid 扱いにするため、ISO 8601 仕様上は逸脱した値も現状受理される。
     * フロント側で受理されてもユーザー観測上の不正は起こりづらく、Markdown 編集
     * 時のビルド時 lint で防御するという責務分界に基づく。
     *
     * 将来の反転方針 / TODO(#428): parseMarkdown 単体に厳格化を入れる場合、
     * 正規表現を `\.\d{1,3}` (ISO 8601 一般形) もしくは `\.\d{1,9}` 程度に
     * 制限し、本テストの `expect` を `INVALID_DATETIME` を throw する側に反転する。
     */
    it("小数秒 6 桁の ISO 8601 文字列は publishedAt に同一文字列で設定される (TODO #428: 仕様準拠化検討)", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- published_at: 2025-01-01T12:00:00.123456+09:00",
        ].join("\n"),
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.publishedAt).toBe("2025-01-01T12:00:00.123456+09:00");
    });

    /**
     * 設計上の意図: V8 の Date.parse は時間部 24:00:00 を「翌日 0 時」として
     * valid 扱いするため、現状の parser は 24 時を弾けない。文字列は元のまま
     * 保持されるため、フロント表示は "24:00" のままで観測上の不正は無く、
     * 実在性の厳格判定は CI lint の責務とする分界に基づく。
     *
     * 将来の反転方針 / TODO(#428): isIso8601 内で時刻範囲を 00-23 にチェック
     * する実装を追加し、本テストの expect を `INVALID_DATETIME` に反転する。
     */
    it("時間部 24:00:00 の 2025-01-01T24:00:00+09:00 は現状 published_at として受理される (TODO #428: 仕様準拠化検討)", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- published_at: 2025-01-01T24:00:00+09:00",
        ].join("\n"),
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.publishedAt).toBe("2025-01-01T24:00:00+09:00");
    });

    it("分部 60 の 2025-01-01T12:60:00+09:00 は INVALID_DATETIME になる", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- published_at: 2025-01-01T12:60:00+09:00",
        ].join("\n"),
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });
  });

  /**
   * Issue #428 で拡充した inferPublishedAtFromFileName 境界値テスト群
   * (createDefaultMeta 経由で間接的に検証)。
   *
   * 設計意図:
   * - ファイル名からの推定は「14 桁の純粋な数字 + .md (任意)」のみ受理する
   *   厳格な実装。形式不一致や桁不足は正規表現で弾かれ、ゼロ埋めや上限超過
   *   は isIso8601 の Date.parse で弾かれる二段構え。
   * - createDefaultMeta は推定失敗時に INVALID_DATETIME を throw して
   *   ビルドを失敗させる契約のため、無効ファイル名は即座にエラーとなる。
   */
  describe("Issue #428: inferPublishedAtFromFileName 境界値 (createDefaultMeta 経由)", () => {
    it("ゼロパディングの 00000000000000.md は INVALID_DATETIME を throw する", () => {
      let caught: MetaParseError | null = null;
      try {
        createDefaultMeta("00000000000000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
      expect(caught?.file).toBe("00000000000000.md");
    });

    it("上限超過の 99999999999999.md は INVALID_DATETIME を throw する", () => {
      let caught: MetaParseError | null = null;
      try {
        createDefaultMeta("99999999999999.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });

    it("先頭が 14 桁数字でないファイル名はINVALID_DATETIMEを throw する", () => {
      let caught: MetaParseError | null = null;
      try {
        createDefaultMeta("abc.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });

    it("13 桁しか無い 2025010112000.md は INVALID_DATETIME を throw する", () => {
      let caught: MetaParseError | null = null;
      try {
        createDefaultMeta("2025010112000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });

    /**
     * 設計上の意図: inferPublishedAtFromFileName は正規表現で年月日時分秒を
     * 取り出して文字列を組み立てる実装で、Date.parse でロールオーバーされても
     * 文字列自体は再構築されない。そのため非閏年 2/29 のファイル名は推定
     * 文字列 "2025-02-29T12:00:00+09:00" がそのまま返る。published_at の
     * 非閏年 2/29 テストと対称な振る舞い。
     *
     * 将来の反転方針 / TODO(#428): 月末日チェックを inferPublishedAtFromFileName
     * もしくは isIso8601 に追加する場合、本テストの期待値を `INVALID_DATETIME`
     * を throw する側に反転する。
     */
    it("非閏年 2/29 ファイル名 20250229120000.md は推定文字列 2025-02-29T12:00:00+09:00 として publishedAt に設定される (TODO #428: 仕様準拠化検討)", () => {
      const meta = createDefaultMeta("20250229120000.md");

      expect(meta.publishedAt).toBe("2025-02-29T12:00:00+09:00");
    });
  });

  /**
   * Issue #428 で拡充したメタセクションパーサ異常系テスト群。
   *
   * 設計意図:
   * - key: value 行の分解は「最初のコロン位置で切る」シンプルな実装で、
   *   値側にコロンを含むケース (URL や時刻表記) を許容する。結果として
   *   key は最初のコロンより前になり、value 側のコロンはそのまま残る。
   * - BOM (U+FEFF) は splitLines の段階で除去されるため、BOM 付き
   *   Markdown でもセクション検出に支障は出ない。
   * - 空セクション (`## メタ` 見出しのみ) は status 必須で STATUS_REQUIRED。
   */
  describe("Issue #428: メタセクションパース異常系", () => {
    it("tags の値 [a:b:c] は [\"a:b:c\"] としてパースされる", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- tags: [a:b:c]",
      );

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.tags).toEqual(["a:b:c"]);
    });

    it("コロンの直前にキーが無い : value 行は INVALID_VALUE になる", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- : value",
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_VALUE");
    });

    it("先頭に BOM (U+FEFF) が付いた Markdown でもメタセクションがパースされる", () => {
      const markdown = `﻿${buildMarkdown("## メタ\n- status: published")}`;

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.status).toBe("published");
    });

    it("見出しのみで本文が空の ## メタ セクションは STATUS_REQUIRED で throw する", () => {
      const markdown = buildMarkdown("## メタ");

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("STATUS_REQUIRED");
    });

    it("status が同一値で 2 回出現する場合は DUPLICATE_KEY で throw する", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- status: draft",
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("DUPLICATE_KEY");
      expect(caught?.file).toBe("20250101120000.md");
      expect(typeof caught?.line).toBe("number");
    });

    it("KNOWN_KEYS に含まれない foo キーが含まれると UNKNOWN_KEY で throw する", () => {
      const markdown = buildMarkdown(
        "## メタ\n- status: published\n- foo: bar",
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("UNKNOWN_KEY");
      expect(caught?.file).toBe("20250101120000.md");
      expect(typeof caught?.line).toBe("number");
    });

    it("CRLF (\\r\\n) 改行のメタセクションが正しくパースされる", () => {
      const lines = [
        "# テストタイトル",
        "",
        "## 投稿日時",
        "- 2025-01-01 12:00",
        "",
        "## 筆者名",
        "- amkkr",
        "",
        "## メタ",
        "- status: published",
        "- tags: [typescript]",
        "",
        "## 本文",
        "本文テキスト",
      ];
      const markdown = lines.join("\r\n");

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.status).toBe("published");
      expect(result?.tags).toEqual(["typescript"]);
    });

    it("CR (\\r) 改行のメタセクションが正しくパースされる", () => {
      const lines = [
        "# テストタイトル",
        "",
        "## 投稿日時",
        "- 2025-01-01 12:00",
        "",
        "## 筆者名",
        "- amkkr",
        "",
        "## メタ",
        "- status: published",
        "- tags: [typescript]",
        "",
        "## 本文",
        "本文テキスト",
      ];
      const markdown = lines.join("\r");

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.status).toBe("published");
      expect(result?.tags).toEqual(["typescript"]);
    });

    it("先頭 BOM + CRLF 改行が混在する Markdown でもメタセクションがパースされる", () => {
      const lines = [
        "# テストタイトル",
        "",
        "## メタ",
        "- status: archived",
        "",
        "## 本文",
        "本文テキスト",
      ];
      const markdown = `﻿${lines.join("\r\n")}`;

      const result = parseMetaSection(markdown, "20250101120000.md");

      expect(result?.status).toBe("archived");
    });
  });

  /**
   * Issue #428 で拡充した isIso8601 妥当性テスト群 (updated_at 経由)。
   *
   * 設計上の意図: published_at と同じ正規表現 + Date.parse の 2 段階構成を共有
   * するため、updated_at も対称な振る舞いを示す。published_at セクションと同じ
   * 責務分界 (CI lint で厳格化、ランタイム parser は寛容) に従う。
   *
   * 将来の反転方針 / TODO(#428): published_at 側の厳格化と同時に updated_at
   * 側も厳格化する場合、本セクションの境界値テストを INVALID_DATETIME 反転で
   * 維持し、月末日計算ロジックを isIso8601 に追加する。
   */
  describe("Issue #428: isIso8601 妥当性 (updated_at)", () => {
    it("月部分が 13 の updated_at は INVALID_DATETIME になる", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- updated_at: 2025-13-01T12:00:00+09:00",
        ].join("\n"),
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });

    it("タイムゾーンが無い updated_at: 2025-01-01T12:00:00 は INVALID_DATETIME になる", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- updated_at: 2025-01-01T12:00:00",
        ].join("\n"),
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });

    it("ISO 8601 と無関係な文字列 updated_at: invalid-string は INVALID_DATETIME になる", () => {
      const markdown = buildMarkdown(
        [
          "## メタ",
          "- status: published",
          "- updated_at: invalid-string",
        ].join("\n"),
      );

      let caught: MetaParseError | null = null;
      try {
        parseMetaSection(markdown, "20250101120000.md");
      } catch (error) {
        caught = error as MetaParseError;
      }

      expect(caught).toBeInstanceOf(MetaParseError);
      expect(caught?.code).toBe("INVALID_DATETIME");
    });
  });
});

describe("既存記事の互換性確認 (T1 拡張)", () => {
  const datasourcesPath = join(process.cwd(), "datasources");
  const files = readdirSync(datasourcesPath).filter((file) =>
    file.endsWith(".md"),
  );

  it("datasources 配下に少なくとも 16 件の記事が存在する", () => {
    expect(files.length).toBeGreaterThanOrEqual(16);
  });

  for (const file of files) {
    it(`${file} は ## メタ 無しでも parseMetaSection が null を返す`, () => {
      const content = readFileSync(join(datasourcesPath, file), "utf8");
      // 既存 16 記事はすべて ## メタ を持たない想定
      expect(parseMetaSection(content, file)).toBeNull();
    });

    it(`${file} は createDefaultMeta で status="published" として通る`, () => {
      const meta = createDefaultMeta(file);
      expect(meta.status).toBe("published");
      expect(meta.publishedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/,
      );
    });
  }
});
