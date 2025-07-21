import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../markdown";

describe("markdown.ts", () => {
  describe("parseMarkdown", () => {
    it("正しいMarkdownファイルを解析できる", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名  
- テスト太郎

## 本文
これはテストの本文です。

**太字**のテストです。`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.id).toBe("20240101100000");
      expect(result.title).toBe("テストタイトル");
      expect(result.createdAt).toBe("2024-01-01 10:00");
      expect(result.author).toBe("テスト太郎");
      expect(result.content).toContain("これはテストの本文です。");
      expect(result.content).toContain("<strong>太字</strong>");
      expect(result.rawContent).toBe(content);
    });

    it("タイトルがない場合は空文字を返す", () => {
      const content = `## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
本文のみです。`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.title).toBe("");
    });

    it("投稿日時がない場合は空文字を返す", () => {
      const content = `# テストタイトル

## 筆者名
- テスト太郎

## 本文
本文のみです。`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.createdAt).toBe("");
    });

    it("筆者名がない場合は空文字を返す", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 本文
本文のみです。`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.author).toBe("");
    });

    it("本文がない場合は空文字を返す", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toBe("");
    });

    it("リストの形式でない投稿日時や筆者名は空文字を返す", () => {
      const content = `# テストタイトル

## 投稿日時
2024-01-01 10:00

## 筆者名
テスト太郎

## 本文
本文です。`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.createdAt).toBe("");
      expect(result.author).toBe("");
    });

    it("複数の本文セクションがある場合は最初のセクションのみを取得する", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
最初の本文です。

## 追加情報
これは本文に含まれません。`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain("最初の本文です。");
      expect(result.content).not.toContain("これは本文に含まれません。");
    });

    it("空行は本文から除外される", () => {
      const content = `# テストタイトル

## 投稿日時  
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文

1行目です。


2行目です。

`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toBe("<p>1行目です。\n2行目です。</p>\n");
    });
  });
});
