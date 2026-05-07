import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as markdownModule from "../../lib/markdown";
import { useAdjacentPosts } from "../useAdjacentPosts";

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

describe("useAdjacentPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("中間の記事で前後の記事が取得できる", async () => {
    mockGetAllPostSummaries.mockResolvedValue(mockSummaries);

    const { result } = renderHook(() =>
      useAdjacentPosts("20240102100000"),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prevPost).toEqual(mockSummaries[0]);
    expect(result.current.nextPost).toEqual(mockSummaries[2]);
  });

  it("先頭の記事で前の記事がnullになる", async () => {
    mockGetAllPostSummaries.mockResolvedValue(mockSummaries);

    const { result } = renderHook(() =>
      useAdjacentPosts("20240103100000"),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prevPost).toBeNull();
    expect(result.current.nextPost).toEqual(mockSummaries[1]);
  });

  it("末尾の記事で次の記事がnullになる", async () => {
    mockGetAllPostSummaries.mockResolvedValue(mockSummaries);

    const { result } = renderHook(() =>
      useAdjacentPosts("20240101100000"),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prevPost).toEqual(mockSummaries[1]);
    expect(result.current.nextPost).toBeNull();
  });

  it("記事が1つだけの場合は前後ともnullになる", async () => {
    mockGetAllPostSummaries.mockResolvedValue([mockSummaries[0]]);

    const { result } = renderHook(() =>
      useAdjacentPosts("20240103100000"),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prevPost).toBeNull();
    expect(result.current.nextPost).toBeNull();
  });

  it("存在しないIDの場合は前後ともnullになる", async () => {
    mockGetAllPostSummaries.mockResolvedValue(mockSummaries);

    const { result } = renderHook(() =>
      useAdjacentPosts("99999999999999"),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prevPost).toBeNull();
    expect(result.current.nextPost).toBeNull();
  });

  it("IDがundefinedの場合は読み込みのみ終了する", async () => {
    const { result } = renderHook(() => useAdjacentPosts(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.prevPost).toBeNull();
    expect(result.current.nextPost).toBeNull();
    expect(mockGetAllPostSummaries).not.toHaveBeenCalled();
  });
});
