import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as markdownModule from "../../lib/markdown";
import { usePosts } from "../usePosts";

// markdown モジュールをモック
vi.mock("../../lib/markdown");

const mockGetAllPosts = vi.mocked(markdownModule.getAllPosts);

// テスト用のモックデータ
const mockPosts = [
  {
    id: "20240102120000",
    title: "2つ目の記事",
    createdAt: "2024-01-02 12:00",
    content: "<p>2つ目の記事の内容です。</p>",
    author: "花子",
    rawContent:
      "# 2つ目の記事\n\n## 投稿日時\n- 2024-01-02 12:00\n\n## 筆者名\n- 花子\n\n## 本文\n2つ目の記事の内容です。",
  },
  {
    id: "20240101100000",
    title: "最初の記事",
    createdAt: "2024-01-01 10:00",
    content: "<p>最初の記事の内容です。</p>",
    author: "太郎",
    rawContent:
      "# 最初の記事\n\n## 投稿日時\n- 2024-01-01 10:00\n\n## 筆者名\n- 太郎\n\n## 本文\n最初の記事の内容です。",
  },
];

describe("usePosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("記事一覧を正しく取得する", async () => {
    mockGetAllPosts.mockResolvedValue(mockPosts);

    const { result } = renderHook(() => usePosts());

    // 初期状態の確認
    expect(result.current.loading).toBe(true);
    expect(result.current.posts).toEqual([]);
    expect(result.current.error).toBe(null);

    // 読み込み完了まで待機
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 最終状態の確認
    expect(result.current.posts).toEqual(mockPosts);
    expect(result.current.error).toBe(null);
    expect(mockGetAllPosts).toHaveBeenCalledTimes(1);
  });

  it("記事一覧が空の場合を正しく処理する", async () => {
    mockGetAllPosts.mockResolvedValue([]);

    const { result } = renderHook(() => usePosts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.posts).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it("エラーが発生した場合を正しく処理する", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorMessage = "ネットワークエラー";
    mockGetAllPosts.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePosts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.posts).toEqual([]);
    expect(result.current.error).toBe(errorMessage);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to load posts:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
