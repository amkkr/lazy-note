import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDatasourcesMiddleware } from "../datasources";
import type { IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import path from "path";

// fsモジュールをモック
vi.mock("fs");

describe("createDatasourcesMiddleware", () => {
  let req: Partial<IncomingMessage>;
  let res: Partial<ServerResponse>;
  let next: ReturnType<typeof vi.fn>;
  let middleware: ReturnType<typeof createDatasourcesMiddleware>;

  beforeEach(() => {
    req = {
      url: "/20250101.md",
    };
    res = {
      setHeader: vi.fn(),
      end: vi.fn(),
      statusCode: 200,
    };
    next = vi.fn();
    middleware = createDatasourcesMiddleware();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ファイルの内容を返す", () => {
    const mockContent = "# Test Post\n\nThis is a test content.";
    vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

    middleware(req as IncomingMessage, res as ServerResponse, next);

    expect(fs.readFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "datasources", "/20250101.md"),
      "utf8"
    );
    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/plain");
    expect(res.end).toHaveBeenCalledWith(mockContent);
  });

  it("URL が undefined の場合、400 エラーを返す", () => {
    req.url = undefined;

    middleware(req as IncomingMessage, res as ServerResponse, next);

    expect(res.statusCode).toBe(400);
    expect(res.end).toHaveBeenCalledWith("Bad request");
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  it("ファイルが存在しない場合、404 エラーを返す", () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("File not found");
    });

    middleware(req as IncomingMessage, res as ServerResponse, next);

    expect(res.statusCode).toBe(404);
    expect(res.end).toHaveBeenCalledWith("File not found");
  });

  it("複数階層のパスを正しく処理する", () => {
    req.url = "/subfolder/test.md";
    const mockContent = "Content from subfolder";
    vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

    middleware(req as IncomingMessage, res as ServerResponse, next);

    expect(fs.readFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "datasources", "/subfolder/test.md"),
      "utf8"
    );
    expect(res.end).toHaveBeenCalledWith(mockContent);
  });

  it("空のファイルを正しく処理する", () => {
    vi.mocked(fs.readFileSync).mockReturnValue("");

    middleware(req as IncomingMessage, res as ServerResponse, next);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/plain");
    expect(res.end).toHaveBeenCalledWith("");
  });

  it("日本語を含むファイルを正しく処理する", () => {
    const mockContent = "# テスト投稿\n\nこれはテストコンテンツです。";
    vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

    middleware(req as IncomingMessage, res as ServerResponse, next);

    expect(res.end).toHaveBeenCalledWith(mockContent);
  });
});