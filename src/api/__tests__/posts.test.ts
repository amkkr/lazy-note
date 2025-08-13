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
  let next: ReturnType<typeof vi.fn>;
  let middleware: ReturnType<typeof createPostsMiddleware>;

  beforeEach(() => {
    req = {
      method: "GET",
    };
    res = {
      setHeader: vi.fn(),
      end: vi.fn(),
      statusCode: 200,
    };
    next = vi.fn();
    middleware = createPostsMiddleware();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("GET リクエストで投稿一覧を返す", () => {
    const mockFiles = ["20250101.md", "20250102.md", "test.txt"];
    vi.mocked(fs.readdirSync).mockReturnValue(mockFiles as unknown as fs.Dirent[]);

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

  it("GET 以外のメソッドで next() を呼ぶ", () => {
    req.method = "POST";

    middleware(req as IncomingMessage, res as ServerResponse, next);

    expect(next).toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it("ディレクトリ読み取りエラー時に 500 エラーを返す", () => {
    vi.mocked(fs.readdirSync).mockImplementation(() => {
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

  it("Markdown ファイルのみをフィルタリングする", () => {
    const mockFiles = ["post.md", "image.png", "data.json", "note.md"];
    vi.mocked(fs.readdirSync).mockReturnValue(mockFiles as unknown as fs.Dirent[]);

    middleware(req as IncomingMessage, res as ServerResponse, next);

    expect(res.end).toHaveBeenCalledWith(JSON.stringify(["post", "note"]));
  });

  it("空のディレクトリの場合、空の配列を返す", () => {
    vi.mocked(fs.readdirSync).mockReturnValue([]);

    middleware(req as IncomingMessage, res as ServerResponse, next);

    expect(res.end).toHaveBeenCalledWith(JSON.stringify([]));
  });
});
