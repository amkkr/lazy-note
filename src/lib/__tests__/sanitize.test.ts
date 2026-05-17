import { describe, expect, it } from "vitest";
import { sanitizePostHtml } from "../sanitize";

describe("sanitizePostHtml", () => {
  describe("既定の XSS パターン除去 (DOMPurify 既存防御)", () => {
    it("scriptタグが除去される", () => {
      const dirty = "<script>alert('xss')</script>";
      const result = sanitizePostHtml(dirty);

      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
    });

    it("imgタグのonerrorイベントハンドラが除去される", () => {
      const dirty = "<img src=x onerror=alert(1)>";
      const result = sanitizePostHtml(dirty);

      expect(result).not.toContain("onerror");
      expect(result).not.toContain("alert");
    });

    it("javascript:URIが除去される", () => {
      const dirty = '<a href="javascript:alert(1)">click</a>';
      const result = sanitizePostHtml(dirty);

      expect(result).not.toContain("javascript:");
    });

    it("SVGタグ内のスクリプトが除去される", () => {
      const dirty = '<svg><script>alert("xss")</script></svg>';
      const result = sanitizePostHtml(dirty);

      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
    });

    it("iframeタグが除去される", () => {
      const dirty = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizePostHtml(dirty);

      expect(result).not.toContain("<iframe");
    });

    it("onloadイベントハンドラが除去される", () => {
      const dirty = '<body onload="alert(1)">';
      const result = sanitizePostHtml(dirty);

      expect(result).not.toContain("onload");
      expect(result).not.toContain("alert");
    });
  });

  describe("安全なHTMLの保持", () => {
    it("pタグが保持される", () => {
      const safe = "<p>テキストです。</p>";
      const result = sanitizePostHtml(safe);

      expect(result).toBe(safe);
    });

    it("httpsリンクを含むaタグが保持される", () => {
      const safe = '<a href="https://example.com">リンク</a>';
      const result = sanitizePostHtml(safe);

      expect(result).toContain('href="https://example.com"');
      expect(result).toContain("リンク");
    });

    it("strongタグが保持される", () => {
      const safe = "<strong>太字テキスト</strong>";
      const result = sanitizePostHtml(safe);

      expect(result).toBe(safe);
    });

    it("ulとliタグが保持される", () => {
      const safe = "<ul><li>項目1</li><li>項目2</li></ul>";
      const result = sanitizePostHtml(safe);

      expect(result).toContain("<ul>");
      expect(result).toContain("<li>項目1</li>");
    });

    it("imgタグのsrcとaltが保持される", () => {
      const safe = '<img src="https://example.com/image.png" alt="説明">';
      const result = sanitizePostHtml(safe);

      expect(result).toContain('src="https://example.com/image.png"');
      expect(result).toContain('alt="説明"');
    });
  });

  describe("本番設定 (ADD_TAGS: button, ADD_ATTR: data-code) 下の許可挙動", () => {
    it("buttonタグが保持される", () => {
      const safe = '<button type="button">クリック</button>';
      const result = sanitizePostHtml(safe);

      expect(result).toContain("<button");
      expect(result).toContain("クリック</button>");
    });

    it("buttonタグのdata-code属性が保持される", () => {
      const safe =
        '<button type="button" class="copy-btn" data-code="const x = 1;">コピー</button>';
      const result = sanitizePostHtml(safe);

      expect(result).toContain("<button");
      expect(result).toContain('data-code="const x = 1;"');
      expect(result).toContain("コピー</button>");
    });

    it("renderer.code が生成するコードブロックラッパー構造が保持される", () => {
      const safe =
        '<div class="code-block-wrapper"><button type="button" class="copy-btn" data-code="echo hi">コピー</button><pre><code class="language-bash">echo hi</code></pre></div>';
      const result = sanitizePostHtml(safe);

      expect(result).toContain('class="code-block-wrapper"');
      expect(result).toContain('class="copy-btn"');
      expect(result).toContain('data-code="echo hi"');
      expect(result).toContain('class="language-bash"');
    });
  });

  describe("本番設定下の XSS パターン除去 (button + data-code 許可下のフルパス検証)", () => {
    it("button タグの onclick 属性が除去される", () => {
      const dirty = '<button onclick="alert(1)">XSS</button>';
      const result = sanitizePostHtml(dirty);

      expect(result).toContain("<button");
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("alert(1)");
    });

    it("button タグの onmouseover 等の他イベントハンドラも除去される", () => {
      const dirty =
        '<button onmouseover="alert(1)" onfocus="alert(2)">XSS</button>';
      const result = sanitizePostHtml(dirty);

      expect(result).toContain("<button");
      expect(result).not.toContain("onmouseover");
      expect(result).not.toContain("onfocus");
      expect(result).not.toContain("alert");
    });

    it("button タグの formaction 属性が除去される", () => {
      const dirty = '<button formaction="javascript:alert(1)">submit</button>';
      const result = sanitizePostHtml(dirty);

      expect(result).toContain("<button");
      expect(result).not.toContain("formaction");
      expect(result).not.toContain("javascript:");
    });

    it("data-code 内に javascript: URI を仕込んでも、data-* は実行 sink ではないため許可属性として残るが、HTML 解釈上は無害である", () => {
      // data-code は単なるカスタムデータ属性のため、属性値内の文字列は実行されない。
      // useCodeBlockCopy は値を clipboard.writeText に渡すのみで、コード実行 sink ではない。
      const dirty = '<button data-code="javascript:alert(1)">click</button>';
      const result = sanitizePostHtml(dirty);

      // data-code は ADD_ATTR で許可されているため保持される
      expect(result).toContain('data-code="javascript:alert(1)"');
      // しかし <script> や onclick のような実行コンテキストは生まれない
      expect(result).not.toContain("<script");
      expect(result).not.toContain("onclick");
    });

    it("data-code 値内に script タグの文字列があっても、属性値はパース時にエスケープ済みで実行されない", () => {
      // marked の renderer.code は escapeHtmlAttr 済みのため、実際の本番経路では
      // &quot; / &lt; 等にエスケープ済の状態で DOMPurify に渡される。
      // ここでは「ユーザが直接書いた <button> + 危険な data-code」を再現。
      const dirty =
        '<button data-code="&quot;><script>alert(1)</script>">click</button>';
      const result = sanitizePostHtml(dirty);

      // DOMPurify を通った後、独立した <script> タグは残らない
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert(1)</script>");
    });

    it("data-code 値内の生クォートブレイクアウト試行は属性値として正規化され、実行コンテキストを生まない", () => {
      // 生のHTML文字列で属性値にダブルクォートを含めようとしたケース。
      // ブラウザのHTMLパーサが属性値の境界を再解釈し、後続は別属性/テキストになる。
      const dirty =
        '<button data-code="\\"><script>alert(1)</script>">click</button>';
      const result = sanitizePostHtml(dirty);

      // <script> はサニタイズ対象なので残らない
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert(1)");
    });

    it("button タグ内に script タグを直接埋め込もうとしても script は除去される", () => {
      const dirty =
        '<button data-code="x">click<script>alert(1)</script></button>';
      const result = sanitizePostHtml(dirty);

      expect(result).toContain("<button");
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert(1)");
    });
  });

  describe("renderer.code 経路を経た本番想定 HTML の挙動 (退行検知)", () => {
    it("escapeHtmlAttr で &quot; に変換された data-code 値は属性値として保持される", () => {
      // renderer.code が生成する形式: " は &quot; にエスケープ済み
      const escaped =
        '<button type="button" class="copy-btn" data-code="alert(&quot;xss&quot;)">コピー</button>';
      const result = sanitizePostHtml(escaped);

      // エスケープ済みの状態が保持される
      expect(result).toContain('data-code="alert(&quot;xss&quot;)"');
      expect(result).not.toContain("<script");
      expect(result).not.toContain("</button><");
    });

    it("escapeHtmlAttr で &lt; / &gt; に変換された data-code 値が script 文字列を含む場合、DOMPurify が data-code 属性ごと除去する (退行検知)", () => {
      // < > も &lt; / &gt; にエスケープ済みの想定。
      // DOMPurify は属性値内の "script" 等を検知すると、その属性自体を除去する。
      // これは本プロジェクトの想定 (XSS 防御) 上は望ましい挙動であり、退行検知として固定する。
      const escaped =
        '<button type="button" class="copy-btn" data-code="&lt;script&gt;alert(1)&lt;/script&gt;">コピー</button>';
      const result = sanitizePostHtml(escaped);

      // button タグ自体は許可されるが、data-code 属性は DOMPurify により除去される
      expect(result).toContain("<button");
      expect(result).not.toContain("data-code=");
      // 当然、生の <script> タグも残らない
      expect(result).not.toContain("<script>alert(1)</script>");
    });
  });
});
