import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as markdownModule from "../../lib/markdown";
import { findAdjacentPosts, useAdjacentPosts } from "../useAdjacentPosts";

vi.mock("../../lib/markdown");

const mockGetAllPostSummaries = vi.mocked(markdownModule.getAllPostSummaries);

const mockSummaries = [
  {
    id: "20240103100000",
    title: "3番目の記事",
    createdAt: "2024-01-03 10:00",
    author: "太郎",
    excerpt: "3番目の記事の抜粋",
    readingTimeMinutes: 2,
  },
  {
    id: "20240102100000",
    title: "2番目の記事",
    createdAt: "2024-01-02 10:00",
    author: "太郎",
    excerpt: "2番目の記事の抜粋",
    readingTimeMinutes: 3,
  },
  {
    id: "20240101100000",
    title: "1番目の記事",
    createdAt: "2024-01-01 10:00",
    author: "太郎",
    excerpt: "1番目の記事の抜粋",
    readingTimeMinutes: 1,
  },
];

describe("findAdjacentPosts", () => {
  it("中間の記事で前後の記事を取得できる", () => {
    const result = findAdjacentPosts(mockSummaries, "20240102100000");

    expect(result.olderPost).toEqual(mockSummaries[2]);
    expect(result.newerPost).toEqual(mockSummaries[0]);
  });

  it("先頭（最新）の記事でnewerPostがnullになる", () => {
    const result = findAdjacentPosts(mockSummaries, "20240103100000");

    expect(result.newerPost).toBeNull();
    expect(result.olderPost).toEqual(mockSummaries[1]);
  });

  it("末尾（最古）の記事でolderPostがnullになる", () => {
    const result = findAdjacentPosts(mockSummaries, "20240101100000");

    expect(result.olderPost).toBeNull();
    expect(result.newerPost).toEqual(mockSummaries[1]);
  });

  it("記事が1つだけの場合は両方nullになる", () => {
    const result = findAdjacentPosts([mockSummaries[0]], "20240103100000");

    expect(result.olderPost).toBeNull();
    expect(result.newerPost).toBeNull();
  });

  it("存在しないIDの場合は両方nullになる", () => {
    const result = findAdjacentPosts(mockSummaries, "99999999999999");

    expect(result.olderPost).toBeNull();
    expect(result.newerPost).toBeNull();
  });
});

describe("useAdjacentPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("中間の記事で前後の記事が取得できる", async () => {
    mockGetAllPostSummaries.mockResolvedValue(mockSummaries);

    const { result } = renderHook(() => useAdjacentPosts("20240102100000"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.olderPost).toEqual(mockSummaries[2]);
    expect(result.current.newerPost).toEqual(mockSummaries[0]);
  });

  it("先頭の記事でnewerPostがnullになる", async () => {
    mockGetAllPostSummaries.mockResolvedValue(mockSummaries);

    const { result } = renderHook(() => useAdjacentPosts("20240103100000"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.newerPost).toBeNull();
    expect(result.current.olderPost).toEqual(mockSummaries[1]);
  });

  it("末尾の記事でolderPostがnullになる", async () => {
    mockGetAllPostSummaries.mockResolvedValue(mockSummaries);

    const { result } = renderHook(() => useAdjacentPosts("20240101100000"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.olderPost).toBeNull();
    expect(result.current.newerPost).toEqual(mockSummaries[1]);
  });

  it("IDがundefinedの場合は読み込みのみ終了する", async () => {
    const { result } = renderHook(() => useAdjacentPosts(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.olderPost).toBeNull();
    expect(result.current.newerPost).toBeNull();
    expect(mockGetAllPostSummaries).not.toHaveBeenCalled();
  });

  it("同じcurrentIdで2回マウントするとgetAllPostSummariesが2回呼ばれる", async () => {
    mockGetAllPostSummaries.mockResolvedValue(mockSummaries);

    const { result: firstResult } = renderHook(() =>
      useAdjacentPosts("20240102100000"),
    );

    await waitFor(() => {
      expect(firstResult.current.loading).toBe(false);
    });

    const { result: secondResult } = renderHook(() =>
      useAdjacentPosts("20240102100000"),
    );

    await waitFor(() => {
      expect(secondResult.current.loading).toBe(false);
    });

    expect(mockGetAllPostSummaries).toHaveBeenCalledTimes(2);
  });

  it("currentId切替時に古いリクエストの結果は新しいstateに反映されない", async () => {
    // 1回目のリクエストは手動でresolveできる遅延Promise
    let resolveFirst: ((value: typeof mockSummaries) => void) | undefined;
    const firstPromise = new Promise<typeof mockSummaries>((resolve) => {
      resolveFirst = resolve;
    });

    // 2回目のリクエストは即座にresolve
    mockGetAllPostSummaries
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce(mockSummaries);

    const { result, rerender } = renderHook(
      ({ currentId }: { currentId: string }) => useAdjacentPosts(currentId),
      { initialProps: { currentId: "20240102100000" } },
    );

    // currentIdを切り替えると2回目のリクエストが発火する
    rerender({ currentId: "20240101100000" });

    // 2回目のリクエストが完了するまで待つ（末尾の記事のためolderPostはnull、newerPostは2番目）
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.olderPost).toBeNull();
    expect(result.current.newerPost).toEqual(mockSummaries[1]);

    // 後から1回目のリクエストをresolveしても、新しいstateを上書きしない
    await act(async () => {
      resolveFirst?.(mockSummaries);
      await firstPromise;
    });

    expect(result.current.olderPost).toBeNull();
    expect(result.current.newerPost).toEqual(mockSummaries[1]);
  });
});
