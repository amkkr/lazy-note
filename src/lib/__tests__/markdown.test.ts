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

    it("空行が段落区切りとして保持される", () => {
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

      expect(result.content).toBe("<p>1行目です。</p>\n<p>2行目です。</p>\n");
    });

    it("リスト記法がul/liタグに変換される", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
- 項目1
- 項目2
- 項目3`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain("<ul>");
      expect(result.content).toContain("<li>項目1</li>");
      expect(result.content).toContain("<li>項目2</li>");
      expect(result.content).toContain("<li>項目3</li>");
      expect(result.content).toContain("</ul>");
    });

    it("GFMテーブルがtableタグに変換される", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
| 列1 | 列2 |
| --- | --- |
| A | B |`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain("<table>");
      expect(result.content).toContain("<th>列1</th>");
      expect(result.content).toContain("<td>A</td>");
      expect(result.content).toContain("</table>");
    });

    it("GFM打ち消し線がdelタグに変換される", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
~~打ち消し~~`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain("<del>打ち消し</del>");
    });

    it("改行がbrタグに変換される", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
1行目
2行目`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain("<br>");
    });

    it("コードブロッ���がpre/codeタグに変換される", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
\`\`\`typescript
const x = 1;
\`\`\``;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain("<pre>");
      expect(result.content).toContain("<code");
      expect(result.content).toContain("const x = 1;");
    });

    it("インラインコードがcodeタグに変換される", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
これは\`inline\`コードです。`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain("<code>inline</code>");
    });

    it("リンクがaタグに変換される", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
[リンクテキスト](https://example.com)`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain(
        '<a href="https://example.com">リンクテキスト</a>',
      );
    });

    it("相対パスの画像がdatasourcesパスに変換される", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
![alt text](images/photo.png)`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain('src="/datasources/images/photo.png"');
      expect(result.content).toContain('alt="alt text"');
    });

    it("外部URLの画像はパス変換されない", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
![外部画像](https://example.com/image.png)`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain('src="https://example.com/image.png"');
    });
  });
});
