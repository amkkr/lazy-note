import { describe, expect, it } from "vitest";
import {
  calculateReadingTime,
  extractExcerpt,
  extractSummaryFromContent,
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
});
