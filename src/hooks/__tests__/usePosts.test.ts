import { act, renderHook, waitFor } from "@testing-library/react";
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
    excerpt: "2つ目の記事の内容です。",
    readingTimeMinutes: 1,
  },
  {
    id: "20240101100000",
    title: "最初の記事",
    createdAt: "2024-01-01 10:00",
    author: "太郎",
    excerpt: "最初の記事の内容です。",
    readingTimeMinutes: 1,
  },
];

describe("usePosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("フック呼び出し直後にローディング状態になる", () => {
    mockGetAllPostSummaries.mockResolvedValue(mockPosts);

    const { result } = renderHook(() => usePosts());

    expect(result.current.loading).toBe(true);
    expect(result.current.posts).toEqual([]);
    expect(result.current.error).toBe(null);
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

  it("unmount後に解決したリクエストでReactの警告を発生させない", async () => {
    // unmount 後の setState で React が出す警告を検知する
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // 手動で resolve できる遅延 Promise
    let resolveLoad: ((value: typeof mockPosts) => void) | undefined;
    const loadPromise = new Promise<typeof mockPosts>((resolve) => {
      resolveLoad = resolve;
    });
    mockGetAllPostSummaries.mockReturnValueOnce(loadPromise);

    const { unmount } = renderHook(() => usePosts());

    // 解決前にアンマウント
    unmount();

    // アンマウント後に Promise を解決
    await act(async () => {
      resolveLoad?.(mockPosts);
      await loadPromise;
    });

    // unmount 後の setState に対する React 警告が出ていないこと
    const reactStateWarnings = consoleErrorSpy.mock.calls.filter((call) => {
      const message = String(call[0] ?? "");
      return (
        message.includes("unmounted") ||
        message.includes("memory leak") ||
        message.includes("Can't perform a React state update")
      );
    });
    expect(reactStateWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });
});
