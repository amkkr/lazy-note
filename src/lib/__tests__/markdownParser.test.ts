import { describe, expect, it } from "vitest";
import {
  calculateReadingTime,
  extractExcerpt,
  extractSummaryFromContent,
  splitLines,
} from "../markdownParser";

describe("extractExcerpt", () => {
  it("Markdown記法が除去される", () => {
    const markdown = [
      "### 見出し",
      "**太字**のテスト",
      "*斜体*のテスト",
      "`コード`のテスト",
      "[リンク](https://example.com)のテスト",
      "![画像](image.png)",
      "- リスト項目",
      "1. 番号付き項目",
      "> 引用テキスト",
      "---",
    ].join("\n");

    const result = extractExcerpt(markdown);

    expect(result).not.toContain("###");
    expect(result).not.toContain("**");
    expect(result).not.toContain("`");
    expect(result).not.toContain("[リンク](");
    expect(result).not.toContain("![");
    expect(result).not.toContain("---");
    expect(result).toContain("太字");
    expect(result).toContain("斜体");
    expect(result).toContain("コード");
    expect(result).toContain("リンク");
    expect(result).toContain("リスト項目");
    expect(result).toContain("番号付き項目");
    expect(result).toContain("引用テキスト");
  });

  it("150文字以上で省略される", () => {
    const longText = "あ".repeat(200);

    const result = extractExcerpt(longText);

    expect(result.length).toBe(153);
    expect(result).toMatch(/\.\.\.$/);
  });

  it("空テキストで空文字を返す", () => {
    const result = extractExcerpt("");

    expect(result).toBe("");
  });

  it("150文字以下のテキストは省略されない", () => {
    const shortText = "これは短いテキストです。";

    const result = extractExcerpt(shortText);

    expect(result).toBe(shortText);
    expect(result).not.toContain("...");
  });
});

describe("calculateReadingTime", () => {
  it("400文字で1分を返す", () => {
    const text = "あ".repeat(400);

    const result = calculateReadingTime(text);

    expect(result).toBe(1);
  });

  it("800文字で2分を返す", () => {
    const text = "あ".repeat(800);

    const result = calculateReadingTime(text);

    expect(result).toBe(2);
  });

  it("0文字で1分を返す", () => {
    const result = calculateReadingTime("");

    expect(result).toBe(1);
  });

  it("空白のみの場合も1分を返す", () => {
    const result = calculateReadingTime("   \n\n  ");

    expect(result).toBe(1);
  });

  it("401文字で2分を返す（切り上げ）", () => {
    const text = "あ".repeat(401);

    const result = calculateReadingTime(text);

    expect(result).toBe(2);
  });
});

describe("extractSummaryFromContent", () => {
  it("excerptとreadingTimeMinutesが含まれる", () => {
    const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
これはテストの本文です。**太字**も含まれます。`;

    const result = extractSummaryFromContent(content, "20240101100000");

    expect(result.id).toBe("20240101100000");
    expect(result.title).toBe("テストタイトル");
    expect(result.createdAt).toBe("2024-01-01 10:00");
    expect(result.author).toBe("テスト太郎");
    expect(result.excerpt).toBe("これはテストの本文です。太字も含まれます。");
    expect(result.readingTimeMinutes).toBe(1);
  });

  it("本文がない場合はexcerptが空文字でreadingTimeMinutesが1になる", () => {
    const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎`;

    const result = extractSummaryFromContent(content, "20240101100000");

    expect(result.excerpt).toBe("");
    expect(result.readingTimeMinutes).toBe(1);
  });

  it("先頭にBOM (U+FEFF) が混入してもタイトルを抽出できる", () => {
    const content = `﻿# BOM付きタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
BOM付きの本文です。`;

    const result = extractSummaryFromContent(content, "20240101100000");

    expect(result.title).toBe("BOM付きタイトル");
    expect(result.createdAt).toBe("2024-01-01 10:00");
    expect(result.author).toBe("テスト太郎");
    expect(result.excerpt).toBe("BOM付きの本文です。");
  });

  it("改行コードが CRLF でもタイトル/セクションを抽出できる", () => {
    const content = [
      "# CRLFタイトル",
      "",
      "## 投稿日時",
      "- 2024-02-02 12:00",
      "",
      "## 筆者名",
      "- 改行太郎",
      "",
      "## 本文",
      "CRLFの本文です。",
    ].join("\r\n");

    const result = extractSummaryFromContent(content, "20240202120000");

    expect(result.title).toBe("CRLFタイトル");
    expect(result.createdAt).toBe("2024-02-02 12:00");
    expect(result.author).toBe("改行太郎");
    expect(result.excerpt).toBe("CRLFの本文です。");
  });

  it("改行コードが CR (旧Mac形式) でもタイトル/セクションを抽出できる", () => {
    const content = [
      "# CRタイトル",
      "",
      "## 投稿日時",
      "- 2024-03-03 13:00",
      "",
      "## 筆者名",
      "- 旧Mac太郎",
      "",
      "## 本文",
      "CRのみの本文です。",
    ].join("\r");

    const result = extractSummaryFromContent(content, "20240303130000");

    expect(result.title).toBe("CRタイトル");
    expect(result.createdAt).toBe("2024-03-03 13:00");
    expect(result.author).toBe("旧Mac太郎");
    expect(result.excerpt).toBe("CRのみの本文です。");
  });
});

describe("splitLines", () => {
  it("LFで区切られた文字列を行配列に分割できる", () => {
    const content = "line1\nline2\nline3";

    const result = splitLines(content);

    expect(result).toEqual(["line1", "line2", "line3"]);
  });

  it("CRLFで区切られた文字列を行配列に分割できる", () => {
    const content = "line1\r\nline2\r\nline3";

    const result = splitLines(content);

    expect(result).toEqual(["line1", "line2", "line3"]);
  });

  it("CR (旧Mac形式) で区切られた文字列を行配列に分割できる", () => {
    const content = "line1\rline2\rline3";

    const result = splitLines(content);

    expect(result).toEqual(["line1", "line2", "line3"]);
  });

  it("CRLF / LF / CR が混在した文字列も分割できる", () => {
    const content = "line1\r\nline2\nline3\rline4";

    const result = splitLines(content);

    expect(result).toEqual(["line1", "line2", "line3", "line4"]);
  });

  it("先頭の BOM (U+FEFF) を除去できる", () => {
    const content = "﻿# タイトル\nbody";

    const result = splitLines(content);

    expect(result).toEqual(["# タイトル", "body"]);
  });

  it("BOM と CRLF の組み合わせでも分割できる", () => {
    const content = "﻿# タイトル\r\nbody\r\n";

    const result = splitLines(content);

    expect(result).toEqual(["# タイトル", "body", ""]);
  });

  it("BOM が文字列途中にある場合は除去しない", () => {
    const content = "head\n﻿middle\ntail";

    const result = splitLines(content);

    expect(result).toEqual(["head", "﻿middle", "tail"]);
  });

  it("空文字列に対しては空文字 1 要素の配列を返す", () => {
    const result = splitLines("");

    expect(result).toEqual([""]);
  });
});
