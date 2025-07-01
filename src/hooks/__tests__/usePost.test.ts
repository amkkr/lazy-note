import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePost } from '../usePost';
import * as markdownModule from '../../lib/markdown';

// markdown モジュールをモック
vi.mock('../../lib/markdown');

const mockGetPost = vi.mocked(markdownModule.getPost);

// テスト用のモックデータ
const mockPost = {
  id: '20240101100000',
  title: '最初の記事',
  createdAt: '2024-01-01 10:00',
  content: '<p>最初の記事の内容です。</p>',
  author: '太郎',
  rawContent: '# 最初の記事\n\n## 投稿日時\n- 2024-01-01 10:00\n\n## 筆者名\n- 太郎\n\n## 本文\n最初の記事の内容です。',
};

describe('usePost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('記事詳細を正しく取得する', async () => {
    mockGetPost.mockResolvedValue(mockPost);

    const { result } = renderHook(() => usePost('20240101100000'));

    // 初期状態の確認
    expect(result.current.loading).toBe(true);
    expect(result.current.post).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.notFound).toBe(false);

    // 読み込み完了まで待機
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 最終状態の確認
    expect(result.current.post).toEqual(mockPost);
    expect(result.current.error).toBe(null);
    expect(result.current.notFound).toBe(false);
    expect(mockGetPost).toHaveBeenCalledWith('20240101100000');
  });

  it('timestampがundefinedの場合にnotFoundを設定する', async () => {
    const { result } = renderHook(() => usePost(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.post).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.notFound).toBe(true);
    expect(mockGetPost).not.toHaveBeenCalled();
  });

  it('記事が見つからない場合にnotFoundを設定する', async () => {
    mockGetPost.mockResolvedValue(null);

    const { result } = renderHook(() => usePost('nonexistent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.post).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.notFound).toBe(true);
    expect(mockGetPost).toHaveBeenCalledWith('nonexistent');
  });

  it('エラーが発生した場合を正しく処理する', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorMessage = 'ネットワークエラー';
    mockGetPost.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => usePost('20240101100000'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.post).toBe(null);
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.notFound).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load post:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('timestampが変更された時に再読み込みする', async () => {
    mockGetPost.mockResolvedValue(mockPost);

    const { result, rerender } = renderHook(
      ({ timestamp }) => usePost(timestamp),
      { initialProps: { timestamp: '20240101100000' } }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetPost).toHaveBeenCalledWith('20240101100000');

    // timestampを変更
    rerender({ timestamp: '20240102120000' });

    expect(result.current.loading).toBe(true);
    expect(mockGetPost).toHaveBeenCalledWith('20240102120000');
  });
});