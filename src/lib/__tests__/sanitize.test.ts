import DOMPurify from "dompurify";
import { describe, expect, it } from "vitest";

describe("DOMPurify.sanitize", () => {
  describe("XSSパターンの除去", () => {
    it("scriptタグが除去される", () => {
      const dirty = "<script>alert('xss')</script>";
      const result = DOMPurify.sanitize(dirty);

      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
    });

    it("imgタグのonerrorイベントハンドラが除去される", () => {
      const dirty = "<img src=x onerror=alert(1)>";
      const result = DOMPurify.sanitize(dirty);

      expect(result).not.toContain("onerror");
      expect(result).not.toContain("alert");
    });

    it("javascript:URIが除去される", () => {
      const dirty = '<a href="javascript:alert(1)">click</a>';
      const result = DOMPurify.sanitize(dirty);

      expect(result).not.toContain("javascript:");
    });

    it("SVGタグ内のスクリプトが除去される", () => {
      const dirty = '<svg><script>alert("xss")</script></svg>';
      const result = DOMPurify.sanitize(dirty);

      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
    });

    it("iframeタグが除去される", () => {
      const dirty = '<iframe src="https://evil.com"></iframe>';
      const result = DOMPurify.sanitize(dirty);

      expect(result).not.toContain("<iframe");
    });

    it("onloadイベントハンドラが除去される", () => {
      const dirty = '<body onload="alert(1)">';
      const result = DOMPurify.sanitize(dirty);

      expect(result).not.toContain("onload");
      expect(result).not.toContain("alert");
    });
  });

  describe("安全なHTMLの保持", () => {
    it("pタグが保持される", () => {
      const safe = "<p>テキストです。</p>";
      const result = DOMPurify.sanitize(safe);

      expect(result).toBe(safe);
    });

    it("httpsリンクを含むaタグが保持される", () => {
      const safe = '<a href="https://example.com">リンク</a>';
      const result = DOMPurify.sanitize(safe);

      expect(result).toContain('href="https://example.com"');
      expect(result).toContain("リンク");
    });

    it("strongタグが保持される", () => {
      const safe = "<strong>太字テキスト</strong>";
      const result = DOMPurify.sanitize(safe);

      expect(result).toBe(safe);
    });

    it("ulとliタグが保持される", () => {
      const safe = "<ul><li>項目1</li><li>項目2</li></ul>";
      const result = DOMPurify.sanitize(safe);

      expect(result).toContain("<ul>");
      expect(result).toContain("<li>項目1</li>");
    });

    it("imgタグのsrcとaltが保持される", () => {
      const safe = '<img src="https://example.com/image.png" alt="説明">';
      const result = DOMPurify.sanitize(safe);

      expect(result).toContain('src="https://example.com/image.png"');
      expect(result).toContain('alt="説明"');
    });
  });
});
