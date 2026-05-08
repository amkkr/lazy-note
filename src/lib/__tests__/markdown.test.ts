import { describe, expect, it } from "vitest";
import { escapeHtmlAttr, parseMarkdown } from "../markdown";

// 極長入力境界値テストで使用するバイト数。1MB 程度の入力で escapeHtmlAttr が
// throw せず、長さ・末尾エスケープが保たれることを確認する用途。
const ONE_MEGABYTE = 1024 * 1024;

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

  // 本文セクションを含むMarkdownを組み立てるヘルパー
  const wrapBody = (body: string): string =>
    [
      "# テストタイトル",
      "",
      "## 投稿日時",
      "- 2024-01-01 10:00",
      "",
      "## 筆者名",
      "- テスト太郎",
      "",
      "## 本文",
      body,
    ].join("\n");

  describe("画像パストラバーサル境界値", () => {
    it("末尾が..のパスは空文字に変換される", () => {
      const result = parseMarkdown(
        wrapBody("![x](images/foo/..)"),
        "20240101100000",
      );

      expect(result.content).toContain('src=""');
    });

    it("バックスラッシュ区切りで..を含むパスは空文字に変換される", () => {
      const result = parseMarkdown(
        wrapBody("![x](images/..\\foo.png)"),
        "20240101100000",
      );

      expect(result.content).toContain('src=""');
    });

    it("ファイル名内に連続ドット..を含むパスは空文字に変換される", () => {
      /**
       * 設計意図: resolveImagePath は単純な includes("..") でトラバーサル検出を
       * 行うため、ファイル名内の連続ドット (a..b.png) もトラバーサルとして
       * 同等に扱われ src="" となる。誤検出も含めて defensive default を採用する設計。
       * TODO(#426): もし path segment 単位の検出に変更する場合、
       * このテストは a..b.png がそのまま展開されるよう期待を変更する。
       */
      const result = parseMarkdown(
        wrapBody("![x](images/a..b.png)"),
        "20240101100000",
      );

      expect(result.content).toContain('src=""');
    });

    it("images/%2e%2eを含むパスはsrc属性にエンコード済み文字列のまま展開される", () => {
      /**
       * 設計意図: parseMarkdown は単独で sanitizer を持たず、URLデコード後の
       * パストラバーサル検出は行わない設計。最終 HTML 表示時には外部レイヤ
       * (DOMPurify / React のエスケープ等) で防御する前提で、本テストは
       * 現状の素通り挙動を文書化する。
       * TODO(#426): もし parseMarkdown 側で URL デコード→トラバーサル検出を
       * 追加する場合、このテストは src="" を期待する形に反転させる。
       */
      const result = parseMarkdown(
        wrapBody("![x](images/%2e%2e/secret.png)"),
        "20240101100000",
      );

      expect(result.content).toContain(
        'src="/datasources/images/%2e%2e/secret.png"',
      );
    });

    it("images/に続く多重スラッシュは正規化されずsrc属性に保持される", () => {
      /**
       * 設計意図: parseMarkdown は単独でパス正規化を行わない設計。
       * 最終 HTML 表示時のパス解釈は外部レイヤ (ブラウザ / サーバ) に委ねる。
       * TODO(#426): もし path 正規化 (collapse `//`) を追加する場合、
       * このテストは正規化済みパスを期待する形に修正する。
       */
      const result = parseMarkdown(
        wrapBody("![x](images//foo.png)"),
        "20240101100000",
      );

      expect(result.content).toContain('src="/datasources/images//foo.png"');
    });

    it("パス中間に..を含む深いパストラバーサルも空文字に変換される", () => {
      const result = parseMarkdown(
        wrapBody("![x](images/sub/../../etc/passwd)"),
        "20240101100000",
      );

      expect(result.content).toContain('src=""');
      expect(result.content).not.toContain("/etc/passwd");
    });

    it("httpスキームのURLはsrc属性に原文のまま設定される", () => {
      /**
       * 設計意図: imagesプレフィックスがないURLは外部URLとみなし、
       * resolveImagePath はパス変換もパストラバーサル検出も行わない。
       * 外部URL先のリソースはブラウザのCSP/SRI等の上位レイヤで制御する前提。
       */
      const result = parseMarkdown(
        wrapBody("![x](https://example.com/../secret.png)"),
        "20240101100000",
      );

      expect(result.content).toContain(
        'src="https://example.com/../secret.png"',
      );
    });

    it("大文字のIMAGES/プレフィックスを持つパスはstartsWithでマッチせずsrc属性に原文のまま展開される", () => {
      /**
       * 設計意図: resolveImagePath は startsWith("images/") で小文字完全一致のみ
       * 検出する。大文字を含むパスは外部URL扱いとなり、パストラバーサル検出も
       * 行われない。最終 HTML 表示時の防御は外部レイヤ (DOMPurify 等) に委ねる。
       * TODO(#426): もしケースインセンシティブな検出を追加する場合、
       * このテストは src="" もしくは /datasources/IMAGES/... を期待する形に修正する。
       */
      const result = parseMarkdown(
        wrapBody("![x](IMAGES/foo.png)"),
        "20240101100000",
      );

      expect(result.content).toContain('src="IMAGES/foo.png"');
    });

    it("二重URLエンコードされた%252e%252eを含むパスはsrc属性に同一文字列で展開される", () => {
      /**
       * 設計意図: parseMarkdown は URL デコードを一切行わないため、
       * 二重エンコード (%25 = %) もデコードされず原文のまま展開される。
       * トラバーサル検出は外部レイヤに委ねる前提。
       * TODO(#426): URL デコードを実装する場合、このテストは
       * 1段デコード後 (%2e%2e) で素通りするか、2段デコード後 (..) で
       * src="" になるかを設計判断のうえ修正する。
       */
      const result = parseMarkdown(
        wrapBody("![x](images/%252e%252e/secret.png)"),
        "20240101100000",
      );

      expect(result.content).toContain(
        'src="/datasources/images/%252e%252e/secret.png"',
      );
    });
  });

  describe("escapeHtmlAttr 境界値", () => {
    it("escapeHtmlAttrはU+0000を含む入力を同一文字列で返す", () => {
      /**
       * 設計意図: escapeHtmlAttr は HTML 特殊文字 (& < > " ') のみを対象とし、
       * 制御文字は除去しない。U+0000 のサニタイズは外部レイヤ (DOMPurify 等) に
       * 委ねる前提。
       * TODO(#426): もし制御文字除去を実装する場合、このテストは
       * 削除済みの結果を期待する形に修正する。
       */
      const input = "a b";

      expect(escapeHtmlAttr(input)).toBe("a b");
    });

    it("escapeHtmlAttrはU+001Fを含む入力を同一文字列で返す", () => {
      /**
       * 設計意図: 上記と同じく制御文字は素通りする設計。
       */
      const input = "ab";

      expect(escapeHtmlAttr(input)).toBe("ab");
    });

    it("escapeHtmlAttrはU+202E (右から左オーバーライド) を含む入力を同一文字列で返す", () => {
      /**
       * 設計意図: BiDi 制御文字 (U+202E) はテキスト方向制御の意図的な利用も
       * あり得るため escapeHtmlAttr では除去しない。攻撃ベクター
       * (ファイル名偽装等) として利用される場合は外部レイヤで対処する前提。
       *
       * U+202E は直書きするとファイル単位で右から左の表示制御がかかり、
       * レビュー時に意図せぬ視覚的混乱を生むため `\u202E` エスケープ表記に
       * 統一する。
       */
      const input = "a\u202Eb";

      expect(escapeHtmlAttr(input)).toBe("a\u202Eb");
    });

    it("escapeHtmlAttrはバックスラッシュをエスケープせず同一文字列で返す", () => {
      /**
       * 設計意図: バックスラッシュは HTML 属性値として特殊文字ではないため、
       * escapeHtmlAttr の対象外。JavaScript 文字列リテラルへの埋め込みなど
       * 別コンテキストでのエスケープは呼び出し側の責務。
       */
      const input = "a\\b";

      expect(escapeHtmlAttr(input)).toBe("a\\b");
    });

    it("約1MBの極長入力でもthrowせず処理を完了できる", () => {
      const long = "a".repeat(ONE_MEGABYTE);

      expect(escapeHtmlAttr(long).length).toBe(long.length);
    });

    it("約1MBの極長入力に含まれる特殊文字もエスケープされる", () => {
      const long = `${"a".repeat(ONE_MEGABYTE)}<`;

      expect(escapeHtmlAttr(long).endsWith("&lt;")).toBe(true);
    });

    it("絵文字を含む文字列は絵文字を保持しつつ特殊文字をエスケープできる", () => {
      const input = "\u{1F389}<a>";

      expect(escapeHtmlAttr(input)).toBe("\u{1F389}&lt;a&gt;");
    });

    it("サロゲートペアを含む文字列は文字を保持しつつ特殊文字をエスケープできる", () => {
      // U+29E3D (𩸽) はサロゲートペアでUTF-16上は2コードユニット
      const input = "\u{29E3D}<a>";

      expect(escapeHtmlAttr(input)).toBe("\u{29E3D}&lt;a&gt;");
    });
  });

  describe("リンクスキームの取り扱い", () => {
    /**
     * 設計意図 (本describe共通):
     * parseMarkdown は marked のデフォルトレンダラーで <a href> を出力するのみで、
     * href のスキーム検査・許可リスト適用は行わない。XSS 防御は最終 HTML 表示時に
     * 外部レイヤ (DOMPurify / React の dangerouslySetInnerHTML 前段サニタイズ等) で
     * 行う設計のため、本describe配下のテストは「危険スキームが素通りする」現状動作を
     * 文書化することが目的。
     * TODO(#426): もし parseMarkdown 側に scheme allowlist
     * (http/https/mailto のみ許可など) を導入する場合、各テストは
     * not.toMatch(/href="javascript:/i) のように反転させる。
     */
    it("javascript:プロトコルのリンクはhref属性に原文のまま出力される", () => {
      const result = parseMarkdown(
        wrapBody("[click](javascript:alert(1))"),
        "20240101100000",
      );

      expect(result.content).toContain('href="javascript:alert(1)"');
    });

    it("data:プロトコルのリンクはhref属性にtext/htmlプレフィックス付きで出力される", () => {
      const result = parseMarkdown(
        wrapBody("[click](data:text/html,<script>alert(1)</script>)"),
        "20240101100000",
      );

      expect(result.content).toContain('href="data:text/html,');
    });

    it("vbscript:プロトコルのリンクはhref属性に原文のまま出力される", () => {
      const result = parseMarkdown(
        wrapBody("[click](vbscript:msgbox(1))"),
        "20240101100000",
      );

      expect(result.content).toContain('href="vbscript:msgbox(1)"');
    });

    it("大文字小文字が混在したJaVaScRiPt:スキームもhref属性に原文のまま出力される", () => {
      const result = parseMarkdown(
        wrapBody("[click](JaVaScRiPt:alert(1))"),
        "20240101100000",
      );

      expect(result.content).toContain('href="JaVaScRiPt:alert(1)"');
    });

    it("schemelessなURL //evil.com/foo.pngはsrc属性に原文のまま展開される", () => {
      /**
       * 設計意図: schemeless URL (プロトコル相対) は resolveImagePath の
       * imagesプレフィックス判定にマッチせず、外部URL扱いとして素通りする。
       * 防御は表示レイヤに委ねる。
       */
      const result = parseMarkdown(
        wrapBody("![x](//evil.com/foo.png)"),
        "20240101100000",
      );

      expect(result.content).toContain('src="//evil.com/foo.png"');
    });

    it("HTMLエンティティで難読化された&#x6A;avascript:を含むmarkdownはhref属性にエンティティ復元されずに原文のまま出力される", () => {
      /**
       * 設計意図: marked は href 値の HTML エンティティを自動デコードしないため、
       * &#x6A;avascript: は文字通り原文のまま href 属性値に格納される。
       * HTML 属性として最終的にブラウザが解釈する際は &#x6A; がデコードされて
       * javascript: と等価になる可能性があるため、防御は表示レイヤに委ねる。
       */
      const result = parseMarkdown(
        wrapBody("[click](&#x6A;avascript:alert(1))"),
        "20240101100000",
      );

      expect(result.content).toContain('href="&#x6A;avascript:alert(1)"');
    });

    it("javascript:と:の間にタブを含むスキームはmarkedにaタグとして認識されず原文がパラグラフテキストとして出力される", () => {
      /**
       * 設計意図: marked はリンク構文 [text](url) の url 部にタブを含む場合
       * リンクとしてパースしないため、[text](javascript<TAB>:...) は
       * パラグラフテキストとして出力される。本テストは「現状はタブ挿入経由の
       * XSS は marked のリンク認識ロジックにより無効化される」事実を固定する。
       */
      const result = parseMarkdown(
        wrapBody("[click](javascript\t:alert(1))"),
        "20240101100000",
      );

      expect(result.content).not.toContain("<a ");
    });
  });

  describe("異常入力のgraceful処理", () => {
    it("YAML風の不整合行を含むMarkdownでもparseMarkdownはthrowせずstring contentを返す", () => {
      const body = [
        "---",
        'title: "unclosed string',
        "foo: bar:: { invalid",
        "---",
        "本文の続き",
      ].join("\n");

      expect(() =>
        parseMarkdown(wrapBody(body), "20240101100000"),
      ).not.toThrow();
    });

    it("1000行を超える超大型テーブルでもthrowせずパース結果を返す", () => {
      const rows: string[] = ["| 列1 | 列2 |", "| --- | --- |"];
      for (let i = 0; i < 1000; i++) {
        rows.push(`| ${i} | ${i * 2} |`);
      }

      expect(() =>
        parseMarkdown(wrapBody(rows.join("\n")), "20240101100000"),
      ).not.toThrow();
    });

    it("50階層の深ネストリストでもthrowせずパース結果を返す", () => {
      const lines: string[] = [];
      for (let i = 0; i < 50; i++) {
        lines.push(`${"  ".repeat(i)}- level${i}`);
      }

      expect(() =>
        parseMarkdown(wrapBody(lines.join("\n")), "20240101100000"),
      ).not.toThrow();
    });
  });
});
