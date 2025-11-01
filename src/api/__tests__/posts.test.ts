import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPostsMiddleware } from "../posts";

// fsモジュールをモック
vi.mock("fs");

describe("createPostsMiddleware", () => {
  let req: Partial<IncomingMessage>;
  let res: Partial<ServerResponse>;
  const next = vi.fn();
  let middleware: ReturnType<typeof createPostsMiddleware>;

  beforeEach(() => {
    req = {
      method: "GET",
      url: "",
    };
    res = {
      setHeader: vi.fn(),
      end: vi.fn(),
      statusCode: 200,
    };
    middleware = createPostsMiddleware();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("投稿一覧の取得", () => {
    it("GET /api/posts で投稿一覧を返す", () => {
      const mockFiles = ["20250101.md", "20250102.md", "test.txt"];
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      vi.spyOn(fs, "readdirSync").mockReturnValue(mockFiles as any);

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(fs.readdirSync).toHaveBeenCalledWith(
        path.join(process.cwd(), "datasources"),
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/json",
      );
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify(["20250101", "20250102"]),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("Markdown ファイルのみをフィルタリングする", () => {
      const mockFiles = ["post.md", "image.png", "data.json", "note.md"];
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      vi.spyOn(fs, "readdirSync").mockReturnValue(mockFiles as any);

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(res.end).toHaveBeenCalledWith(JSON.stringify(["post", "note"]));
    });

    it("空のディレクトリの場合、空の配列を返す", () => {
      vi.spyOn(fs, "readdirSync").mockReturnValue([]);

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(res.end).toHaveBeenCalledWith(JSON.stringify([]));
    });

    it("ディレクトリ読み取りエラー時に 500 エラーを返す", () => {
      vi.spyOn(fs, "readdirSync").mockImplementation(() => {
        throw new Error("Directory not found");
      });

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(res.statusCode).toBe(500);
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({
          error: "Failed to read datasources directory",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("個別投稿の取得", () => {
    it("GET /api/posts/:id で個別投稿を返す", () => {
      req.url = "/20250101";
      const mockContent = "# Test Post\n\nThis is a test content.";
      vi.spyOn(fs, "readFileSync").mockReturnValue(mockContent);

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), "datasources", "20250101.md"),
        "utf8",
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/plain; charset=utf-8",
      );
      expect(res.end).toHaveBeenCalledWith(mockContent);
    });

    it(".md 拡張子付きのURLでも正しく処理する", () => {
      req.url = "/20250101.md";
      const mockContent = "# Test Post";
      vi.spyOn(fs, "readFileSync").mockReturnValue(mockContent);

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(fs.readFileSync).toHaveBeenCalledWith(
        path.join(process.cwd(), "datasources", "20250101.md"),
        "utf8",
      );
      expect(res.end).toHaveBeenCalledWith(mockContent);
    });

    it("投稿が存在しない場合、404 エラーを返す", () => {
      req.url = "/nonexistent";
      vi.spyOn(fs, "readFileSync").mockImplementation(() => {
        throw new Error("File not found");
      });

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(res.statusCode).toBe(404);
      expect(res.end).toHaveBeenCalledWith("Post not found");
    });

    it("日本語を含む投稿を正しく処理する", () => {
      req.url = "/20250101";
      const mockContent = "# テスト投稿\n\nこれはテストコンテンツです。";
      vi.spyOn(fs, "readFileSync").mockReturnValue(mockContent);

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(res.end).toHaveBeenCalledWith(mockContent);
    });

    it("空のファイルを正しく処理する", () => {
      req.url = "/20250101";
      vi.spyOn(fs, "readFileSync").mockReturnValue("");

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/plain; charset=utf-8",
      );
      expect(res.end).toHaveBeenCalledWith("");
    });
  });

  describe("HTTPメソッドの処理", () => {
    it("GET 以外のメソッドで next() を呼ぶ", () => {
      req.method = "POST";

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(next).toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    it("PUT メソッドで next() を呼ぶ", () => {
      req.method = "PUT";

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(next).toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    it("DELETE メソッドで next() を呼ぶ", () => {
      req.method = "DELETE";

      middleware(req as IncomingMessage, res as ServerResponse, next);

      expect(next).toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });
  });
});
