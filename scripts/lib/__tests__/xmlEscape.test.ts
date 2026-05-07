import { describe, expect, it } from "vitest";
import { escapeXml } from "../xmlEscape.ts";

describe("escapeXml", () => {
  it("アンパサンドを最優先で実体参照に変換できる", () => {
    expect(escapeXml("Tom & Jerry")).toBe("Tom &amp; Jerry");
  });

  it("不等号と引用符をすべてエスケープできる", () => {
    expect(escapeXml(`<a href="x">'y'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&apos;y&apos;&lt;/a&gt;",
    );
  });

  it("既にエスケープ済みの文字列を二重エスケープする", () => {
    expect(escapeXml("&amp;")).toBe("&amp;amp;");
  });

  it("空文字列はそのまま返す", () => {
    expect(escapeXml("")).toBe("");
  });
});
