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
