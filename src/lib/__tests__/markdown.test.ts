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
  });

  describe("TOC抽出", () => {
    it("h2とh3の見出しにid属性が付与される", () => {
      const content = [
        "# テストタイトル",
        "",
        "## 投稿日時",
        "- 2024-01-01 10:00",
        "",
        "## 筆者名",
        "- テスト太郎",
        "",
        "## 本文",
        "テスト本文",
      ].join("\n");

      // 本文内の見出しはmarkedが処理するMarkdown記法で記述
      // extractBodyContentは次の`## `までを本文とするため、
      // 本文内にMarkdownのh2/h3を書いてテストする
      const contentWithHeadings = `${content}

### サブセクション1

テスト

### サブセクション2`;

      const result = parseMarkdown(contentWithHeadings, "20240101100000");

      expect(result.content).toContain('id="heading-0"');
      expect(result.content).toContain('id="heading-1"');
    });

    it("tocフィールドにTocItemの配列が含まれる", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
テスト本文

### はじめに

テスト段落

### 詳細

テスト段落2

### まとめ`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.toc).toHaveLength(3);
      expect(result.toc[0]).toEqual({
        id: "heading-0",
        text: "はじめに",
        level: 3,
      });
      expect(result.toc[1]).toEqual({
        id: "heading-1",
        text: "詳細",
        level: 3,
      });
      expect(result.toc[2]).toEqual({
        id: "heading-2",
        text: "まとめ",
        level: 3,
      });
    });

    it("h4はTOCに含まれない", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文

### h3見出し

#### h4見出し

テスト`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.toc).toHaveLength(1);
      expect(result.toc[0].text).toBe("h3見出し");
    });

    it("本文に見出しがない場合はtocが空配列になる", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
見出しなしの本文です。`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.toc).toEqual([]);
    });

    it("複数回parseMarkdownを呼んでもTOCデータがリセットされる", () => {
      const content1 = `# タイトル1

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文

### 見出しA

### 見出しB`;

      const content2 = `# タイトル2

## 投稿日時
- 2024-01-02 10:00

## 筆者名
- テスト太郎

## 本文

### 見出しC`;

      parseMarkdown(content1, "20240101100000");
      const result2 = parseMarkdown(content2, "20240102100000");

      expect(result2.toc).toHaveLength(1);
      expect(result2.toc[0].text).toBe("見出しC");
    });
  });

  describe("コードブロックラッパー", () => {
    it("コードブロックがcode-block-wrapperでラップされる", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文

\`\`\`javascript
console.log("hello");
\`\`\``;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain('class="code-block-wrapper"');
      expect(result.content).toContain('class="copy-btn"');
    });

    it("copy-btnにdata-code属性が付与される", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文

\`\`\`
const x = 1;
\`\`\``;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain("data-code=");
      expect(result.content).toContain("const x = 1;");
    });

    it("コードブロックに言語クラスが付与される", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文

\`\`\`typescript
const x: number = 1;
\`\`\``;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain('class="language-typescript"');
    });

    it("data-code属性内のダブルクォートがエスケープされる", () => {
      const content = `# テストタイトル

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文

\`\`\`javascript
const x = "hello";
\`\`\``;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain("&quot;");
    });
  });
});
