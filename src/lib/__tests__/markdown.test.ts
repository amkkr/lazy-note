import { describe, expect, it } from "vitest";
import { escapeHtmlAttr, parseMarkdown } from "../markdown";

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

    it("パストラバーサルを含む画像パスが空文字に変換される", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
![悪意ある画像](images/../../etc/passwd)`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain('src=""');
      expect(result.content).not.toContain("/etc/passwd");
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

    it('画像にloading="lazy"とdecoding="async"属性が付与される', () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
![サンプル](images/photo.png)`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain('loading="lazy"');
      expect(result.content).toContain('decoding="async"');
    });

    it("画像のalt属性がHTMLエスケープされる", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
![" onload="alert(1)](images/photo.png)`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain('alt="&quot; onload=&quot;alert(1)"');
      expect(result.content).not.toContain('alt="" onload="alert(1)"');
    });

    it("画像のtitle属性がHTMLエスケープされる", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
![alt](images/photo.png "<script>alert('xss')</script>")`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain(
        'title="&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"',
      );
    });

    it("ファイル名に特殊文字を含む画像が正しくエスケープされる", () => {
      const content = `# テスト

## 投稿日時
- 2024-01-01 10:00

## 筆者名
- テスト太郎

## 本文
![写真](images/photo&name<1>.png)`;

      const result = parseMarkdown(content, "20240101100000");

      expect(result.content).toContain(
        'src="/datasources/images/photo&amp;name&lt;1&gt;.png"',
      );
    });
  });

  describe("escapeHtmlAttr", () => {
    it("&をエスケープできる", () => {
      expect(escapeHtmlAttr("a&b")).toBe("a&amp;b");
    });

    it("<と>をエスケープできる", () => {
      expect(escapeHtmlAttr("<script>")).toBe("&lt;script&gt;");
    });

    it("ダブルクォートをエスケープできる", () => {
      expect(escapeHtmlAttr('"hello"')).toBe("&quot;hello&quot;");
    });

    it("シングルクォートをエスケープできる", () => {
      expect(escapeHtmlAttr("it's")).toBe("it&#39;s");
    });

    it("特殊文字を含まない文字列はそのまま返す", () => {
      expect(escapeHtmlAttr("hello world")).toBe("hello world");
    });

    it("複数の特殊文字を同時にエスケープできる", () => {
      expect(escapeHtmlAttr("<img src=\"x\" onload='alert(1)'>&")).toBe(
        "&lt;img src=&quot;x&quot; onload=&#39;alert(1)&#39;&gt;&amp;",
      );
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
