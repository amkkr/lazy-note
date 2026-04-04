import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as markdownModule from "../../lib/markdown";
import { usePosts } from "../usePosts";

// markdown モジュールをモック
vi.mock("../../lib/markdown");

const mockGetAllPostSummaries = vi.mocked(markdownModule.getAllPostSummaries);

// テスト用のモックデータ（PostSummary型）
const mockPosts = [
  {
    id: "20240102120000",
    title: "2つ目の記事",
    createdAt: "2024-01-02 12:00",
    author: "花子",
  },
  {
    id: "20240101100000",
    title: "最初の記事",
    createdAt: "2024-01-01 10:00",
    author: "太郎",
  },
];

describe("usePosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("記事一覧データを取得できる", async () => {
    mockGetAllPostSummaries.mockResolvedValue(mockPosts);

    const { result } = renderHook(() => usePosts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.posts).toEqual(mockPosts);
    expect(mockGetAllPostSummaries).toHaveBeenCalledTimes(1);
  });

  it("取得完了後にローディングが解除される", async () => {
    mockGetAllPostSummaries.mockResolvedValue(mockPosts);

    const { result } = renderHook(() => usePosts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(null);
  });

  it("記事一覧が空の場合に空配列を返す", async () => {
    mockGetAllPostSummaries.mockResolvedValue([]);

    const { result } = renderHook(() => usePosts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.posts).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it("エラー発生時にエラーメッセージが設定される", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorMessage = "ネットワークエラー";
    mockGetAllPostSummaries.mockRejectedValue(new Error(errorMessage));

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
